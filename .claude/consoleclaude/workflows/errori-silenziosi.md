# Workflow: Errori silenziosi — Regole

> **Revisione doc:** 2026-10

## Principio

Un errore che nessuno vede non si corregge: il programma sembra funzionare e sbaglia in silenzio. Per ogni punto in cui il codice gestisce un errore, la domanda è una sola: **chi lo viene a sapere?** Se la risposta è «nessuno», è un rilievo.

## Regole

- **Errori inghiottiti**: un `catch` vuoto, `.catch(() => {})`, una promise non attesa, `except: pass`, `_ = err` sono almeno ⚠️. Se il silenzio è voluto, un commento dice perché e cosa succede al posto dell'errore
- **Fallback che sembra un dato vero**: un valore di ripiego (lista vuota, zero, stringa vuota) dopo un errore di lettura si confonde con «non c'è niente». Il chiamante deve poter distinguere i due casi
- **Errori non propagati**: `return null` al posto di un errore, «logga e prosegui» quando il passo dopo dipende dal risultato, un errore trasformato in un messaggio generico che perde la causa
- **Retry senza tetto**: ogni ripetizione ha un numero massimo e un'attesa crescente; finiti i tentativi l'errore risale
- **Un fallback è giusto** quando è documentato, osservabile (un log, una metrica, un messaggio all'utente) e testato. Mancando una delle tre, è un rilievo
- **Nei test**: un `catch` che fa passare il test, un'asserzione dentro un callback che non viene mai chiamato, un `await` dimenticato
- **Il rilievo dice cosa si perde**: «se la lettura fallisce, l'utente vede l'elenco vuoto e non sa perché», non «catch vuoto»

## Pattern

| Linguaggio | Cosa cercare con Grep |
|---|---|
| JS/TS | `catch\s*(\([^)]*\))?\s*\{\s*\}`, `\.catch\(\(\) =>`, `\|\| \[\]` dopo una lettura, chiamata async senza `await` |
| Python | `except:` e `except Exception:` seguiti da `pass`, `contextlib.suppress`, `return None` in un `except` |
| C# | `catch\s*\{\s*\}`, `catch (Exception)` che non rilancia, `async void`, `Task` non atteso |
| Go | `_ = err`, `_, _ :=`, `if err != nil` che non ritorna né registra |

Per ogni occorrenza: l'errore sparisce, viene registrato, o arriva al chiamante? Solo le ultime due vanno bene, e la seconda solo se nessun passo successivo dipende dal risultato.
