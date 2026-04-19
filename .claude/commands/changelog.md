# /changelog — Genera CHANGELOG

Genera una bozza di sezione CHANGELOG dai commit git, formattata secondo [Keep a Changelog](https://keepachangelog.com).

## Istruzioni

1. Esegui `git tag --sort=-version:refname | head -5` per vedere gli ultimi tag
2. Chiedi all'utente: "Quale versione stai preparando? Da quale tag o data partire? (es. v1.2.0, o 'dal 2026-04-01')"
3. In base alla risposta, esegui il log appropriato:
   - Da ultimo tag: `git log [ultimo-tag]..HEAD --pretty=format:"%h %s" --no-merges`
   - Da data: `git log --since="[data]" --pretty=format:"%h %s" --no-merges`
4. Leggi `@.claude/memory/MEMORY.md` per il nome del progetto e la versione corrente

## Classificazione commit

Raggruppa i commit in categorie secondo il tipo Conventional Commits:

- **feat** / **feature** → `### Aggiunto`
- **fix** → `### Corretto`
- **refactor** / **perf** → `### Modificato`
- **docs** → (includi solo se rilevante per utenti finali, altrimenti salta)
- **chore** / **ci** / **test** → (salta — non rilevanti nel CHANGELOG pubblico)
- **BREAKING CHANGE** nel footer → `### Breaking Change` (sempre in cima)

## Output — proposta sezione CHANGELOG

Mostra la bozza formattata prima di scrivere:

---

## [X.Y.Z] — YYYY-MM-DD

### Breaking Change

- [se presenti]

### Aggiunto

- [feature 1 — descrizione in linguaggio naturale, non il messaggio git verbatim]
- [feature 2]

### Corretto

- [fix 1]
- [fix 2]

### Modificato

- [refactor o miglioramento rilevante]

---

Vuoi che applichi questa sezione a `CHANGELOG.md`? (sì / modifica / salta)

## Comportamento dopo conferma

- **sì**: inserisce la sezione in cima a `CHANGELOG.md` (dopo `# Changelog` e prima della sezione precedente). Se `CHANGELOG.md` non esiste, lo crea con intestazione standard
- **modifica**: mostra la sezione, attende le correzioni dell'utente, poi chiede di nuovo
- **salta**: non scrivere nulla

## Struttura CHANGELOG.md se non esiste

```markdown
# Changelog

Tutte le modifiche rilevanti a questo progetto sono documentate qui.
Formato: [Keep a Changelog](https://keepachangelog.com/it/1.0.0/)
Versioning: [Semantic Versioning](https://semver.org/lang/it/)

## [Non rilasciato]

[sezioni generate qui]
```

## Regole

- Riscrivi i messaggi git in linguaggio naturale, dal punto di vista dell'utente — non dal punto di vista dello sviluppatore
- Non includere commit di merge, bump versione, aggiornamenti dipendenze minori
- Se un commit non è classificabile o è troppo tecnico, omettilo
- La data è quella odierna, salvo indicazione diversa dell'utente
- La versione target è quella indicata dall'utente — non inventarla
