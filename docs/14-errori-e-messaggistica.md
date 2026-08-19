# 14 — Errori e messaggistica utente

L'app non ha un sistema di internazionalizzazione: tutte le stringhe sono in italiano, scritte
direttamente nei componenti. Questo documento raccoglie il meccanismo centrale di traduzione degli
errori e il catalogo dei messaggi mostrati all'utente.

---

## 14.1 `getUserFacingApiErrorMessage` — il traduttore centrale

`src/utils/apiErrorMessage.ts` (145 righe) trasforma qualunque errore in una frase italiana
comprensibile. È usato in **26 punti** distribuiti su 11 schermate.

### Firma

```typescript
export function getUserFacingApiErrorMessage(
  error: unknown,
  options?: { fallback?: string; context?: string }
): string
```

- `error`: accetta `unknown`, quindi funziona anche nei `catch` senza type narrowing.
- `context`: prefisso descrittivo, **senza punto finale** (il JSDoc lo specifica). Viene composto come
  `` `${context}. ` ``.
- `fallback`: usato quando non si riesce a estrarre nulla di utile. Default:
  `'Operazione non riuscita. Riprova più tardi.'`

Il risultato ha quindi la forma `"{context}. {messaggio specifico}"`, per esempio:
`"Impossibile caricare i pagamenti. Connessione non disponibile. Controlla la rete e riprova."`

### Ordine di valutazione

1. **Errore di rete** → `"Connessione non disponibile. Controlla la rete e riprova."`
2. **Errore Axios**:
   - senza `response` → messaggio di rete
   - `403` con codice `PASSWORD_SCADUTA` → messaggio del server o
     `"La tua password è scaduta: cambiala dal gestionale per continuare."`
   - `403` → `"Non hai i permessi per accedere a questo contenuto."`
   - `401` → `"Accesso non autorizzato. Effettua di nuovo il login."`
   - `404` → `"Contenuto non disponibile."`
   - `408` o `504` → `"Il server ha impiegato troppo tempo. Riprova tra poco."`
   - `429` → `"Troppe richieste. Attendi un momento e riprova."`
   - `>= 500` → messaggio del server umanizzato, o `"Errore del server. Riprova più tardi."`
   - altrimenti, messaggio del server se non generico
   - altrimenti, `fallback`
3. **`Error` generico** con messaggio utile → messaggio umanizzato
4. **Qualsiasi altro caso** → `fallback`

### Rilevamento degli errori di rete

Doppio criterio, su codice e su testo:

```58:72:src/utils/apiErrorMessage.ts
function isNetworkFailure(error: unknown): boolean {
  if (isAxiosError(error)) {
    if (!error.response) return true;
    const code = error.code;
    if (code === 'ERR_NETWORK' || code === 'ECONNREFUSED' || code === 'ENOTFOUND') {
      return true;
    }
  }
  if (error instanceof Error) {
    if (error.message && isNetworkFailureMessage(error.message)) return true;
    const code = (error as Error & { code?: string }).code;
    if (code === 'ERR_NETWORK') return true;
  }
  return false;
}
```

`isNetworkFailureMessage` riconosce sette varianti testuali, coprendo i messaggi prodotti da Axios,
`fetch` e dai layer nativi iOS e Android:

| Stringa riconosciuta | Origine tipica |
|---|---|
| `network error` | Axios |
| `network request failed` | `fetch` su React Native |
| `network connection was lost` | iOS (NSURLError) |
| `internet connection appears to be offline` | iOS |
| `failed to connect` | Android/OkHttp |
| `could not connect` | vari |
| `connessione interrotta` | backend italiano |

Il confronto è su `toLowerCase()`, con `===` per i primi due e `includes()` per gli altri. È un elenco
empirico e va ampliato se emergono nuovi messaggi, ma copre i casi reali frequenti.

### Estrazione del messaggio dal server

```12:24:src/utils/apiErrorMessage.ts
function extractServerMessage(error: AxiosError): string | null {
  const d = error.response?.data;
  if (d && typeof d === 'object') {
    const msg = (d as { message?: unknown; error?: unknown }).message;
    if (typeof msg === 'string' && msg.trim()) return msg.trim();
    const err = (d as { error?: unknown }).error;
    if (typeof err === 'string' && err.trim()) return err.trim();
  }
  if (typeof d === 'string' && d.trim().length > 0 && d.length < 500) {
    return d.trim();
  }
  return null;
}
```

Ordine di preferenza: `data.message`, poi `data.error`, poi il corpo se è una stringa. Il limite
`d.length < 500` evita di mostrare all'utente una pagina HTML di errore o uno stack trace: dettaglio
piccolo ma decisivo per la qualità percepita.

`extractServerErrorCode` legge solo `data.error`, usato per il caso `PASSWORD_SCADUTA`.

### Filtri sui messaggi tecnici

**Messaggi generici di Axios**:

```typescript
function isGenericAxiosMessage(msg: string): boolean {
  return /^Request failed with status code \d+$/i.test(msg.trim());
}
```

Impedisce che l'utente veda `"Request failed with status code 500"`.

**Umanizzazione dei messaggi backend**:

```4:10:src/utils/apiErrorMessage.ts
function humanizeBackendErrorText(raw: string): string {
  const t = raw.trim();
  if (/endpoint\s+non\s+trovato/i.test(t) || /endpoint\s+not\s+found/i.test(t)) {
    return 'Questa funzione non è al momento disponibile sul server. Riprova più tardi o contatta la segreteria.';
  }
  return t;
}
```

Un solo pattern gestito, in italiano e inglese: il messaggio `"endpoint non trovato"` (che il backend
restituisce quando una rotta non esiste) sarebbe incomprensibile per l'utente finale.

### Il caso `PASSWORD_SCADUTA`

```97:105:src/utils/apiErrorMessage.ts
    if (status === 403) {
      // La password gestionale scade a rotazione: non è una sessione da rifare.
      if (extractServerErrorCode(error) === 'PASSWORD_SCADUTA') {
        return `${prefix}${
          serverMsg || 'La tua password è scaduta: cambiala dal gestionale per continuare.'
        }`;
      }
      return `${prefix}Non hai i permessi per accedere a questo contenuto.`;
    }
```

Il commento spiega il motivo della distinzione: le password del gestionale scadono per policy di
rotazione, e un generico "non hai i permessi" manderebbe l'utente sulla strada sbagliata. È l'unico
codice di errore strutturato riconosciuto dall'app: tutti gli altri casi si bassano su status HTTP o
su match testuali. Estendere questo approccio (codici stabili nell'envelope) renderebbe la
gestione degli errori molto più robusta.

---

## 14.2 Catalogo dei contesti di errore

Ogni chiamata specifica un `context` che identifica l'operazione fallita.

| Contesto | Fallback specificato | File |
|---|---|---|
| `'Impossibile caricare gli studi'` | — | `BookVisitScreen:527` |
| `'Impossibile caricare gli osteopati'` | — | `BookVisitScreen:531` |
| `'Impossibile caricare le disponibilità'` | — | `BookVisitScreen:536` |
| `'Impossibile cercare i pazienti'` | — | `BookVisitScreen:647` |
| `'Impossibile caricare gli acquisti'` | `'Impossibile caricare gli acquisti. Riprova più tardi.'` | `BookVisitScreen:713` |
| `'Impossibile completare la prenotazione'` | `'Impossibile completare la prenotazione. Riprova più tardi.'` | `BookVisitScreen:302` |
| `'Impossibile creare l'acquisto'` | `'Riprova più tardi.'` | `CreaAcquistoModal:103` |
| `'Impossibile caricare i servizi'` | — | `CreaAcquistoModal:174`, `235` |
| `'Impossibile caricare il profilo'` | — | `GestioneVisiteScreen:281`, `PagamentiPazienteScreen:158` |
| `'Impossibile caricare l'agenda del giorno'` | — | `GestioneVisiteScreen:287` |
| `'Impossibile caricare le visite'` | — | `GestioneVisiteScreen:292` |
| `'Impossibile caricare i pagamenti'` | — | `PagamentiPazienteScreen:163` |
| `'Impossibile caricare le prenotazioni'` | `'Non siamo riusciti a caricare l'elenco. Controlla la connessione e riprova.'` | `SessioniPrenotazioniScreen:69` |
| `'Impossibile caricare le prenotazioni'` | — | `SessioniHomeScreen:45` |
| `'Impossibile annullare la prenotazione'` | `'Riprova tra poco o contatta la segreteria.'` | `SessioniPrenotazioniScreen:101` |
| `'Impossibile caricare il calendario sessioni'` | — | `SessioniCalendarioScreen:112` |
| (prenotazione sessione) | `'Riprova più tardi o contatta la segreteria.'` | `SessioniCalendarioScreen:188` |
| `'Impossibile caricare i corsi aziendali'` | `'Non siamo riusciti a caricare l'elenco dei corsi aziendali. Riprova tra poco.'` | `CorsiAziendaliScreen` |
| `'Impossibile caricare i corsi posturali'` | `'Non siamo riusciti a caricare l'elenco dei corsi posturali. Riprova tra poco.'` | `CorsiPosturaliScreen` |

Più i corrispettivi del modulo Fitness (non raggiungibile):
`'Impossibile caricare le prenotazioni fitness'`, `'Impossibile caricare il calendario fitness'`,
`'Impossibile caricare le prenotazioni'`, `'Impossibile annullare la prenotazione'`.

La convenzione `"Impossibile <verbo> <oggetto>"` è rispettata in tutti i casi: risultato uniforme e
riconoscibile.

---

## 14.3 I canali di presentazione

L'app usa quattro modi diversi di mostrare un errore, con criteri abbastanza coerenti.

| Canale | Quando | Esempi |
|---|---|---|
| Banner inline | Errore su dati già presenti | Tutte le liste con `RefreshControl` |
| Empty state | Errore senza dati da mostrare | `ListEmptyComponent` di ogni `FlatList` |
| `Alert.alert` | Esito di un'azione dell'utente | Prenotazioni, creazione acquisto |
| Modale custom | Conferme e informazioni | `ProfileScreen`, `LoginScreen` |

La distinzione fra banner ed empty state è la scelta di design più importante: **un refetch fallito
non cancella i dati già visibili**. È applicata sistematicamente.

### Gli `Alert.alert` nativi

Solo 12 in tutta l'app, tutti legati ad azioni esplicite:

| Titolo | Messaggio | File |
|---|---|---|
| `'Password dimenticata?'` | `'Contatta l'amministratore di Mobilitas HQ per reimpostare l'accesso.'` | `LoginScreen:121` |
| `'Prenotazione registrata'` | `'Riceverai conferma secondo le procedure dello studio.'` | `BookVisitScreen:296` |
| `'Errore'` | messaggio da `getUserFacingApiErrorMessage` | `BookVisitScreen:299` |
| `'Paziente mancante'` | `'Seleziona un paziente dall'elenco prima di confermare.'` | `BookVisitScreen:493` |
| `'Acquisto mancante'` | `'Seleziona un acquisto di riferimento tra quelli prenotabili per questo paziente.'` | `BookVisitScreen:497` |
| `'Confermi la prenotazione?'` | data e fascia orario formattate | `BookVisitScreen:503` |
| `'Creazione non riuscita'` | messaggio da `getUserFacingApiErrorMessage` | `CreaAcquistoModal:100` |
| `'Servizio mancante'` | `'Seleziona un servizio dall'elenco attivo.'` | `CreaAcquistoModal:115` |
| `'Sconto non valido'` | `'Inserisci un valore sconto maggiore di zero.'` | `CreaAcquistoModal:120` |
| `'Prenotazione non riuscita'` | messaggio da `getUserFacingApiErrorMessage` | `SessioniCalendarioScreen:185` |
| `'Utente non disponibile'` | `'Impossibile prenotare: utente non identificato.'` | `FitnessSessionsCalendarScreen:183` |
| `'Prenotazione non riuscita'` | messaggio da `getUserFacingApiErrorMessage` | `FitnessSessionsCalendarScreen:195` |

Osservazione: il modulo Visite usa `Alert.alert` per conferme e validazioni, mentre `ProfileScreen`
usa modali custom per le stesse funzioni. Due linguaggi visivi diversi per interazioni analoghe. Le
modali custom sono più coerenti con il tema scuro dell'app; gli alert nativi sono più rapidi da
scrivere e supportano meglio l'accessibilità di sistema.

### I titoli degli errori

`'Errore'`, `'Creazione non riuscita'`, `'Prenotazione non riuscita'`: il primo è generico, gli altri
due sono specifici. Uniformare sul modello specifico migliorerebbe la chiarezza.

---

## 14.4 Errori con percorso di supporto

Alcune schermate, oltre al messaggio, offrono un modo di uscire dal problema:
`StudioWhatsAppSupportButton` con messaggio precompilato.

Dove compare:

| Schermata | Condizione |
|---|---|
| `CorsiCatalogView` | Sempre in caso di errore (banner ed empty state) |
| `SessioniHomeScreen` | In caso di errore |
| `SessioniCalendarioScreen` | In caso di errore |
| `SessioniPrenotazioniScreen` | In caso di errore |
| `ProfileScreen` | Nella modale di eliminazione account |
| `GestioneVisiteScreen` | Pulsante WhatsApp proprio (non il componente condiviso) |

Il pulsante **non** compare negli empty state "legittimi" (nessun dato disponibile): solo quando
qualcosa è andato storto. Distinzione corretta, perché non ha senso invitare a contattare la
segreteria perché non ci sono ancora prenotazioni.

### Messaggi WhatsApp precompilati — testo integrale

| Contesto | Testo |
|---|---|
| Corsi aziendali | `"Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi aziendali. Potete aiutarmi? Grazie."` |
| Corsi posturali | `"Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi posturali. Potete aiutarmi? Grazie."` |
| Sessioni posturali | contiene il typo `"non iesco"` invece di `"non riesco"` — vedi [08](./08-modulo-sessioni-e-fitness.md) |
| Eliminazione account | `'Buongiorno, vorrei richiedere la cancellazione definitiva del mio account Mobilitas Academy.'` |

---

## 14.5 Errori del layer di autenticazione

Prodotti direttamente da `AuthContext` e `authApi`, non da `getUserFacingApiErrorMessage`.

| Messaggio | Origine |
|---|---|
| `'Inserisci username o email e password.'` | Validazione client in `LoginScreen` |
| `'Accesso non riuscito'` | Fallback del `catch` in `LoginScreen` |
| Messaggio del backend | `signIn` propaga l'errore di `POST /auth/login` |
| `'Sessione scaduta'` (e simili) | Refresh token fallito → logout forzato |

Dettagli sul flusso in [03](./03-autenticazione-ruoli-e-sessione.md).

---

## 14.6 Errori del download fatture

`pagamentiService.ts` ha un traduttore dedicato, `fatturaPdfUserMessage`, indipendente da
`getUserFacingApiErrorMessage` perché lavora su un corpo JSON scaricato su file anziché su un errore
Axios.

| Pattern nel messaggio backend | Messaggio mostrato |
|---|---|
| `Nessuna fattura Fatture in Cloud associata` | `'Per questo pagamento non è disponibile una fattura da scaricare.'` |
| `non ha il documentId` | `'Questa fattura non è scaricabile.'` |
| `non abilitata` \| `Company ID` | `'Il servizio fatture non è al momento disponibile. Contatta la segreteria.'` |
| `non ha restituito` \| `Download PDF non riuscito` | `'Non è stato possibile scaricare la fattura. Riprova tra poco.'` |
| (nessun match, messaggio presente) | il messaggio grezzo del backend |
| (nessun messaggio) | `'Download della fattura non riuscito. Riprova più tardi.'` |

Altri messaggi dello stesso file:

| Messaggio | Condizione |
|---|---|
| `'Accesso non autorizzato. Effettua di nuovo il login.'` | Token assente, o risposta `403` |
| `'Impossibile salvare la fattura su questo dispositivo.'` | `cacheDirectory` non disponibile |
| `'Il download della fattura sta impiegando troppo tempo. Riprova tra poco.'` | Timeout di 60 s |
| `'Apertura della fattura non disponibile su questo dispositivo.'` | `Sharing.isAvailableAsync()` falso |

Dettagli in [12 §12.4](./12-integrazioni-esterne.md).

---

## 14.7 L'`ErrorBoundary`

Ultima linea di difesa, definita in `App.tsx` come componente di classe (necessario: gli hook non
possono intercettare errori di rendering).

```59:73:App.tsx
  render() {
    if (this.state.hasError) {
      return (
        <View style={errorBoundaryStyles.container}>
          <Text style={errorBoundaryStyles.title}>Ops! Qualcosa è andato storto</Text>
          <Text style={errorBoundaryStyles.message}>
            {this.state.error?.message || 'Errore sconosciuto'}
          </Text>
          <Text style={errorBoundaryStyles.hint}>Controlla la console per i dettagli</Text>
        </View>
      );
    }

    return this.props.children;
  }
```

Tre problemi:

1. **Mostra `error.message` all'utente finale**: un messaggio di errore JavaScript
   (`"Cannot read property 'x' of undefined"`) non significa nulla per chi usa l'app e trasmette
   un'impressione di fragilità.
2. **`'Controlla la console per i dettagli'`** è un'istruzione rivolta a uno sviluppatore: l'utente di
   un'app mobile non ha una console.
3. **Nessun modo di recuperare**: non c'è un pulsante "Riprova" che azzeri `hasError`, né un invito a
   contattare la segreteria. L'unica via d'uscita è chiudere e riaprire l'app.

`componentDidCatch` logga errore e `errorInfo` in console. **Non c'è alcun reporting remoto**
(Sentry, Crashlytics o simili): i crash in produzione non sono osservabili in alcun modo.

Miglioramento consigliato: messaggio generico, pulsante di reset dello stato,
`StudioWhatsAppSupportButton`, e invio dell'errore a un servizio di crash reporting.

---

## 14.8 Logging in console

L'app usa `console.log`, `console.warn` e `console.error` in modo diffuso, **senza condizionarli a
`__DEV__`** nella maggior parte dei casi. In una build di produzione i log restano attivi: costano
prestazioni marginali, ma soprattutto possono esporre informazioni.

Casi critici (tutti in codice non raggiungibile, ma presenti nel bundle):

| File | Cosa viene loggato |
|---|---|
| `cloudflareService.ts:41` | Primi 10 caratteri del token API Cloudflare |
| `youtubeTokenService.ts:105-107` | Primi 20 caratteri di Client ID e refresh token |
| `useYouTubeAuth.ts:74` | Client ID Google completo |
| `useYouTubeAuth.ts:130` | Primi 20 caratteri dell'access token |

Il codice attivo logga informazioni innocue: URL delle richieste, errori di caricamento immagini
(`'Errore caricamento immagine:'` in `CourseCard`), avvisi sul parsing dei manifest HLS.

L'uso di emoji nei log (`🔄`, `✅`, `❌`, `📹`, `🔑`) rende leggibile l'output in sviluppo, ma è un
segnale ulteriore che questi log erano pensati per il debug locale.

Azione consigliata: rimuovere i log di credenziali, e racchiudere i restanti in
`if (__DEV__) { ... }` o passare da un wrapper di logging centralizzato che si disattivi in
produzione.

---

## 14.9 Riepilogo

Quello che funziona:

- Un traduttore centrale usato in modo consistente in 26 punti, con copertura completa degli status
  HTTP rilevanti
- Rilevamento robusto degli errori di rete su tre piattaforme
- Il filtro `< 500` caratteri e `isGenericAxiosMessage` impediscono la fuga di messaggi tecnici
- La gerarchia banner / empty state, che non distrugge i dati già caricati
- Percorsi di supporto WhatsApp contestuali, presenti solo dove serve
- Convenzione uniforme `"Impossibile <verbo> <oggetto>"` per i contesti

Da migliorare, in ordine di priorità:

1. **Rendere l'`ErrorBoundary` presentabile**: messaggio generico, pulsante di ripristino, supporto.
2. **Aggiungere crash reporting.** Oggi un crash in produzione è invisibile.
3. **Rimuovere i log di credenziali** e condizionare il resto a `__DEV__`.
4. **Concordare codici di errore stabili con il backend**, sostituendo i match su stringhe italiane
   (`fatturaPdfUserMessage`, `humanizeBackendErrorText`).
5. **Uniformare i canali**: scegliere fra `Alert.alert` nativo e modale custom per conferme e
   validazioni.
6. **Correggere il typo `"non iesco"`** nel messaggio WhatsApp delle sessioni.
7. **Distinguere offline da errore server** integrando NetInfo (vedi
   [13](./13-stato-cache-e-storage.md)).
