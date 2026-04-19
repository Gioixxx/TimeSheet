# /threat-model — Threat Modeling

Guida la creazione di un threat model per una feature o un endpoint usando il framework STRIDE.
Produce un documento strutturato con minacce identificate e contromisure consigliate.

## Istruzioni

1. Chiedi all'utente: "Descrivi la feature o il sistema da analizzare. Include: cosa fa, chi la usa, con quali dati lavora, e quali servizi esterni coinvolge."
2. Leggi `@.claude/memory/decisions.md` per il contesto architetturale
3. Leggi `@.claude/memory/domain.md` per capire entità e dati sensibili del dominio

## Analisi da produrre

### 1. Asset da proteggere

Identifica cosa ha valore nel sistema descritto:
- Dati (personali, finanziari, sanitari, credenziali)
- Funzionalità (pagamenti, autorizzazioni, processi critici)
- Disponibilità (servizi che devono essere sempre up)

### 2. Attori e trust boundary

- **Attori legittimi**: chi usa la feature e con quali permessi?
- **Attori ostili**: chi potrebbe attaccarla? (utenti anonimi, utenti autenticati malevoli, attaccanti esterni)
- **Trust boundary**: dove il controllo passa da un componente a un altro?

### 3. Data flow

Traccia il flusso dei dati nella feature:
```
[Attore] → [Endpoint] → [Service] → [DB/Cache/API esterna]
```
Identifica ogni punto dove il dato attraversa un confine di fiducia.

### 4. Minacce STRIDE per componente

Per ogni componente e freccia del data flow, applica STRIDE:

| Minaccia | Componente | Scenario concreto | Probabilità | Impatto |
|----------|-----------|-------------------|-------------|---------|
| Spoofing | ... | ... | Alta/Media/Bassa | Alto/Medio/Basso |
| Tampering | ... | ... | | |
| Repudiation | ... | ... | | |
| Information Disclosure | ... | ... | | |
| Denial of Service | ... | ... | | |
| Elevation of Privilege | ... | ... | | |

### 5. Contromisure

Per ogni minaccia ad alta/media priorità, proponi la contromisura specifica per lo stack del progetto con riferimento a `stacks/security.md` e `stacks/auth-patterns.md`.

## Output atteso

---

**Threat Model: [nome feature]**
**Stack:** [dal contesto]
**Data:** [oggi]

**Asset**
- [asset 1 — tipo e sensibilità]
- [asset 2]

**Attori**
- Legittimi: [chi può usare la feature e con quale ruolo]
- Ostili: [chi potrebbe attaccarla]

**Data Flow**
```
[diagramma testuale del flusso]
```

**Minacce identificate**

[tabella STRIDE con scenario, probabilità, impatto]

**Contromisure raccomandate**

Alta priorità (implementare prima del rilascio):
- [contromisura 1 — minaccia che mitiga — riferimento implementazione]

Media priorità (implementare nel prossimo sprint):
- [contromisura 2]

Bassa priorità (monitorare):
- [contromisura 3]

**Residual risk**
[Rischi che rimangono accettati consapevolmente con motivazione]

---

## Regole

- Non inventare minacce teoriche senza un vettore concreto — ogni minaccia deve avere uno scenario realistico
- Priorità basata su probabilità × impatto — non elencare tutto come "alta priorità"
- Le contromisure devono essere specifiche per lo stack, non generiche
- Proporre di salvare il documento in `.claude/memory/decisions.md` o in una cartella dedicata `docs/security/`
- Non modificare nessun file senza conferma dell'utente
