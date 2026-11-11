# Database e migrazioni — Regole

> **Revisione doc:** 2026-10

## Principio
Lo schema cambia in passi piccoli, versionati e reversibili, e ogni passo è compatibile con il codice che c'era prima e con quello che arriva dopo. La pipeline esegue la migrazione prima del codice, ma un rollback o un rilascio graduale fanno girare insieme versioni diverse: per questo ogni passo regge sia il codice vecchio sia quello nuovo.

## Regole
- **Migrazioni versionate nel repository**, una per cambiamento, piccole e con un nome che dice cosa fanno. Una migrazione già applicata altrove non si modifica: se ne scrive una nuova.
- **Reversibili**: ogni migrazione ha il suo `down`, oppure un piano di rollback scritto accanto. Se il ritorno perde dati (colonna eliminata), lo dice e si fa prima una copia.
- **Expand-contract** per rinominare, cambiare tipo o togliere una colonna: mai in un passo solo. Prima si aggiunge il nuovo (expand), il codice scrive in tutti e due e si riempie il nuovo, poi si legge dal nuovo, infine si toglie il vecchio (contract) in un rilascio successivo.
- **Colonna NOT NULL su tabella grande**: prima nullable (o con un default che non riscrive la tabella), backfill, poi il vincolo.
- **Indici senza bloccare**: `CREATE INDEX CONCURRENTLY` su PostgreSQL (fuori da una transazione: con EF Core `suppressTransaction: true`, in una migrazione a parte), `ONLINE = ON` su SQL Server nelle edizioni che lo ammettono (per esempio Enterprise). Gli stessi accorgimenti per vincoli e chiavi esterne (aggiunti come non validati e poi validati).
- **Backfill a lotti**: a blocchi di dimensione limitata, fuori dalla migrazione di schema, idempotente e ripartibile (si può fermare e riprendere), con una pausa fra un lotto e l'altro.
- **Timeout sulle migrazioni**: `lock_timeout` e `statement_timeout` (o l'equivalente del motore), perché una migrazione che aspetta un blocco non fermi l'applicazione. Se scade, si riprova, non si forza.
- **Prova su una copia dei dati** (forma e volume di produzione) prima di eseguire in produzione; si misura il tempo e si guardano i blocchi.
- **Compatibile con il codice vecchio e con quello nuovo**: il codice vecchio gira sullo schema nuovo (la migrazione arriva per prima, e un rollback del codice la lascia dov'è); il codice nuovo non si affida a un contract non ancora fatto. Ordine fisso: expand, poi il codice, poi il contract in un rilascio successivo.
- **Una migrazione in produzione non si lancia a mano**: passa dalla pipeline, come passo a parte, e prima del codice che la richiede (`.claude/consoleclaude/stacks/ci-cd.md` (se presente)). Per un'app desktop con database locale non c'è pipeline: vale la riga Electron + Prisma della tabella.
- Dati e schema separati: una migrazione di schema non contiene trasformazioni lunghe sui dati.

## Per stack
| Stack | Strumento | Nota |
|-------|-----------|------|
| .NET | EF Core migrations | `dotnet ef migrations script` per rivedere l'SQL; un passo per rilascio |
| FastAPI | Alembic | `upgrade`/`downgrade`; autogenerate da rivedere a mano |
| Spring | Flyway o Liquibase | versioni a numero crescente, mai modificate dopo l'applicazione |
| Node/NestJS | migrazioni del proprio ORM | stesse regole, SQL rivisto |
| Prisma | `prisma migrate dev` / `deploy` | per Prisma valgono le regole dello stack che lo usa (Prisma 7: client senza motore, driver adapter, `prisma.config.ts`); expand-contract con migrazione scritta a mano |
| Electron + Prisma (SQLite) | migrazioni all'avvio, dal processo principale | il file è sul PC dell'utente: prima di migrare se ne fa una copia (con la versione dello schema nel nome); se la migrazione fallisce si ripristina la copia e lo si dice all'utente. Niente `migrate dev` né `reset` sui dati veri; migrazioni compatibili in avanti, perché un'app più vecchia potrebbe aprire lo stesso file |

## Reference → `.claude/consoleclaude/stacks/database-reference.md`
