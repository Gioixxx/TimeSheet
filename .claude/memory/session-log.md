---
type: session-log
tags: [memory, session-log]
updated: [auto]
---

# Log di Sessione
Snapshot automatici del lavoro in corso, salvati da `save_context.py` su PreCompact/SessionEnd
(feature `enforcementHooks`) e ricaricati all'avvio da `session_start.py`. Gestito automaticamente:
le entry sotto sono sovrascritte per `sessionId` (rolling, ultime ~10). Vedi [[sprint]] per i task attivi.
