# Docker — Regole

> **Revisione doc:** 2026-10

## Principio
Un'immagine è un artefatto: si costruisce una volta, è piccola, si ricostruisce identica e non porta con sé né segreti né strumenti di build. Un container fa una cosa sola e si può buttare e rialzare in ogni momento.

## Regole
- **Build multi-stage**: compilazione in uno stadio, esecuzione in uno stadio finale minimo (immagine slim, distroless o equivalente). Nell'immagine finale solo ciò che serve a girare.
- **Immagine base fissata**: tag preciso (o digest), mai `latest` né un tag che scorre. Si aggiorna di proposito, con una modifica che si rilegge.
- **Utente non root**: `USER` esplicito nello stadio finale, file in sola lettura per l'utente dell'app.
- **`.dockerignore`** sempre: `.git`, dipendenze installate, `.env`, build locali, log. Il contesto di build è piccolo.
- **Un processo per container**; il processo principale è il PID 1 e riceve i segnali di arresto (forma `exec`, non `sh -c`). Log su stdout/stderr.
- **`HEALTHCHECK`** (o la sonda dell'orchestratore) su un'uscita che verifica davvero l'app, non solo che la porta sia aperta.
- **Segreti mai nell'immagine**: non in `ENV`, non in `ARG`, non copiati nel contesto. Si passano a runtime (variabili o file montati) e, in build, come secret di build che non finiscono in nessun livello.
- **Livelli**: prima i file che cambiano di rado (manifest delle dipendenze), poi il codice; installazione e pulizia nello stesso `RUN`.
- **Compose**:
  - reti separate per livello (frontend, backend, dati): il database non è sulla rete pubblica;
  - volumi con nome per i dati, mai nel livello scrivibile del container;
  - `depends_on` con `condition: service_healthy`, non solo l'ordine di avvio;
  - porte pubblicate solo dove serve, legate a `127.0.0.1` in sviluppo;
  - limiti di CPU e memoria; `read_only: true` con `tmpfs` per le cartelle temporanee dove l'app lo permette.
- Le immagini si scansionano alla build e a intervalli, e si ricostruiscono quando esce una correzione di sicurezza della base.

Regole di sicurezza trasversali: `.claude/consoleclaude/stacks/security.md` (se presente).

## Reference → `.claude/consoleclaude/stacks/docker-reference.md`
