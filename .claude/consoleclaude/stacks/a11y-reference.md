# Accessibilità (Reference)

> **Revisione doc:** 2026-10

> Contiene la checklist WCAG 2.2 livello AA per area, i pattern ARIA per dialog, tab, menu e combobox (focus, tastiera, ritorno del focus) e come si verifica con strumenti automatici e controlli a mano. Le regole brevi stanno nel modulo base.

## Checklist AA per area

**Struttura e semantica**
- [ ] Un solo `h1`, titoli in ordine senza salti; punti di riferimento (`header`, `nav`, `main`, `footer`) presenti.
- [ ] Elenchi, tabelle e moduli con gli elementi giusti; le tabelle di dati hanno intestazioni (`th`, `scope`).
- [ ] `lang` sulla pagina; titolo della pagina che dice dove si è.
- [ ] Un link per saltare al contenuto principale, se la pagina ha una navigazione lunga.

**Nomi e testi**
- [ ] Ogni campo ha una `label`; ogni pulsante e ogni link un nome che ha senso da solo («Elimina la riga 3», non «Clicca qui»).
- [ ] Il nome accessibile contiene il testo visibile (il comando vocale funziona).
- [ ] Le immagini informative hanno un alt che dice cosa mostrano; quelle decorative `alt=""`.
- [ ] Le icone senza testo hanno un nome.

**Tastiera e focus**
- [ ] Tutto raggiungibile con Tab, Maiusc+Tab, frecce, Invio, Spazio ed Esc dove previsti.
- [ ] Nessuna trappola; ordine del focus uguale all'ordine della lettura.
- [ ] Focus visibile, con contrasto 3:1 e non nascosto da barre fisse o da banner (WCAG 2.2: il focus non è coperto).
- [ ] Le scorciatoie a un solo carattere si possono disattivare o cambiare.
- [ ] Un trascinamento ha un'alternativa con un solo puntatore (pulsanti, menu).

**Colore e contrasto**
- [ ] Testo normale ≥ 4.5:1; testo grande (da 24 px, o 19 px in grassetto) ≥ 3:1.
- [ ] Bordi dei campi, icone e stati ≥ 3:1 rispetto allo sfondo.
- [ ] Il colore non è l'unico segnale.
- [ ] Controllato su tutti i temi (chiaro, scuro, contrasto elevato).

**Dimensioni e adattamento**
- [ ] Bersagli ≥ 24×24 px CSS, o distanziati.
- [ ] Zoom al 200% e larghezza di 320 px senza perdita di contenuto né scorrimento orizzontale (il testo ridimensionabile non è bloccato).
- [ ] La spaziatura del testo può essere aumentata senza rompere il layout.
- [ ] Il contenuto non dipende dall'orientamento dello schermo.

**Moduli ed errori**
- [ ] Errore associato al campo (`aria-describedby`) e scritto in modo che si capisca come correggere.
- [ ] I campi che chiedono dati personali hanno `autocomplete`.
- [ ] Non si chiede di nuovo un dato già inserito nello stesso flusso (WCAG 2.2).
- [ ] Un accesso non richiede di ricordare o trascrivere un codice senza alternative (incolla, gestore di password).

**Movimento e tempo**
- [ ] `prefers-reduced-motion` rispettato; niente lampeggi sopra tre al secondo.
- [ ] Animazioni automatiche oltre 5 secondi sospendibili.
- [ ] I limiti di tempo si possono prolungare o disattivare.

**Media**
- [ ] Sottotitoli per l'audio nei video; trascrizione per l'audio solo; descrizione per ciò che si capisce solo guardando.
- [ ] Nessun audio che parte da solo per più di 3 secondi senza un controllo.

## Pattern ARIA

Per ognuno: l'elemento nativo viene prima. Il pattern serve quando non esiste.

### Dialog modale
- Ruolo `dialog` (o l'elemento `dialog` aperto in modo modale), `aria-modal="true"`, nome da `aria-labelledby`.
- All'apertura il focus va al primo controllo utile (o al titolo, se il contenuto è lungo); Tab e Maiusc+Tab restano **dentro** (focus trap).
- Esc chiude. Alla chiusura il focus torna all'elemento che aveva aperto il dialog.
- Il resto della pagina non si legge né si raggiunge finché è aperto (`inert`).

### Tab
- Contenitore `tablist`, ogni scheda `tab` con `aria-selected` e `aria-controls`, ogni pannello `tabpanel` con `aria-labelledby`.
- Tab porta nella lista (una sola scheda ha `tabindex="0"`, le altre `-1`); le frecce spostano fra le schede; Home e Fine vanno alla prima e all'ultima. Tab dalla scheda porta nel pannello.

### Menu (di azioni)
- Pulsante con `aria-haspopup="menu"` e `aria-expanded`; il menu ha ruolo `menu` e voci `menuitem`.
- Invio, Spazio o freccia giù aprono e portano il focus sulla prima voce; le frecce si muovono, Esc chiude e restituisce il focus al pulsante, un carattere salta alla voce che inizia con quella lettera.
- Non si usa `menu` per la navigazione del sito: lì bastano elenco di link e un pulsante «Menu».

### Combobox (con elenco di suggerimenti)
- Il campo ha ruolo `combobox`, `aria-expanded`, `aria-controls` verso l'elenco `listbox` e `aria-activedescendant` verso la voce evidenziata; il focus resta nel campo.
- Freccia giù apre e scorre le voci, Invio sceglie, Esc chiude (una seconda volta svuota), il testo digitato resta modificabile.
- Il numero dei risultati si annuncia in una regione `aria-live="polite"`.

## Verifica

**Strumenti automatici** (a ogni modifica, in CI): un analizzatore di accessibilità dentro i test dei componenti e un controllo dell'intera pagina. Trovano una parte dei problemi (contrasti, nomi mancanti, ruoli sbagliati, `lang`): un risultato verde non vuol dire conforme.

**A mano**, prima di chiudere un componente nuovo:
1. **Tastiera**: si scollega il mouse. Si arriva a tutto con Tab, si attiva con Invio e Spazio, si esce con Esc. Il focus si vede sempre e l'ordine ha senso.
2. **Lettore di schermo**: si legge il flusso con un lettore di schermo (quello integrato nel sistema va bene). Ogni controllo dice nome, ruolo e stato; gli errori e gli aggiornamenti vengono annunciati.
3. **Zoom al 200%** e finestra stretta (320 px): niente è tagliato, niente scorre in due direzioni.
4. **Contrasto** con uno strumento a contagocce su testo, bordi, icone e focus, nei temi chiaro e scuro.
5. **Movimento ridotto**: si attiva la preferenza di sistema e si guarda cosa resta in movimento.

Un difetto trovato a mano si trasforma, dove si può, in un test automatico (nome accessibile presente, focus che torna al pulsante).
