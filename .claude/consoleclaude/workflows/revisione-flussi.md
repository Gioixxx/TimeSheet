# Workflow: Revisione dei flussi — Regole

> **Revisione doc:** 2026-10

## Principio

Due funzioni giuste da sole possono sbagliare insieme: una azzera ciò che l'altra imposta, un pulsante resta attivo per un'azione ormai impossibile. Si trovano seguendo ogni punto di contatto (pulsante, scorciatoia, evento, rotta, messaggio dal server) fino allo stato finale, non leggendo le funzioni una alla volta. Serve quando il diff tocca interfaccia o stato condiviso.

## Regole

- **Un flusso per volta**: per ogni punto di contatto che il diff tocca, scrivi stato prima, azione, effetti (stato in memoria, rete, storage, DOM) e stato dopo. Gli effetti si cercano con Grep, partendo dal gestore e seguendo ogni chiamata
- **Scenari obbligatori**: doppio clic o doppia pressione; un'azione mentre un'altra è in corso; annulla a metà; cambio di contesto a metà (progetto, sessione, scheda); errore di rete o del server; ricarica della pagina
- **Chi altro legge o scrive lo stesso stato?** Cercalo con Grep: ogni scrittura concorrente è un candidato a sovrascrivere
- **Lo stato dopo l'errore** conta quanto quello dopo il successo: il pulsante torna attivo, l'indicatore di attesa sparisce, nulla resta a metà
- **Il rilievo dice il flusso**, non solo la riga: «dal pulsante X al messaggio Y succede Z», con `file:riga` di ogni passo. Se non l'hai seguito fino in fondo, nel rapporto va alla riga «Non verificato»

## Segnali

- Due funzioni corrette da sole che si annullano (A azzera ciò che B imposta)
- Un controllo attivo per un'azione impossibile, o spento quando serve
- Listener o timer registrati due volte, o mai rimossi
- Stato che sopravvive al cambio di contesto: la scheda nuova mostra i dati della vecchia
- Risposta in ritardo che sovrascrive una più recente
- Messaggio dal server che arriva mentre l'utente sta già facendo altro

## Pattern

| Flusso | Esito | Rilievo |
|---|---|---|
| Invia, poi cambio sessione prima della risposta | La risposta finisce nella sessione sbagliata | ❌ |
| Doppio clic su «Salva» | Due scritture, la seconda sovrascrive | ⚠️ |
| Errore di rete dopo «Elimina» | Elemento sparito dall'elenco ma presente sul server | ❌ |
| Ricarica con un'azione in corso | Stato ripristinato con il pulsante ancora bloccato | ⚠️ |
| Annulla dopo il primo passo | Tutto torna come prima | ✅ |

La gravità è quella del prompt del Revisore: ❌ blocca, ⚠️ da sistemare, 💡 suggerimento.
