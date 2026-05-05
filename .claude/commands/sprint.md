# /sprint — Aggiorna Sprint

Gestisci lo stato dello sprint corrente: visualizza, aggiorna task, segna come completati.

## Istruzioni

1. Leggi `@.claude/memory/sprint.md`
2. Mostra lo stato attuale in modo leggibile
3. Chiedi all'utente cosa vuole fare:
   - Aggiungere un nuovo task
   - Segnare un task come completato
   - Aggiornare l'obiettivo dello sprint
   - Iniziare un nuovo sprint

## Output — visualizzazione stato

```
🎯 Sprint: [nome/numero] — scade [data]
Obiettivo: [descrizione]

📋 In corso:
  ○ [task 1]
  ○ [task 2]

✅ Completati:
  ● [task fatto]
  ● [task fatto]

📊 Progresso: X/Y task completati
```

## Operazioni disponibili

**Aggiungere task:**
Aggiungi il task nella lista "In corso" con `- [ ]`

**Completare task:**
Sposta il task da "In corso" a "Completati", cambia `- [ ]` in `- [x]`

**Nuovo sprint:**
Archivia lo sprint corrente (sposta in una sezione `## Storico`) e crea la struttura per il nuovo sprint

## Regole

- Non cancellare mai i task completati — archiviali
- Se `sprint.md` non esiste, crealo con il template base e chiedi all'utente di riempirlo
- Aggiorna sempre la data dell'ultimo aggiornamento in cima al file
