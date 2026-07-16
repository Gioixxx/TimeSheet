---
name: review-gate
description: "Gate di qualità per Ralph: una user story è completabile solo dopo un /code-review (+ /security-review) senza rilievi bloccanti. Trigger: reviewGate attivo nel prd.json, gate di review, blocca storia se review non pulito."
---

# Ralph Review Gate

Quando `prd.json` dichiara `"reviewGate": true`, ogni iterazione Ralph applica un **gate
bloccante** prima di marcare una storia come completata (`"passes": true`).

## Comportamento

Dopo che build e test passano (step 4 dell'iterazione), e **prima** di impostare
`"passes": true` sulla storia (step 5):

1. Revisiona la diff della storia corrente: usa `@.claude/commands/review.md` se presente,
   altrimenti esegui la skill first-party `/code-review` (Skill tool).
2. Per la sicurezza usa `@.claude/commands/security-check.md` se presente, altrimenti esegui la
   skill first-party `/security-review` (Skill tool).
3. Classifica i rilievi: `❌` bloccante · `⚠️` warning · `💡` suggerimento.
4. **Decisione del gate:**
   - Nessun `❌` → la storia può essere completata (`passes: true`). I `⚠️`/`💡` non bloccano
     ma vanno annotati in `notes`.
   - Almeno un `❌` → **non** completare la storia. Correggi i rilievi in *questa stessa
     iterazione*, ri-esegui build/test, poi ripeti il review. Solo quando è pulito → `passes: true`.

## Regole

- Il gate opera sulla **singola storia** dell'iterazione corrente — non sull'intero PRD.
- Non passare mai alla storia successiva con un review non pulito.
- Resta non interattivo (policy Ralph): correggi con il miglior default sensato, non chiedere conferma.
- Se `reviewGate` è assente o `false`, l'iterazione mantiene il comportamento standard
  (i command file di review restano linee guida, non un gate bloccante).

## Attivazione

Nel `prd.json`:

```json
{
  "reviewGate": true
}
```

Il flag è letto da `ralph/ralph-once.ps1`, che inietta lo step `4b` nel prompt di iterazione.
