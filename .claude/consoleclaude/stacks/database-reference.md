# Database e migrazioni (Reference)

> **Revisione doc:** 2026-10

> Contiene un esempio completo di expand-contract in SQL per PostgreSQL, il backfill a lotti, come si scrive la stessa sequenza con EF Core, Alembic e Prisma, e la checklist prima di eseguire una migrazione. Le regole brevi stanno nel modulo base.

## Expand-contract: rinominare una colonna

Caso: la colonna `utenti.nome_completo` diventa `utenti.nome`. In un passo solo (`ALTER TABLE ... RENAME COLUMN`) il codice in produzione che usa il vecchio nome si rompe fino al deploy. In cinque passi, in rilasci separati:

| Passo | Schema | Codice |
|---|---|---|
| 1. Expand | aggiunge `nome` (nullable) | invariato: usa `nome_completo` |
| 2. Doppia scrittura | invariato | scrive in `nome_completo` e in `nome`; legge `nome_completo` |
| 3. Backfill | riempie `nome` per le righe vecchie, a lotti | invariato |
| 4. Lettura dal nuovo | vincolo `NOT NULL` su `nome`, aggiunto senza bloccare | legge `nome`, scrive ancora in tutte e due |
| 5. Contract | toglie `nome_completo` (dopo una copia) | non lo usa più |

Il ritorno è semplice finché non si arriva al passo 5: basta rimettere il codice precedente. Il passo 5 si fa solo dopo che il passo 4 è stato in produzione abbastanza da fidarsi.

### SQL per PostgreSQL

```sql
-- Passo 1 (migrazione di schema, veloce)
SET lock_timeout = '3s';
SET statement_timeout = '30s';
ALTER TABLE utenti ADD COLUMN nome text;

-- Passo 3: backfill a lotti (vedi sotto), fuori dalla migrazione di schema

-- Passo 4 (quando il backfill è finito): il vincolo, senza bloccare la tabella
ALTER TABLE utenti ADD CONSTRAINT utenti_nome_non_nullo CHECK (nome IS NOT NULL) NOT VALID;
ALTER TABLE utenti VALIDATE CONSTRAINT utenti_nome_non_nullo;

-- Passo 5 (rilascio successivo, dopo una copia dei dati)
ALTER TABLE utenti DROP COLUMN nome_completo;
```

`NOT VALID` aggiunge il vincolo senza controllare le righe vecchie (e quindi senza bloccare a lungo); `VALIDATE` le controlla con un blocco più leggero.

### Un indice senza bloccare la tabella

```sql
-- PostgreSQL: fuori da una transazione
CREATE INDEX CONCURRENTLY idx_utenti_nome ON utenti (nome);

-- SQL Server
CREATE INDEX idx_utenti_nome ON utenti (nome) WITH (ONLINE = ON);
```

Con `CONCURRENTLY` una creazione fallita lascia un indice non valido: si controlla e si rifà.

## Backfill a lotti

Idempotente (si può rilanciare), ripartibile (riprende da dove era) e con una pausa fra un lotto e l'altro.

```sql
-- Un lotto: si ripete finché non aggiorna 0 righe
UPDATE utenti
SET nome = nome_completo
WHERE id IN (
  SELECT id FROM utenti
  WHERE nome IS NULL
  ORDER BY id
  LIMIT 5000
  FOR UPDATE SKIP LOCKED
);
```

```python
import time

def backfill(conn, pausa=0.2):
    while True:
        with conn.transaction():
            n = conn.execute(LOTTO).rowcount   # l'UPDATE qui sopra
        if n == 0:
            return
        time.sleep(pausa)                       # lascia respirare il database
```

Regole del backfill:
- la condizione (`nome IS NULL`) è il segno di ciò che manca: dopo un'interruzione si rilancia e riprende;
- una transazione per lotto, mai una sola enorme;
- si osserva il ritardo di replica e il carico: se salgono, si aumenta la pausa;
- si registra quante righe restano, per sapere quando il passo 4 può partire.

## Lo stesso schema con gli strumenti

### EF Core (due rilasci)
- Rilascio A: la migrazione aggiunge la colonna nuova; il codice scrive in tutte e due. `dotnet ef migrations add AggiungiNome`, poi `dotnet ef migrations script --idempotent` e si rilegge l'SQL.
- Backfill: un comando a parte (job o strumento da riga di comando), non dentro `Up()`.
- Rilascio B: il codice legge dalla colonna nuova; una seconda migrazione toglie la vecchia. `Down()` la ricrea, ma senza i dati: lo si scrive nel piano di rollback.
- Per l'indice senza blocco su PostgreSQL: `migrationBuilder.Sql("CREATE INDEX CONCURRENTLY ...", suppressTransaction: true)` in una migrazione che non fa altro (EF avvolge `Up()` in una transazione e PostgreSQL rifiuta `CONCURRENTLY` dentro una transazione); in alternativa l'annotazione `IsCreatedConcurrently()` del provider Npgsql per la creazione (la `DROP` va ancora scritta a mano). Se la creazione fallisce resta un indice non valido, che si toglie prima di riprovare. `ONLINE = ON` su SQL Server vale solo nelle edizioni che lo ammettono (per esempio Enterprise).

### Alembic (FastAPI)
```python
def upgrade():
    op.add_column("utenti", sa.Column("nome", sa.Text(), nullable=True))

def downgrade():
    op.drop_column("utenti", "nome")
```
- `alembic revision -m "aggiungi nome"`, poi si rivede il file: l'autogenerazione non conosce expand-contract.
- L'indice concorrente richiede `with op.get_context().autocommit_block():` e `postgresql_concurrently=True`.
- `alembic upgrade head` come passo della pipeline; `alembic downgrade -1` nel piano di rollback.

### Prisma
Valgono le regole dello stack che lo usa (Prisma 7).
- In sviluppo `prisma migrate dev --name <descrizione>` crea e applica la migrazione; in produzione solo `prisma migrate deploy`, come passo della pipeline.
- Per expand-contract la migrazione generata si ferma a quello che Prisma sa fare: la si modifica a mano, o si crea con `--create-only`, aggiungendo l'SQL per il backfill o l'indice concorrente, e poi si applica.
- Una colonna rinominata nello schema Prisma diventa per default «toglie e ricrea»: da correggere a mano prima di applicare, altrimenti si perdono i dati.
- Dopo la migrazione si rigenera il client (`prisma generate`).

## Checklist prima di eseguire una migrazione
- [ ] Il passo è piccolo e ha un nome chiaro; non modifica una migrazione già applicata.
- [ ] Ha un `down` o un piano di rollback scritto.
- [ ] Se rimuove o rinomina, è in expand-contract e il codice attuale gira sullo schema nuovo.
- [ ] `lock_timeout` e `statement_timeout` impostati.
- [ ] Indici e vincoli aggiunti senza bloccare (`CONCURRENTLY` fuori da una transazione, `ONLINE = ON` dove l'edizione lo ammette, `NOT VALID` poi `VALIDATE`).
- [ ] Il backfill è un passo a parte, a lotti, idempotente e ripartibile.
- [ ] Provata su una copia dei dati con volume reale; tempi e blocchi misurati.
- [ ] Una copia recente dei dati esiste prima di un passo distruttivo.
- [ ] Passa dalla pipeline, prima del codice che la richiede.
- [ ] Qualcuno guarda il carico mentre gira.
