# Contributing to TimeSheet

Grazie per l'interesse nel progetto! / Thanks for your interest in contributing!

---

## Segnalare un bug / Report a Bug

Apri una [Issue](https://github.com/Gioix/timesheet/issues/new) includendo:

- Versione dell'app e OS
- Passi per riprodurre il problema
- Comportamento atteso vs comportamento osservato
- Screenshot o log di errore (se disponibili)

---

## Proporre una feature / Request a Feature

Apri una [Issue](https://github.com/Gioix/timesheet/issues/new) con il prefisso `[Feature]` nel titolo e descrivi:

- Il problema che la feature risolverebbe
- La soluzione proposta
- Alternative considerate

---

## Inviare una Pull Request

1. Fai un fork del repository
2. Crea un branch descrittivo:
   ```bash
   git checkout -b feat/nome-feature
   # oppure
   git checkout -b fix/nome-bug
   ```
3. Scrivi il codice e committa seguendo le convenzioni sotto
4. Apri una Pull Request verso `main` con una descrizione chiara delle modifiche

---

## Convenzioni di commit

Usa il formato [Conventional Commits](https://www.conventionalcommits.org/):

| Prefisso | Quando usarlo |
| -------- | ------------- |
| `feat:` | Nuova funzionalità |
| `fix:` | Correzione di un bug |
| `refactor:` | Modifica al codice senza cambiamenti funzionali |
| `docs:` | Aggiornamento documentazione |
| `chore:` | Aggiornamento dipendenze, configurazione build, ecc. |

Esempio: `feat: add weekly hours chart to dashboard`

---

## Licenza

Contribuendo accetti che il tuo codice sia rilasciato sotto licenza [MIT](LICENSE).
