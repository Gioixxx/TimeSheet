# /onboard — Onboarding Progetto

Orientamento completo per chi arriva su un progetto nuovo o dopo una lunga assenza.
Più approfondito di `/context`: legge tutto il contesto, esplora la struttura e produce una guida di orientamento.

## Istruzioni

1. Leggi `@.claude/memory/MEMORY.md`
2. Leggi `@.claude/memory/decisions.md`
3. Leggi `@.claude/memory/adr.md` (se esiste)
4. Leggi `@.claude/memory/domain.md`
5. Leggi `@.claude/memory/conventions.md`
6. Leggi `@.claude/memory/sprint.md`
7. Leggi `@.claude/memory/backlog.md` (se esiste)
8. Leggi `@.claude/memory/tech-debt.md` (se esiste)
9. Esegui `git log --oneline -20` per l'attività recente
10. Esegui `git branch -a` per i branch attivi
11. Esegui `git log --oneline --since="30 days ago" --author-date-order | tail -1` per vedere da quanto tempo è attivo il progetto
12. Cerca il file di dipendenze principale ed elenca le dipendenze core:
    - `package.json` → `cat package.json | grep -A 30 '"dependencies"'`
    - `*.csproj` → cerca PackageReference
    - `pom.xml` → cerca `<dependency>`
    - `pyproject.toml` o `requirements.txt`

## Output atteso

Produce una guida di orientamento strutturata:

---

**Benvenuto su [nome progetto]**

**Stack:** [tecnologie principali]
**Attivo da:** [data primo commit rilevante]
**Ultimo aggiornamento memoria:** [data da MEMORY.md]

---

**Cos'è questo progetto**
[2-4 frasi che spiegano il dominio, lo scopo e gli utenti finali — da domain.md e MEMORY.md]

**Architettura in breve**
[pattern architetturali principali estratti da decisions.md e adr.md — max 5 punti]

**Dipendenze core**
[lista delle dipendenze più importanti con il loro ruolo — es. "EF Core — ORM per PostgreSQL"]

**Vocabolario del dominio**
[5-10 termini chiave da domain.md con definizione in una riga]

**Convenzioni da rispettare subito**
[le 3-5 convenzioni più importanti da conventions.md che un nuovo sviluppatore deve conoscere prima di toccare codice]

**Dove siamo**
Sprint corrente: [nome] — scade [data]
In corso: [task aperti]
Tech debt urgente: [item ad alta priorità se presente]
Branch attivi non su main: [lista]

**Decisioni critiche già prese**
[3-5 decisioni architetturali da decisions.md / adr.md che spiegano perché il codice è fatto così]

**Da dove iniziare**
[1-3 suggerimenti concreti su da dove partire — es. "Leggi prima X, poi guarda Y, il punto di ingresso è Z"]

---

## Regole

- Sintetizza — l'onboarding deve essere leggibile in 5-10 minuti, non in un'ora
- Dai priorità alle informazioni che un nuovo sviluppatore potrebbe sbagliare o fraintendere senza questa guida
- Se la memoria è vuota o incompleta, segnalalo chiaramente e suggerisci di eseguire `/remember` per popolarla
- Non modificare nessun file — solo lettura e output
- Se mancano file di memoria critici (domain.md, decisions.md), adatta l'output con quello che è disponibile
