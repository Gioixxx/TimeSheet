---
name: agent-team
description: "Team di ruoli per Ralph: quando agentTeam è attivo nel prd.json, ogni user story è lavorata da una pipeline di subagent (planner → implementer → tester → reviewer) via Task tool invece che da un singolo agente. Trigger: agentTeam nel prd.json, team di ruoli, pipeline di subagent Ralph."
---

# Ralph Agent Team

Quando `prd.json` dichiara `"agentTeam": true` (a livello PRD o sulla singola storia), Ralph
non implementa la storia con un singolo agente generalista: la **sessione di iterazione diventa
orchestratore** e delega la storia a una pipeline di subagent con ruoli espliciti, tramite il
Task tool nativo.

## Pipeline

Ruoli di default (`teamRoles`), nell'ordine: **planner → implementer → tester → reviewer**.

| Ruolo | subagent_type | Tool | Compito | Handoff |
|-------|---------------|------|---------|---------|
| Planner | `ralph-planner` | read-only | Piano d'implementazione della storia | `.claude/team/plan.md` |
| Implementer | `ralph-implementer` | write+bash | Implementa il piano | `.claude/team/impl-notes.md` |
| Tester | `ralph-tester` | write+bash | Build/test verdi (loop di fix) | `.claude/team/impl-notes.md` |
| Reviewer | `ralph-reviewer` | read-only | Review+security bloccante | `.claude/team/review-notes.md` |

Lo stato condiviso è il **working tree** (stesso filesystem per tutti i ruoli) più i file di
handoff in `.claude/team/` (osservabilità e recovery). I subagent non condividono contesto:
l'orchestratore passa avanti l'output di ciascun ruolo. I subagent non annidano altri Task — il
loop di gate è guidato dall'orchestratore.

## Comportamento

- L'orchestratore esegue i ruoli in ordine; mantiene per sé il bookkeeping
  (`ralph/prd.json`, `run-state.json`, `progress.txt`, commit, eventuale PR).
- **Gate**: se `ralph-reviewer` riporta rilievi `❌` (BLOCCATO), l'orchestratore ri-delega a
  `ralph-implementer` (poi `ralph-tester`) e ri-esegue `ralph-reviewer`. La storia è completata
  (`passes: true`) solo con reviewer PULITO e build/test verdi.
- Il reviewer **assorbe** `reviewGate`: con `agentTeam` attivo non viene iniettato anche lo step
  4b del review-gate (niente doppione).

## Attivazione

```json
{
  "agentTeam": true,
  "teamRoles": ["planner", "implementer", "tester", "reviewer"],
  "userStories": [
    { "id": "US-007", "title": "...", "agentTeam": false, "...": "..." }
  ]
}
```

- `agentTeam` a livello PRD è il default; il campo `agentTeam` sulla singola storia lo sovrascrive.
- `teamRoles` consente team "lite" (es. `["implementer", "reviewer"]`).
- `ralph/ralph-once.ps1` legge i flag, sincronizza `ralph/agents/*.md` in `.claude/agents/` del
  progetto (anche nei worktree di `ralph-parallel.ps1`) e inietta il blocco di orchestrazione.

## Costi

Una pipeline a 4 ruoli moltiplica token e latenza per storia: tieni `agentTeam` come **opt-in**
(default `false`) per le storie che traggono beneficio dalla cooperazione, e usa `teamRoles`
ridotti dove basta meno.
