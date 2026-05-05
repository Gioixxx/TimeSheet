# /remember — Salva in Memoria Progetto

Salva un'informazione nella memoria persistente del progetto corrente.

## Istruzioni

L'utente fornirà qualcosa da ricordare (una decisione, una regola, un termine, un task).

1. Classifica automaticamente il tipo di informazione:
   - **decisione** — scelta tecnica o architetturale con motivazione
   - **dominio** — termine business, entità, regola di business
   - **sprint** — task in corso, obiettivo, deadline
   - **convenzione** — pattern locale specifico del progetto

2. Leggi il file corrispondente in `.claude/memory/`:
   - `decisions.md` → per decisioni
   - `domain.md` → per dominio
   - `sprint.md` → per sprint
   - `conventions.md` → per convenzioni

3. Aggiungi l'informazione nel file in modo strutturato

4. Aggiorna `MEMORY.md` se l'informazione è abbastanza rilevante da stare nell'indice

## Formato per ogni tipo

**Decisione:**
```markdown
### [Titolo breve]
**Data:** YYYY-MM-DD
**Decisione:** [cosa si è scelto]
**Perché:** [motivazione — vincoli, trade-off, requisiti]
**Alternative scartate:** [cosa si è valutato e perché no]
```

**Dominio:**
```markdown
### [Termine o entità]
[Definizione precisa nel contesto del progetto]
**Regole:** [vincoli o comportamenti specifici]
```

**Sprint:**
```markdown
### Sprint [numero o nome] — [data fine]
**Obiettivo:** [cosa dobbiamo consegnare]
**In corso:**
- [ ] [task 1]
- [ ] [task 2]
**Completati:**
- [x] [task completato]
```

**Convenzione:**
```markdown
### [Nome convenzione]
[Descrizione della regola locale]
**Esempio:**
\`\`\`
[codice o pattern]
\`\`\`
**Perché diverge dalle libs globali:** [motivazione]
```

## Regole

- Se il file di destinazione non esiste, crealo con intestazione appropriata
- Non duplicare informazioni già presenti — aggiorna l'esistente se già c'è
- Conferma all'utente cosa è stato salvato e dove
- Se non sei sicuro della classificazione, chiedi all'utente
