# 08 — Modulo Sessioni posturali e Fitness

Due moduli con architettura quasi identica. **Sessioni posturali è attivo** e montato nella tab bar;
**Fitness è codice completo ma non raggiungibile**, sostituito dal primo. Il commento in
`src/screens/fitness/FitnessStack.tsx:11` lo dichiara:

> `"Tenuto nel progetto ma non montato nella tab bar: sostituito da Sessioni posturali."`

| File | Righe | Stato |
|---|---|---|
| `src/screens/sessioni/SessioniStack.tsx` | 48 | Attivo |
| `src/screens/sessioni/types.ts` | 5 | Attivo |
| `src/screens/sessioni/SessioniHomeScreen.tsx` | 316 | Attivo |
| `src/screens/sessioni/SessioniCalendarioScreen.tsx` | 740 | Attivo |
| `src/screens/sessioni/SessioniPrenotazioniScreen.tsx` | 553 | Attivo |
| `src/screens/fitness/FitnessStack.tsx` | 49 | Non montato |
| `src/screens/fitness/types.ts` | 5 | Non montato |
| `src/screens/FitnessScreen.tsx` | 323 | Non montato |
| `src/screens/fitness/FitnessSessionsCalendarScreen.tsx` | 713 | Non montato |
| `src/screens/fitness/FitnessBookingsScreen.tsx` | 548 | Non montato |

**Nota trasversale importante**: nessuna schermata di questi due moduli usa React Query. Tutti i dati
sono gestiti con `useState` + `useCallback` + `useFocusEffect` e chiamate dirette ai servizi.

---

## 8.1 Il concetto di dominio: prenotazione per tipo, non per orario

È il punto più importante da capire per non fraintendere il codice.

Il backend distingue due entità:

- **Sessione** (`SessionePosturaleDto`): il *tipo* di sessione. Ha nome, descrizione, durata, tag,
  capienza massima e immagine di copertina. `id` = `sessioneId`.
- **Occorrenza in calendario** (`CalendarioSessionePosturaleDto`): una specifica data/ora in cui quel
  tipo di sessione si svolge, con l'istruttore assegnato. Ha un proprio `id` **e** un riferimento a
  `sessioneId`.

**La prenotazione avviene sul `sessioneId`**, cioè sul tipo, non sull'occorrenza. Il payload è
`{ sessioneId }`. La UI lo comunica esplicitamente nel modal di conferma:

> `"La prenotazione vale per questo tipo di sessione, non solo per l'orario scelto."`

Conseguenze concrete:

1. Prenotando la sessione "Ginnastica posturale base" delle 18:00 di lunedì, si risulta prenotati per
   *ogni* occorrenza di quel tipo di sessione, non solo per lunedì alle 18.
2. `PartecipanteSessionePosturaleDto` non contiene data né ora — non ne ha bisogno.
3. `SessioniPrenotazioniScreen`, per mostrare un orario, deve incrociare `sessioneId` con il
   calendario completo e prendere la **prima occorrenza** trovata.
4. Nel calendario, il pulsante mostra `"Prenotato"` su **tutte** le occorrenze del tipo prenotato,
   non solo su quella selezionata.

Il modello riflette probabilmente un abbonamento a un corso ricorrente più che una prenotazione
puntuale.

---

## 8.2 `SessioniStack` e `SessioniHomeScreen`

### Stack

`initialRouteName: "SessioniHome"`.

| Route | Componente | Header |
|---|---|---|
| `SessioniHome` | `SessioniHomeScreen` | `headerShown: false` |
| `SessioniPrenotazioni` | `SessioniPrenotazioniScreen` | `'Prenotazioni attive'` |
| `SessioniCalendario` | `SessioniCalendarioScreen` | `'Calendario sessioni'` |

### `SessioniHomeScreen` — stato

| Variabile | Tipo | Iniziale |
|---|---|---|
| `mySessionIds` | `Set<number>` | `new Set()` |
| `loading` | `boolean` | `false` |
| `error` | `string \| null` | `null` |

`bookingLabel` (`useMemo`): `` `${mySessionIds.size}` `` — il contatore mostrato sulla card.

`loadMyBookings` (`useCallback`) chiama `fetchPartecipazioniSessioniPosturali()` e costruisce il `Set`
dai `sessioneId`. Invocato da `useFocusEffect`, quindi **ad ogni focus della schermata**.

**Nessun filtro per `utenteId`**: l'API restituisce già solo le partecipazioni dell'utente
autenticato, derivate dal token. Questa è la differenza principale rispetto al modulo Fitness.

### UI

`SafeAreaView` con `edges={['top','bottom']}`, `paddingBottom: 30 + tabBarPad`.

- **Hero**: titolo `"Sessioni posturali"` (`fontSize: 26`, `fontWeight: '800'`), sottotitolo
  `"Gestisci le tue prenotazioni e consulta il calendario delle sessioni in presenza."`
- **Badge**: `"Area sessioni"` + `SpineIcon size={15}`
- **Divider**: `SpineIcon size={16}`

**Card 1 — prenotazioni**:
- `accessibilityLabel`: `"Apri pagina prenotazioni attive alle sessioni posturali"`
- Titolo: `"Le tue prenotazioni attive"`
- Sottotitolo: `"Tocca qui per vedere e annullare le tue prenotazioni attive."`
- Contatore `bookingLabel` (`fontSize: 18`)
- Icone: `list-circle` 22, `chevron-forward` 20
- → `navigate('SessioniPrenotazioni')`

**Card 2 — calendario**:
- `accessibilityLabel`: `"Apri calendario sessioni posturali"`
- Titolo: `"Calendario sessioni"`
- Sottotitolo: `"Tocca qui per vedere gli orari in presenza e prenotare una sessione."`
- Icone: `calendar-clear-outline` 22, `chevron-forward` 20
- → `navigate('SessioniCalendario')`

**Stato di errore**: icona `alert-circle-outline` 20, testo dell'errore e
`StudioWhatsAppSupportButton` con messaggio:

```typescript
const SESSIONI_ERROR_WHATSAPP =
  "Buongiorno, utilizzo l'app Mobilitas Academy e non iesco a caricare le prenotazioni / il calendario delle sessioni posturali. Potete aiutarmi? Grazie.";
```

*(nel sorgente compare `"non iesco"` invece di `"non riesco"`: errore di battitura in un messaggio
inviato alla segreteria via WhatsApp)*

Parametri di `getUserFacingApiErrorMessage`:
- `context`: `'Impossibile caricare le prenotazioni'`
- `fallback`: `'Non siamo riusciti a sincronizzare le tue prenotazioni. Controlla la connessione e riprova.'`

---

## 8.3 `SessioniCalendarioScreen` — calendario e prenotazione

740 righe. La schermata funzionalmente più ricca del modulo.

### Funzioni helper locali

```typescript
function toHour(time: string): string        // time.slice(0, 5)  → "18:00:00" → "18:00"
function toIsoDate(value: Date): string      // "YYYY-MM-DD" da componenti LOCALI
function parseIsoDate(isoDate: string): Date // new Date(year, month-1, day) → LOCALE
function startOfMonth(value: Date): Date
```

Tutte lavorano in **fuso orario locale del dispositivo**, senza alcuna conversione UTC. È coerente:
il backend usa `LocalDate`/`LocalTime` senza offset.

### Stato (13 variabili)

| Variabile | Tipo | Iniziale |
|---|---|---|
| `todayIso` | `string` | `toIsoDate(new Date())` — `useMemo` con deps `[]` |
| `selectedDate` | `string` (ISO) | `todayIso` |
| `visibleMonth` | `Date` | `startOfMonth(new Date())` |
| `calendarRows` | `CalendarioSessionePosturaleDto[]` | `[]` |
| `coverBySessionId` | `Record<number, string \| null>` | `{}` |
| `catalogById` | `Record<number, SessionePosturaleDto>` | `{}` |
| `mySessionIds` | `Set<number>` | `new Set()` |
| `loading` | `boolean` | `false` |
| `bookingSessionId` | `number \| null` | `null` |
| `confirmSession` | `CalendarioSessionePosturaleDto \| null` | `null` |
| `bookedSessionName` | `string \| null` | `null` |
| `error` | `string \| null` | `null` |

**Nota su `todayIso`**: memoizzato con dipendenze vuote, viene calcolato una sola volta al mount.
Se l'app resta aperta oltre la mezzanotte, l'evidenziazione "oggi" nel calendario rimane sul giorno
precedente.

### Costruzione della griglia mensile

```typescript
const monthCells = useMemo(() => {
  // daysInMonth = new Date(year, month + 1, 0).getDate()
  // firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7
  // ...
}, [visibleMonth]);
```

- `(getDay() + 6) % 7` converte l'indice JavaScript (0 = domenica) in **lunedì = 0**, coerente con la
  convenzione italiana.
- Le celle iniziali vuote sono `firstWeekday` con `iso: null`.
- I giorni 1..N generano l'ISO via `toIsoDate(new Date(year, month, day))`.
- La griglia viene riempita alla fine fino a un multiplo di 7.

Header dei giorni: `['L', 'M', 'M', 'G', 'V', 'S', 'D']`.

Navigazione mese: `goMonth(delta)` → `startOfMonth(new Date(prev.getFullYear(), prev.getMonth() + delta, 1))`.

**Comportamento da conoscere**: cambiare mese **non** cambia `selectedDate`. Si può quindi navigare a
settembre mentre il titolo sotto il calendario e la lista sessioni continuano a riferirsi al giorno
selezionato in agosto, finché non si tocca un giorno del nuovo mese.

### Caricamento dati

`loadCalendar` (`useCallback`) esegue in parallelo:

```typescript
fetchCalendarioSessioniPosturali({ data: selectedDate })   // occorrenze del giorno
fetchPartecipazioniSessioniPosturali()                      // prenotazioni dell'utente
fetchSessioniPosturali().catch(() => [])                    // catalogo (fallback array vuoto)
```

Il terzo con `.catch(() => [])`: un errore sul catalogo non compromette il caricamento del
calendario, si perdono solo tag, durata e copertina di fallback.

Trigger: `useFocusEffect` (che chiama anche `prefetchSessioniPosturaliCatalog()`) e ogni cambio di
`selectedDate`.

### Integrazione con la cache di catalogo

Un `useEffect` si iscrive alla cache in-memory:

```typescript
subscribeSessioniPosturaliCatalog(() => {
  setCoverBySessionId(getSessioniPosturaliCoversRecord());
  setCatalogById(/* da getSessioniPosturaliCatalog() */);
});
```

Al mount legge subito lo stato corrente, poi reagisce agli aggiornamenti. `syncCatalogState` applica
anche il catalogo appena scaricato con `applySessioniPosturaliCatalog(sessioni)`.

Il risultato è che le copertine appaiono immediatamente se il prefetch (lanciato da `AuthContext` al
login o all'avvio) le ha già caricate.

### Risoluzione della copertina

```typescript
pickCoverImageUrl(row.sessioneImmagineCopertinaUrl, coverBySessionId[row.sessioneId])
```

Priorità: prima l'URL fornito dalla riga di calendario, poi quello dal catalogo. `SESSION_COVER_HEIGHT = 184`.

### UI — lista sessioni

Per ogni occorrenza:

| Elemento | Contenuto |
|---|---|
| Copertina | `Image` altezza `184`, se l'URL è disponibile |
| Titolo | `row.sessioneNome` |
| Orario | `"{toHour(oraInizio)} - {toHour(oraFine)}"` |
| Descrizione | `row.sessioneDescrizione?.trim()` con fallback `'Descrizione sessione non disponibile.'` |
| Istruttore | `"Istruttore: {row.istruttoreNomeCompleto}"` (condizionale) |
| Durata | `"Durata: {catalog.durata} min"` (condizionale, dal catalogo) |
| Tag | Chip da `parseSessionePosturaleTags(catalog?.tags)` — split su `';'` |
| Pulsante | Vedi sotto |

Pulsante di prenotazione:

- Già prenotato (`mySessionIds.has(row.sessioneId)`): icona `checkmark-circle`, testo `"Prenotato"`,
  `disabled`, stile disabilitato
- Altrimenti: icona `add-circle-outline`, testo `"Prenota sessione"`
- Durante la prenotazione: `ActivityIndicator size="small"`

**Empty state**: icona `calendar-outline` e testo
`"Nessuna sessione disponibile per la data selezionata."`

**Errore**: messaggio più `StudioWhatsAppSupportButton` con:

```typescript
const SESSIONI_CALENDAR_WHATSAPP =
  "Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a usare il calendario delle sessioni posturali. Potete aiutarmi? Grazie.";
```

Contesto errore: `'Impossibile caricare il calendario sessioni'`,
fallback: `'Non siamo riusciti a caricare le sessioni. Controlla la connessione e riprova.'`

### Formattazione delle date in UI

| Elemento | Formattazione |
|---|---|
| Titolo giorno selezionato | `Intl.DateTimeFormat('it-IT', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })` + `textTransform: 'capitalize'` |
| Etichetta mese | `Intl.DateTimeFormat('it-IT', { month: 'long', year: 'numeric' })` |

### I due modal

**Conferma prenotazione**:
- Titolo: `"Conferma prenotazione"`
- Testo: `Vuoi prenotare la sessione "{nome}" delle {ora}? La prenotazione vale per questo tipo di sessione, non solo per l'orario scelto.`
- Fallback ora: `'--:--'`
- Pulsanti: `"Annulla"` e `"Conferma"` (con spinner durante l'operazione)

**Successo**:
- Titolo: `"Prenotazione confermata"`
- Testo: `Ti sei prenotato a "{bookedSessionName}".`
- Pulsante: `"Perfetto"`

Backdrop dei modal: opacità `0.45`, `borderRadius: 18`, `padding: 18`.

### `onConfirmBook`

1. `setBookingSessionId(row.sessioneId)`
2. `creaPrenotazioneSessionePosturale({ sessioneId: row.sessioneId })`
3. Successo: `loadCalendar()` per rinfrescare, `setBookedSessionName(...)`, chiude il modal di
   conferma e apre quello di successo.
4. Errore: `Alert.alert('Prenotazione non riuscita', ...)` con fallback
   `'Riprova più tardi o contatta la segreteria.'`

### Flusso completo di prenotazione

1. `SessioniHome` → card calendario → `SessioniCalendario`.
2. Al focus: `prefetchSessioniPosturaliCatalog()` + `loadCalendar()` per `selectedDate` (oggi).
3. L'utente naviga i mesi con le frecce e tocca un giorno → `setSelectedDate` → ricaricamento.
4. Se non ci sono occorrenze: empty state.
5. Tap su `"Prenota sessione"` → `setConfirmSession(row)`.
6. Il modal spiega la semantica "per tipo di sessione"; tap su `"Conferma"`.
7. `POST /sessioni-posturali/partecipanti` con `{ sessioneId }`.
8. Successo: ricaricamento + modal `"Prenotazione confermata"` → `"Perfetto"`.
9. Da quel momento **tutte** le occorrenze di quel tipo mostrano `"Prenotato"`.

L'annullamento non è possibile da questa schermata: si fa in `SessioniPrenotazioniScreen`.

### Cosa manca nella UI

- **Capienza / posti disponibili**: `numeroMassimoPartecipanti` esiste nel DTO ma non viene né
  mostrato né verificato. Una sessione piena produce un errore generico dal backend nell'alert
  `'Prenotazione non riuscita'`.
- **Filtro sessioni passate**: la UI non filtra le occorrenze già trascorse. Selezionando una data
  passata si vedono le sessioni con il pulsante `"Prenota sessione"` attivo.
- **Indicatore dei giorni con sessioni**: le celle del calendario non distinguono i giorni che
  contengono occorrenze da quelli vuoti; bisogna toccare ogni giorno per scoprirlo.

---

## 8.4 `SessioniPrenotazioniScreen` — gestione prenotazioni

### Stato

| Variabile | Tipo | Iniziale |
|---|---|---|
| `bookings` | `PartecipanteSessionePosturaleDto[]` | `[]` |
| `sessionDetailsBySessionId` | `Record<number, CalendarioSessionePosturaleDto>` | `{}` |
| `loading` | `boolean` | `false` |
| `error` | `string \| null` | `null` |
| `cancelingId` | `number \| null` | `null` |
| `cancelledSessionName` | `string \| null` | `null` |
| `confirmCancelBooking` | `PartecipanteSessionePosturaleDto \| null` | `null` |

### Caricamento

```typescript
fetchPartecipazioniSessioniPosturali()      // le mie prenotazioni
fetchCalendarioSessioniPosturali()           // calendario COMPLETO, senza filtri
```

La seconda chiamata è **senza parametri**: scarica l'intero calendario. Serve solo a trovare un
orario da mostrare per ogni prenotazione. Costruzione della mappa:

```typescript
// per ogni row del calendario, se detailsMap[row.sessioneId] è nullo, assegna quella row
```

Prende quindi la **prima occorrenza** incontrata per ciascun `sessioneId`. Poiché il servizio ordina
per `data` poi `oraInizio`, questa è cronologicamente la prima in assoluto del calendario — **non
necessariamente la prossima futura**. La label dice però `"Prossimo orario:"`, che può risultare
inesatta se il calendario contiene occorrenze passate.

### UI

- **Hero**: titolo `"Le tue prenotazioni"`, sottotitolo
  `"Qui trovi le sessioni posturali che hai prenotato. La prenotazione vale per il tipo di sessione, non per un singolo orario."`
- **Badge**: `"Prenotazioni sessioni"` + `checkmark-done-outline` 14
- **Divider**: `SpineIcon size={16}`
- **Empty**: `"Nessuna prenotazione attiva al momento."`
- **Errore fallback**: `"Non siamo riusciti a caricare l'elenco. Controlla la connessione e riprova."`

WhatsApp di supporto:

```typescript
const SESSIONI_PRENOTAZIONI_WHATSAPP =
  "Buongiorno, utilizzo l'app Mobilitas Academy e ho problemi con le prenotazioni alle sessioni posturali. Potete aiutarmi? Grazie.";
```

**Card per prenotazione**:

| Elemento | Contenuto |
|---|---|
| Titolo | `item.sessioneNome` |
| Badge | `"Attiva"` (`fontSize: 11`) |
| Orario | `"Prossimo orario: {toHour(oraInizio)} - {toHour(oraFine)}"` se i dettagli esistono |
| Istruttore | `"Istruttore: {nome}"` (condizionale) |
| Senza dettagli | `"Nessuna occorrenza in calendario al momento."` |
| Descrizione | `details?.sessioneDescrizione?.trim()` con fallback `'Descrizione sessione non disponibile.'` |
| Pulsante | `"Annulla"` + icona `close-circle-outline` |

### Annullamento

**Modal di conferma**:
- Titolo: `"Conferma annullamento"`
- Testo: `Vuoi annullare la prenotazione per "{sessioneNome}"?`
- Pulsanti: `"Mantieni prenotazione"` e `"Annulla prenotazione"`

Le etichette sono esplicite anziché generiche (`"Annulla"` / `"OK"`), scelta corretta in un dialogo
il cui verbo principale è già "annullare".

**Modal di successo**:
- Titolo: `"Annullamento confermato"`
- Testo: `Hai annullato con successo la prenotazione per "{cancelledSessionName}".`
- Pulsante: `"Perfetto"`

Chiamata: `eliminaPrenotazioneSessionePosturale(item.id)` — nota che si usa l'**ID della
partecipazione**, non `sessioneId`.

Errore: gestito con `setError(...)` inline nella card, non con `Alert`. Contesto
`'Impossibile annullare la prenotazione'`, fallback `'Riprova tra poco o contatta la segreteria.'`

Durante l'operazione: spinner sul pulsante quando `cancelingId === item.id`.

### Ordinamento

Nessun sort locale: si usa l'ordine restituito da `fetchPartecipazioniSessioniPosturali()`.

---

## 8.5 Il modulo Fitness (non raggiungibile)

Struttura speculare. Documentato per riferimento in caso di riattivazione o rimozione.

### `FitnessStack`

`initialRouteName: "FitnessCalendar"`.

| Route | Componente | Header |
|---|---|---|
| `FitnessCalendar` | `FitnessScreen` | `headerShown: false` |
| `FitnessBookings` | `FitnessBookingsScreen` | `'Prenotazioni attive'` |
| `FitnessSessionsCalendar` | `FitnessSessionsCalendarScreen` | `'Calendario Fitness'` |

### `FitnessScreen` — hub

- Titolo: `"Calendario Fitness"`
- Sottotitolo: `"Gestisci le tue prenotazioni e consulta le sessioni disponibili."`
- Badge: `"Area fitness"` + `barbell-outline` 14
- Card prenotazioni: `"Le tue prenotazioni attive"` /
  `"Tocca qui per vedere e annullare le tue prenotazioni attive."`
- Card calendario: `"Calendario Fitness"` /
  `"Tocca qui per vedere l'elenco completo delle sessioni disponibili e prenotare."`

Filtra le prenotazioni con `item.utenteId === utenteId` prima di contarle; se `utenteId` è assente il
`Set` resta vuoto.

WhatsApp: `"Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare le prenotazioni fitness / il calendario. Potete aiutarmi? Grazie."`

### `FitnessSessionsCalendarScreen`

Identico a `SessioniCalendarioScreen` nella struttura del calendario (griglia lunedì-first, stessi
helper, stesso `SESSION_COVER_HEIGHT = 184`), con quattro differenze:

1. **Usa `utenteId` da `useAuth()`** per filtrare le prenotazioni:
   ```typescript
   const mine = bookings.filter((item) => item.utenteId === utenteId).map((item) => item.sessioneId);
   ```
2. **Payload di prenotazione**: `{ utenteId, sessioneId }` invece di `{ sessioneId }`.
3. **Guard su `utenteId`**: se assente, `Alert.alert('Utente non disponibile', 'Impossibile prenotare: utente non identificato.')` e uscita anticipata.
4. **Card più povera**: non mostra istruttore, durata né tag (non c'è `catalogById`).
5. **Modal di conferma senza avviso**: `Vuoi prenotare la sessione "{nome}" delle {ora}?` — manca la
   frase sul "tipo di sessione", anche se la semantica lato backend è la stessa.

### `FitnessBookingsScreen`

Come `SessioniPrenotazioniScreen`, con:

- Filtro `all.filter((row) => row.utenteId === utenteId)`.
- **Uscita anticipata senza `utenteId`**: `setBookings([])` e
  `setError('ID utente non disponibile nella sessione corrente')` — messaggio **hardcoded**, non
  passato da `getUserFacingApiErrorMessage`. La funzione ritorna prima di `setLoading(true)`.
- Label orario: `"Orario: {HH:MM - HH:MM}"` oppure `"Orario: non disponibile"` — usa `.slice(0,5)`
  inline anziché l'helper `toHour`.
- Nessun blocco istruttore.
- Sottotitolo: `"In questa sezione puoi gestire le tue prenotazioni fitness attive, controllarle rapidamente e annullarle quando necessario."`
- Badge: `"Prenotazioni fitness"`, divider `barbell-outline` 14.

---

## 8.6 Confronto sistematico Posturali vs Fitness

| Aspetto | Sessioni posturali | Fitness |
|---|---|---|
| Montato in tab bar | **Sì** | No |
| Uso di `useAuth().utenteId` | No | Sì |
| Filtro prenotazioni | Nessuno (scoping server-side) | `utenteId === utenteId` client-side |
| Payload prenotazione | `{ sessioneId }` | `{ utenteId, sessioneId }` |
| Funzione di annullamento | `eliminaPrenotazioneSessionePosturale(id)` | `annullaPrenotazioneSessioneFitness(id)` |
| Modal conferma | Include l'avviso "vale per tipo di sessione" | Solo nome e ora |
| Dettagli card calendario | Istruttore, durata, tag | Solo nome, ora, descrizione |
| Cache catalogo in-memory | `sessioniPosturaliCatalogPrefetch` + `sessionById` | `fitnessCatalogPrefetch` |
| Prefetch al login | Sì (da `AuthContext`) | No |
| Clear cache al logout | Sì | No |
| Icona identificativa | `SpineIcon` (custom) | `barbell-outline` (Ionicons) |
| React Query | Assente | Assente |
| Capienza in UI | Non mostrata | Non mostrata |
| Filtro sessioni passate | Assente | Assente |
| Ordinamento calendario | Service: `data` poi `oraInizio` | Idem |
| Fuso orario | Locale dispositivo, nessuna conversione UTC | Idem |
| Griglia calendario | Lunedì-first via `(getDay()+6)%7` | Identica |
| Risoluzione copertina | `pickCoverImageUrl(calendarUrl, catalogUrl)` | Identica |
| Parsing tag | `parseSessionePosturaleTags` (split `';'`) | Non usato in UI |

Il modello posturale è **architetturalmente più corretto**: delegare al backend lo scoping delle
prenotazioni tramite token evita che il client possa (accidentalmente o intenzionalmente) leggere
prenotazioni di altri utenti. Il modello fitness scarica tutte le partecipazioni e filtra localmente,
il che significa che l'API restituisce dati di altri utenti al client.

---

## 8.7 `useTabBarBottomPadding`

Hook usato da tutte le schermate di entrambi i moduli:

```typescript
const SCROLL_CLEARANCE_ABOVE_TAB = 12;

export function useTabBarBottomPadding(): number {
  return useBottomTabBarHeight() + SCROLL_CLEARANCE_ABOVE_TAB;
}
```

Tutte le schermate di questi due moduli usano `paddingBottom: 30 + tabBarPad`.

---

## 8.8 Osservazioni sul modulo

1. **Assenza di React Query**: le tre schermate posturali ricaricano tutto ad ogni focus. Nel
   passaggio Home → Calendario → indietro → Prenotazioni si effettuano ricariche complete ridondanti.
   Migrare a React Query con chiavi condivise (`['sessioni-partecipazioni']`,
   `['sessioni-calendario', data]`) eliminerebbe il problema e permetterebbe l'invalidazione dopo una
   prenotazione, rendendo superfluo il refresh al focus.

2. **`fetchCalendarioSessioniPosturali()` senza parametri** in `SessioniPrenotazioniScreen` scarica
   l'intero calendario per estrarre un orario per prenotazione. Con il crescere delle occorrenze il
   payload diventa sproporzionato. Sarebbe preferibile che
   `PartecipanteSessionePosturaleDto` includesse la prossima occorrenza, o usare
   `fetchCalendarioSessioniPosturali({ sessioneId })` per ciascuna prenotazione.

3. **`"Prossimo orario"` non è garantito futuro**: la mappa prende la prima occorrenza del calendario
   completo, che può essere passata.

4. **`todayIso` congelato al mount**: l'evidenziazione "oggi" nel calendario non si aggiorna oltre la
   mezzanotte.

5. **Cambio mese non aggiorna la selezione**: si può navigare in un mese diverso da quello del giorno
   selezionato, con lista e titolo che restano sul giorno precedente. Un allineamento automatico al
   primo giorno del mese visibile sarebbe più intuitivo.

6. **Capienza non esposta**: `numeroMassimoPartecipanti` è disponibile ma inutilizzato. Mostrare
   "3 posti su 12 disponibili" richiederebbe però anche il conteggio corrente dei partecipanti, che
   l'API non fornisce.

7. **Sessioni passate prenotabili nella UI**: non c'è filtro sulle date trascorse.

8. **Il modulo Fitness è debito puro**: 1633 righe che duplicano logica, mantengono servizi e DTO
   attivi e allargano la superficie del bundle senza alcun valore funzionale. La decisione da prendere
   è se rimuoverlo o riattivarlo; mantenerlo in questo stato costa manutenzione a ogni refactor del
   modulo posturale.
