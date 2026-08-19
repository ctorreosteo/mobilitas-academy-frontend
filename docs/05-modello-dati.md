# 05 — Modello dati completo

Questo documento elenca **tutti** i tipi TypeScript definiti nell'app: DTO del backend, modelli UI,
tipi di navigazione e tipi di supporto.

Convenzione: i DTO ricalcano i nomi Java del backend e sono quindi **in italiano**
(`titolo`, `descrizione`, `ordine`, `attivo`, `dataAggiunta`). I modelli UI in
`src/types/index.ts` sono invece **in inglese** (`title`, `description`, `order`). La traduzione
avviene nei mapper (`mapCorsoToCourse.ts`, `courseContent.ts`).

---

## 5.1 Envelope e paginazione

### `ApiResponseDto<T>` — `src/services/formazioneService.ts:3-8`

```typescript
interface ApiResponseDto<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | null;
}
```

Reimportato da tutti gli altri servizi. `src/api/index.ts` ne mantiene una copia locale chiamata
`ApiEnvelope<T>` con gli stessi campi.

### `SpringPageDto<T>` — `src/services/pazientiService.ts:7-13`

```typescript
interface SpringPageDto<T> {
  content: T[];
  totalElements?: number;
  totalPages?: number;
  size?: number;
  number?: number;   // indice pagina (0-based)
}
```

Usata solo da `searchPazientiAdvanced`. Gli altri endpoint restituiscono array diretti, anche se i
normalizzatori accettano difensivamente la forma paginata.

---

## 5.2 Autenticazione

### `LoginRequestBody` — `src/services/authApi.ts:15-18`

```typescript
interface LoginRequestBody {
  username: string;   // accetta anche l'email
  password: string;
}
```

### `LoginResponseData` — `src/services/authApi.ts:20-28`

```typescript
interface LoginResponseData {
  token: string;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  pazienteId?: number | null;
}
```

Non contiene `osteopataId` né `utenteId`: per questo `signIn` chiama subito `/auth/me`.

### `UserInfoResponseDto` — `src/services/authApi.ts:30-40`

```typescript
interface UserInfoResponseDto {
  id: number;              // → StoredUserProfile.utenteId
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  attivo: boolean;
  osteopataId?: number | null;
  pazienteId?: number | null;
}
```

### `RefreshPayload` — `src/api/index.ts:50-58`

```typescript
interface RefreshPayload {
  token: string;
  username?: string;
  nome?: string;
  cognome?: string;
  email?: string;
  ruoli?: string[];
  pazienteId?: number | null;
}
```

### `StoredUserProfile` — `src/services/authTokenStorage.ts:59-76`

Il modello di sessione persistito in `@mobilitas_user_profile`.

```typescript
interface StoredUserProfile {
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  utenteId?: number;
  attivo?: boolean;
  osteopataId?: number | null;
  osteopata?: StoredOsteopataProfile | null;
  pazienteId?: number | null;
  paziente?: StoredPazienteProfile | null;
}
```

**I tre identificatori sono distinti e non intercambiabili**:

| Campo | Significato | Usato per |
|---|---|---|
| `utenteId` | ID dell'account applicativo | Prenotazioni fitness (`{ utenteId, sessioneId }`), `GET /pazienti/by-utente/{utenteId}` |
| `pazienteId` | ID della cartella paziente | `/visite/by-paziente/{id}`, `/pagamenti/paziente/{id}`, `/acquisti/paziente/{id}` |
| `osteopataId` | ID dell'operatore | `/calendario/completo?osteopataId=`, `/osteopati/{id}`, discriminante di ruolo operativo |

### `StoredOsteopataProfile` — `src/services/authTokenStorage.ts:28-39`

```typescript
interface StoredOsteopataProfile {
  id: number;
  nome: string;
  cognome: string;
  email?: string | null;
  telefono?: string | null;
  immagineProfiloUrl?: string | null;
  colore?: string | null;
  isTirocinante?: boolean;
  genere?: string | null;
  specializzazioni?: string | null;
}
```

### `StoredPazienteProfile` — `src/services/authTokenStorage.ts:42-56`

```typescript
interface StoredPazienteProfile {
  id: number;
  nome?: string | null;
  cognome?: string | null;
  prefissoCellulare?: string | null;
  cellulare?: string | null;
  email?: string | null;
  dataNascita?: string | null;
  eta?: number | null;
  cittaNascita?: string | null;
  codiceFiscale?: string | null;
  linkWhatsapp?: string | null;
  genere?: string | null;
  note?: string | null;
}
```

**Nota privacy**: `codiceFiscale`, `dataNascita`, `cellulare` e `note` vengono persistiti in chiaro
su AsyncStorage. Sono dati personali e potenzialmente sanitari (`note`) archiviati senza cifratura.
Nessuno di questi campi viene mostrato nella UI: `ProfileScreen` visualizza soltanto nome, cognome,
username, email e ruoli. La persistenza è quindi superflua rispetto all'uso effettivo.

### `SignInOptions` — `src/context/AuthContext.tsx:29-32`

```typescript
type SignInOptions = {
  /** Se true, salva solo username/email in locale (mai la password). */
  rememberUsername?: boolean;
};
```

---

## 5.3 Studi, osteopati, disponibilità

### `StudioDto` — `src/services/studioVisitsService.ts:20-32`

```typescript
interface StudioDto {
  id: number;
  nome: string;
  indirizzo?: string | null;
  citta?: string | null;
  cap?: string | null;
  telefono?: string | null;
  email?: string | null;
  orariApertura?: unknown[] | null;
  note?: string | null;
  attivo?: boolean;
  googleReviewLink?: string | null;
}
```

`googleReviewLink` alimenta la funzione recensioni in `ProfileScreen`. `orariApertura` è tipizzato
`unknown[]` perché la struttura non è consumata dal client.

### `OsteopataDto` — `src/services/studioVisitsService.ts:34-46`

```typescript
interface OsteopataDto {
  id: number;
  nome: string;
  cognome: string;
  email?: string | null;
  telefono?: string | null;
  immagineProfiloUrl?: string | null;
  colore?: string | null;
  isTirocinante?: boolean;
  genere?: string | null;
  specializzazioni?: string | null;
  utente?: unknown;
}
```

### `StanzaDto` — `src/services/studioVisitsService.ts:49-55`

```typescript
interface StanzaDto {
  id: number;
  nome: string;
  numero?: string | null;
  note?: string | null;
  attivo?: boolean;
}
```

### `SlotDisponibilitaBackendDto` — `src/services/studioVisitsService.ts:58-64`

Forma restituita dal backend, con data e ore separate.

```typescript
interface SlotDisponibilitaBackendDto {
  data: string;         // "YYYY-MM-DD"
  oraInizio: string;    // "HH:mm" o "HH:mm:ss"
  oraFine: string;
  stanza?: StanzaDto | null;
  status?: string | null;
}
```

### `DisponibilitaCalcolataDto` — `src/services/studioVisitsService.ts:67-73`

```typescript
interface DisponibilitaCalcolataDto {
  osteopataId: number;
  osteopataNome?: string | null;
  osteopataCognome?: string | null;
  slotDisponibili: SlotDisponibilitaBackendDto[];
  status?: string | null;
}
```

### `SlotDisponibilitaDto` — `src/services/studioVisitsService.ts:76-81`

Forma normalizzata usata dall'app: istanti ISO assoluti.

```typescript
interface SlotDisponibilitaDto {
  inizio: string;       // ISO UTC
  fine: string;         // ISO UTC
  stanza?: StanzaDto | null;
  status?: string | null;
}
```

La conversione avviene in `slotBackendToApp`.

### `PrenotazioneVisitaDto` — `src/services/studioVisitsService.ts:125-135`

```typescript
interface PrenotazioneVisitaDto {
  id: number;
  osteopataId: number;
  studioId: number;
  inizio: string;
  fine?: string | null;
  stato?: string | null;
  osteopataNome?: string | null;
  osteopataCognome?: string | null;
  studioNome?: string | null;
}
```

Usato solo dalle funzioni non invocate dalla UI.

---

## 5.4 Visite e calendario

### `VisitaSortOrder` e `VisitaStatus`

```typescript
type VisitaSortOrder = 'ASC' | 'DESC';

type VisitaStatus =
  | 'PRENOTATA'
  | 'EFFETTUATA'
  | 'NO_SHOW_CONTA'
  | 'NO_SHOW_NON_CONTA'
  | 'DISDETTA';
```

`visitaStatusLabel` in `visiteFormatting.ts` rimappa due stati per la UI:

| Stato backend | Etichetta mostrata |
|---|---|
| `NO_SHOW_NON_CONTA` | `'DISDETTA'` |
| `NO_SHOW_CONTA` | `'EFFETTUATA'` |
| altri | invariato |

Semantica: un no-show che "conta" viene addebitato al pacchetto come se la visita fosse avvenuta,
quindi il paziente lo vede come `EFFETTUATA`; un no-show che "non conta" non viene addebitato e
appare come `DISDETTA`. La distinzione interna resta invisibile all'utente.

### `VisitaMinimaleDto` — `src/services/visiteService.ts:20-32`

```typescript
interface VisitaMinimaleDto {
  id: number;
  dataVisita: string;                    // "YYYY-MM-DD"
  oraInizio?: string | null;             // "HH:mm:ss"
  pazienteNome?: string | null;
  pazienteCognome?: string | null;
  osteopataNome?: string | null;
  osteopataCognome?: string | null;
  statusVisita?: string | null;
  statusPagamento?: string | null;
  siglaVisita?: string | null;
  prezzoVisita?: number | null;
}
```

### `CalendarioItemTipo` e `TipoEventoCalendario`

```typescript
type CalendarioItemTipo = 'VISITA' | 'EVENTO' | 'NON_REPERIBILITA';

type TipoEventoCalendario =
  | 'FORMAZIONE_INDIVIDUALE' | 'FORMAZIONE_TEAM'
  | 'RIUNIONE' | 'RIUNIONE_INDIVIDUALE' | 'RIUNIONE_TEAM'
  | 'SHOOTING_CONTENUTI' | 'SHOOTING_VISITA' | 'SHOOTING_PODCAST'
  | 'GPADEL' | 'CHIUSURA_STUDIO' | 'PAUSA_PRANZO'
  | 'TIROCINIO' | 'CORSO_FORMAZIONE' | 'COLLOQUIO' | 'ALTRO';
```

Mappa etichette in `visiteFormatting.ts:181-197`:

| Chiave | Etichetta |
|---|---|
| `FORMAZIONE_INDIVIDUALE` | `'Formazione Individuale'` |
| `FORMAZIONE_TEAM` | `'Formazione Team'` |
| `RIUNIONE` | `'Riunione'` |
| `RIUNIONE_INDIVIDUALE` | `'Riunione Individuale'` |
| `RIUNIONE_TEAM` | `'Riunione Team'` |
| `SHOOTING_CONTENUTI` | `'Shooting Contenuti'` |
| `SHOOTING_VISITA` | `'Shooting Visita'` |
| `SHOOTING_PODCAST` | `'Shooting Podcast'` |
| `GPADEL` | `'GPADEL'` |
| `CHIUSURA_STUDIO` | `'Chiusura Studio'` |
| `PAUSA_PRANZO` | `'Pausa Pranzo'` |
| `TIROCINIO` | `'Tirocinio'` |
| `CORSO_FORMAZIONE` | `'Corso Formazione'` |
| `COLLOQUIO` | `'Colloquio'` |
| `ALTRO` | `'Altro'` |

Fallback: `'Evento'` se `tipoEvento` è nullo; altrimenti il valore raw.

### `CalendarioNomeRef` (interno) — `src/services/visiteService.ts:54-58`

```typescript
interface CalendarioNomeRef {
  id?: number;
  nome?: string | null;
  cognome?: string | null;
}
```

### `CalendarioItemBase` (interno) — `src/services/visiteService.ts:60-78`

```typescript
interface CalendarioItemBase {
  tipo: CalendarioItemTipo;
  id: number;
  dataInizio?: string;        // locale Europe/Rome, es. "2026-08-18T09:00:00"
  dataFine?: string;
  dataVisita?: string;
  oraInizio?: string;
  oraFine?: string;
  osteopataNome?: string;
  osteopataCognome?: string;
  osteopata?: CalendarioNomeRef | null;
  studioId?: number;
  studioNome?: string;
  studio?: CalendarioNomeRef | null;
  stanzaId?: number;
  stanzaNome?: string;
  stanza?: CalendarioNomeRef | null;
}
```

La ridondanza (`studioId` + `studioNome` + `studio`, `oraInizio` + `dataInizio`) riflette il fatto che
il backend serializza item di natura diversa nello stesso array; i formatter dell'app scelgono per
priorità il campo disponibile.

### Union discriminata degli item di calendario

```typescript
interface CalendarioVisitaItem extends CalendarioItemBase {
  tipo: 'VISITA';
  pazienteNome?: string;
  pazienteCognome?: string;
  paziente?: CalendarioNomeRef | null;
  siglaVisita?: string;
}

interface CalendarioEventoItem extends CalendarioItemBase {
  tipo: 'EVENTO';
  tipoEvento?: TipoEventoCalendario | string;
  titolo?: string;
  descrizione?: string;
  raggruppamentoId?: number;
  invitatoId?: number;        // ID utente
  invitatoNome?: string;
  invitatoCognome?: string;
}

interface CalendarioNonReperibilitaItem extends CalendarioItemBase {
  tipo: 'NON_REPERIBILITA';
  tipoReperibilita?: string;
  motivo?: string;
}

type CalendarioItemDto =
  | CalendarioVisitaItem
  | CalendarioEventoItem
  | CalendarioNonReperibilitaItem;
```

`GestioneVisiteScreen` fa il narrowing su `item.tipo` per scegliere la card di rendering.

### `CalendarioCompletoDto` — `src/services/visiteService.ts:111-118`

```typescript
interface CalendarioCompletoDto {
  items?: CalendarioItemDto[];
  totalVisite?: number;
  totalPagesVisite?: number;
  currentPageVisite?: number;
  totalEventi?: number;
  totalNonReperibilita?: number;
}
```

Il servizio usa solo `items`: i contatori e i campi di paginazione sono ignorati.

### `VisitaIdRefDto` e `CreateVisitaRequestDto`

```typescript
interface VisitaIdRefDto {
  id: number;
}

interface CreateVisitaRequestDto {
  dataVisita: string;                 // "YYYY-MM-DD"
  oraInizio: string;                  // "HH:mm:ss"
  oraFine: string;                    // "HH:mm:ss"
  prezzoVisita?: number | null;
  paziente?: VisitaIdRefDto | null;
  osteopata?: VisitaIdRefDto | null;
  studio?: VisitaIdRefDto | null;
  stanza?: VisitaIdRefDto | null;
  note?: string | null;
  motivoDisdetta?: string | null;
  risorse?: VisitaIdRefDto[];         // serializzato come `risorseUtilizzate` lato backend
  acquistoId?: number | null;
  servizio?: VisitaIdRefDto | null;
  richiestaRecensione?: boolean;
}
```

Il pattern `{ id: number }` per le relazioni riflette la deserializzazione delle entità JPA lato
Spring.

Dei 15 campi, `BookVisitScreen` popola solo: `dataVisita`, `oraInizio`, `oraFine`, `osteopata`,
`studio`, `stanza` (se lo slot ne ha una), `paziente` (se noto), `acquistoId` (se applicabile).

### `VisitaCreataDto`

```typescript
type VisitaCreataDto = VisitaMinimaleDto & { oraFine?: string | null };
```

---

## 5.5 Pazienti

### `PazienteDto` — `src/services/pazientiService.ts:15-29`

```typescript
interface PazienteDto {
  id: number;
  nome?: string | null;
  cognome?: string | null;
  email?: string | null;
  prefissoCellulare?: string | null;
  cellulare?: string | null;
  eta?: number | null;
  dataNascita?: string | null;
  cittaNascita?: string | null;
  codiceFiscale?: string | null;
  linkWhatsapp?: string | null;
  genere?: string | null;
  note?: string | null;
}
```

Nel form di prenotazione (`BookVisitScreen`) la ricerca paziente mostra soltanto
`pazienteLabel(p)` (nome e cognome), `email` ed `eta`. Gli altri campi, incluso `codiceFiscale`,
arrivano al client senza essere visualizzati.

---

## 5.6 Acquisti, servizi, pagamenti

### `AcquistoDto` — `src/services/acquistiService.ts:5-20`

```typescript
interface AcquistoDto {
  id: number;
  pazienteId?: number | null;
  pazienteNome?: string | null;
  pazienteCognome?: string | null;
  servizioId?: number | null;
  servizioNome?: string | null;
  statusPagamento?: string | null;
  statusPagamentoDescrizione?: string | null;
  dataAcquisto?: string | null;
  prenotabile?: boolean | null;
  isPrenotabile?: boolean | null;
  totaleScontato?: number | null;
  totalePagamenti?: number | null;
}
```

`prenotabile` e `isPrenotabile` sono lo **stesso concetto serializzato in due modi** (getter Java
`isPrenotabile()` che Jackson può esporre come `prenotabile` o `isPrenotabile` a seconda della
configurazione). Il codice controlla entrambi.

### `MetodoPagamentoAcquisto` e `CreateAcquistoRequestDto`

```typescript
type MetodoPagamentoAcquisto = 'VOLTA_PER_VOLTA' | 'TUTTO_ANTICIPATO' | 'RATE';

interface CreateAcquistoRequestDto {
  pazienteId: number;
  servizioId: number;
  metodoPagamento?: MetodoPagamentoAcquisto;
  tipoSconto?: 'PERCENTUALE' | 'FISSO' | null;
  sconto?: number | null;
  note?: string | null;
  motivoSconto?: string | null;
  dataAcquisto?: string | null;
  visiteIds?: number[];
}
```

`CreaAcquistoModal` popola: `pazienteId`, `servizioId`, `metodoPagamento`, e opzionalmente
`tipoSconto` + `sconto` e `note`. `motivoSconto`, `dataAcquisto` e `visiteIds` non sono esposti nel
form.

### `ServizioDto` — `src/services/serviziService.ts:4-16`

```typescript
interface ServizioDto {
  id: number;
  nome: string;
  descrizione?: string | null;
  dataInizioValidita?: string | null;
  dataFineValidita?: string | null;
  numeroVisite?: number | null;
  prezzo?: number | null;
  prezzoAnticipato?: number | null;
  prezzoRate?: number | null;
  numeroRate?: number | null;
  durata?: number | null;
}
```

Tre prezzi coesistono e corrispondono ai tre metodi di pagamento: `prezzo` (volta per volta),
`prezzoAnticipato` (tutto anticipato), `prezzoRate` diviso per `numeroRate`.

### `AllocazionePagamentoDto` — `src/services/pagamentiService.ts:8-16`

```typescript
interface AllocazionePagamentoDto {
  id: number;
  pagamentoId?: number | null;
  acquistoId?: number | null;
  importoAllocato?: number | null;
  acquistoServizioNome?: string | null;
  acquistoPazienteNome?: string | null;
  acquistoPazienteCognome?: string | null;
}
```

Modella la relazione molti-a-molti fra pagamenti e acquisti: un pagamento può essere spalmato su più
acquisti e un acquisto può essere coperto da più pagamenti.

### `PagamentoDto` — `src/services/pagamentiService.ts:18-35`

```typescript
interface PagamentoDto {
  id: number;
  metodoPagamentoId?: number | null;
  pazienteId?: number | null;
  metodoPagamentoNome?: string | null;
  importo?: number | null;
  stato?: string | null;
  statoDescrizione?: string | null;
  dataPagamento?: string | null;
  note?: string | null;
  numeroTransazione?: string | null;
  operatorePagamento?: string | null;
  allocazioni?: AllocazionePagamentoDto[] | null;
  pazienteNome?: string | null;
  pazienteCognome?: string | null;
  studioNome?: string | null;
  fatturaPresente?: boolean | null;
}
```

`fatturaPresente` è il gate lato client per il pulsante di download: se non è esattamente `true`,
l'app mostra il modal "Fattura non disponibile sull'app" senza tentare la richiesta.

`PagamentiPazienteScreen` mostra soltanto: `importo`, `dataPagamento`, `statoDescrizione`/`stato` e
l'icona fattura. `allocazioni`, `note`, `numeroTransazione`, `operatorePagamento`, `studioNome` e
`metodoPagamentoNome` arrivano al client ma non sono visualizzati.

---

## 5.7 Formazione (corsi aziendali)

### `CorsoDto` — `src/services/formazioneService.ts:10-18`

```typescript
interface CorsoDto {
  id: number;
  titolo: string;
  descrizione: string | null;
  immagineCopertina: string | null;
  ruoloRichiestoId: number | null;
  ruoloRichiestoTipo: string | null;
  attivo: boolean;
}
```

### `ModuloDto` — `src/services/formazioneService.ts:31-40`

```typescript
interface ModuloDto {
  id: number;
  corsoId: number;
  titolo: string;
  descrizione: string;
  ordine: number;
  immagineCopertina: string;
  dataAggiunta: string;
  attivo: boolean;
}
```

### `LezioneDto` — `src/services/formazioneService.ts:42-54`

```typescript
interface LezioneDto {
  id: number;
  moduloId: number;
  titolo: string;
  descrizione: string;
  ordine: number;
  cloudflareUid: string | null;
  immagineCopertina: string;
  durataSecondi: number | null;
  richiedeToken: boolean;
  dataAggiunta: string;
  attivo: boolean;
}
```

Campi chiave:

- **`cloudflareUid`** — identificativo del video su Cloudflare Stream; usato per costruire l'URL del
  manifest HLS. Se `null`, la lezione non ha video associato.
- **`durataSecondi`** — se `null` o `0`, l'app calcola la durata scaricando il manifest HLS
  (`getCachedDurationFromHls`).
- **`richiedeToken`** — indica che il video richiede un token firmato Cloudflare. **Il player non lo
  gestisce**: viene mappato su `Video.richiedeToken` e mai letto. Se un video con
  `richiedeToken: true` esiste, non sarà riproducibile.

---

## 5.8 Corsi posturali

Struttura parallela alla formazione, senza i campi di ruolo.

### `CorsoPosturaleDto` — `src/services/corsiPosturaliService.ts:6-12`

```typescript
interface CorsoPosturaleDto {
  id: number;
  titolo: string;
  descrizione: string | null;
  immagineCopertina: string | null;
  attivo: boolean;
}
```

### `ModuloPosturaleDto` — `src/services/corsiPosturaliService.ts:14-23`

```typescript
interface ModuloPosturaleDto {
  id: number;
  corsoId: number;
  titolo: string;
  descrizione: string | null;
  ordine: number;
  immagineCopertina: string | null;
  dataAggiunta: string;
  attivo: boolean;
}
```

### `LezionePosturaleDto` — `src/services/corsiPosturaliService.ts:25-37`

```typescript
interface LezionePosturaleDto {
  id: number;
  moduloId: number;
  titolo: string;
  descrizione: string | null;
  ordine: number;
  cloudflareUid: string | null;
  immagineCopertina: string | null;
  durataSecondi: number | null;
  richiedeToken: boolean;
  dataAggiunta: string;
  attivo: boolean;
}
```

Differenza rispetto ai DTO formazione: qui `descrizione` e `immagineCopertina` sono
`string | null`, mentre in `ModuloDto`/`LezioneDto` sono `string` non nullable. Il backend è
probabilmente più permissivo di quanto i tipi formazione dichiarino.

### Tipi intermedi in `courseContent.ts`

`RawModulo` e `RawLezione` (righe 25-42) sono forme ridotte usate internamente per unificare i due
cataloghi prima del mapping verso `Chapter`/`Video`:

```typescript
interface RawModulo {
  id: number;
  corsoId: number;
  titolo: string;
  ordine: number;
}

interface RawLezione {
  id: number;
  moduloId: number;
  titolo: string;
  descrizione: string | null;
  ordine: number;
  cloudflareUid: string | null;
  immagineCopertina: string | null;
  durataSecondi: number | null;
  richiedeToken: boolean;
}
```

---

## 5.9 Sessioni posturali

### `SessionePosturaleDto` — `src/services/sessioniPosturaliService.ts:6-14`

```typescript
interface SessionePosturaleDto {
  id: number;
  nome: string;
  descrizione: string;
  numeroMassimoPartecipanti: number;
  durata: number;                          // minuti
  tags: string;                            // separati da ';'
  immagineCopertinaUrl: string | null;
}
```

**`numeroMassimoPartecipanti` non è utilizzato in alcuna schermata.** La UI non mostra la capienza né
verifica se una sessione è piena: il controllo è demandato interamente al backend, che rifiuta la
prenotazione con un errore mostrato nell'alert `'Prenotazione non riuscita'`.

### `CalendarioSessionePosturaleDto` — `src/services/sessioniPosturaliService.ts:16-27`

```typescript
interface CalendarioSessionePosturaleDto {
  id: number;                                    // ID dell'occorrenza
  data: string;                                  // "YYYY-MM-DD"
  oraInizio: string;                             // "HH:mm[:ss]"
  oraFine: string;
  sessioneId: number;                            // ID del tipo di sessione
  sessioneNome: string;
  sessioneDescrizione?: string | null;
  sessioneImmagineCopertinaUrl?: string | null;
  istruttoreId: number;
  istruttoreNomeCompleto: string;
}
```

**Distinzione fondamentale**: `id` è l'ID dell'**occorrenza** in calendario (una data e ora
specifiche), `sessioneId` è l'ID del **tipo di sessione**. La prenotazione avviene su `sessioneId`,
non sull'occorrenza. Il testo nel modal di conferma lo spiega all'utente:
`"La prenotazione vale per questo tipo di sessione, non solo per l'orario scelto."`

### `PartecipanteSessionePosturaleDto` — `src/services/sessioniPosturaliService.ts:29-35`

```typescript
interface PartecipanteSessionePosturaleDto {
  id: number;                    // ID della prenotazione (serve per la DELETE)
  utenteId: number;
  utenteNomeCompleto: string;
  sessioneId: number;
  sessioneNome: string;
}
```

Non contiene data/ora: la prenotazione è legata al tipo di sessione. Per mostrare un orario,
`SessioniPrenotazioniScreen` incrocia `sessioneId` con il calendario completo.

### `PartecipanteSessionePosturaleCreateDto` — `src/services/sessioniPosturaliService.ts:37-40`

```typescript
interface PartecipanteSessionePosturaleCreateDto {
  sessioneId: number;
  utenteId?: number;      // dichiarato ma NON inviato dall'implementazione
}
```

### `FetchCalendarioSessioniPosturaliParams` — `src/services/sessioniPosturaliService.ts:42-48`

```typescript
interface FetchCalendarioSessioniPosturaliParams {
  data?: string;
  dataDa?: string;
  dataA?: string;
  sessioneId?: number;
  istruttoreId?: number;
}
```

L'app usa soltanto `{ data }` (singolo giorno) in `SessioniCalendarioScreen` e nessun parametro in
`SessioniPrenotazioniScreen` (calendario completo).

---

## 5.10 Sessioni fitness

Struttura speculare a quella posturale (modulo non raggiungibile dalla UI).

```typescript
interface SessioneFitnessDto {
  id: number;
  nome: string;
  descrizione: string;
  numeroMassimoPartecipanti: number;
  durata: number;
  tags: string;
  immagineCopertinaUrl: string | null;
}

interface CalendarioSessioneFitnessDto {
  id: number;
  data: string;
  oraInizio: string;
  oraFine: string;
  sessioneId: number;
  sessioneNome: string;
  sessioneDescrizione?: string | null;
  sessioneImmagineCopertinaUrl?: string | null;
  istruttoreId: number;
  istruttoreNomeCompleto: string;
}

interface PartecipanteSessioneFitnessDto {
  id: number;
  utenteId: number;
  utenteNomeCompleto: string;
  sessioneId: number;
  sessioneNome: string;
}

interface PartecipanteSessioneFitnessCreateUpdateDto {
  utenteId: number;      // obbligatorio, a differenza del posturale
  sessioneId: number;
}

interface FetchCalendarioSessioniFitnessParams {
  data?: string;
  dataDa?: string;
  dataA?: string;
  sessioneId?: number;
  istruttoreId?: number;
}
```

---

## 5.11 Modelli UI — `src/types/index.ts`

Questi sono i tipi **interni all'app**, non i DTO del backend.

### `Theme` — `src/types/index.ts:4-32`

```typescript
interface Theme {
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    error: string;
    text: { primary: string; secondary: string; accent: string; error: string };
    background: { primary: string; secondary: string; white: string };
  };
  fonts: {
    primary: string;
    weights: { light: string; regular: string; medium: string; semiBold: string; bold: string };
  };
}
```

**Questa interfaccia non è mai usata come annotazione di tipo**: `src/theme/index.ts` esporta un
oggetto letterale e i componenti lo consumano via inferenza. L'oggetto reale contiene inoltre campi
non dichiarati qui (`titlePrimary`, `black`, `gradients`), quindi `Theme` non è nemmeno un
sovrainsieme corretto dell'oggetto effettivo.

### `User` — `src/types/index.ts:34-39`

```typescript
interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'instructor' | 'student';
}
```

**Tipo morto**: non usato da nessun file. Il modello di utente effettivo è `StoredUserProfile`, e i
ruoli reali sono stringhe `ROLE_*` italiane, non `'admin' | 'instructor' | 'student'`. È un residuo
di uno scaffolding iniziale.

### `CourseCatalog` — `src/types/index.ts:46`

```typescript
type CourseCatalog = 'formazione' | 'posturale';
```

Discriminante che permette a `CourseVideosScreen` e `courseContent.ts` di sapere quale famiglia di
endpoint interrogare per un dato corso.

### `Course` — `src/types/index.ts:48-69`

```typescript
interface Course {
  id: string;                          // stringa, anche se il DTO ha number
  title: string;
  description: string;
  instructor: string;
  duration: number;                    // MINUTI
  isCompleted: boolean;
  completionPercentage: number;        // 0-100
  category: string;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzato';
  coverImage?: string;
  youtubePlaylistId?: string;
  catalog?: CourseCatalog;             // default implicito: 'formazione'
  formazioneAttivo?: boolean;
  ruoloRichiestoTipo?: string | null;
  ruoloRichiestoId?: number | null;
}
```

Stato effettivo dei campi con i mapper attuali:

| Campo | Valore reale |
|---|---|
| `duration` | sempre `0` → la card mostra `"—"` |
| `isCompleted` | sempre `false` |
| `completionPercentage` | sempre `0` → la barra di progresso è sempre vuota |
| `instructor` | sempre `'Mobilitas'`, e **non viene renderizzato** in `CourseCard` |
| `difficulty` | sempre `'Principiante'`, e **non viene renderizzato** |
| `category` | `'Formazione'` o `'Postura'`, e **non viene renderizzato** |
| `youtubePlaylistId` | mai popolato dai mapper attuali |
| `formazioneAttivo` | dal DTO; `false` → card bloccata |
| `ruoloRichiestoTipo` / `ruoloRichiestoId` | popolati solo per la formazione, **mai letti dalla UI** |

`Course.duration` in minuti contro `Video.duration` in secondi è una fonte di confusione da tenere
presente.

### `Chapter` — `src/types/index.ts:71-77`

```typescript
interface Chapter {
  id: string;
  title: string;
  order: number;
  courseId: string;
  youtubePlaylistId?: string;
}
```

Corrisponde a un **modulo** del backend. Terminologia: `Chapter` (UI) = `Modulo` (backend).

### `Video` — `src/types/index.ts:79-93`

```typescript
interface Video {
  id: string;
  title: string;
  url: string;
  duration: number;                  // SECONDI
  courseId: string;
  chapterId: string;
  order: number;
  isCompleted: boolean;
  thumbnail?: string;
  description?: string;
  youtubeVideoId?: string;
  cloudflareUid?: string;
  richiedeToken?: boolean;
}
```

Corrisponde a una **lezione** del backend. Terminologia: `Video` (UI) = `Lezione` (backend).

`url` contiene l'URL completo del manifest HLS costruito da `courseContent.ts`. `youtubeVideoId` è
popolato soltanto dal codice YouTube non raggiungibile.

---

## 5.12 Tipi di navigazione

### `src/screens/corsi/types.ts`

```typescript
type CorsiStackParamList = {
  CorsiPosturaliList: undefined;
  CorsiAziendaliList: undefined;
  CourseVideos: { course: Course };
  VideoPlayer: { video: Video; course?: Course };
};
```

È l'**unico** param list con parametri: gli altri stack passano tutto tramite fetch interno.
Passare l'intero oggetto `Course` come parametro di route significa che l'oggetto viene serializzato
nello stato di navigazione.

### `src/screens/visite/types.ts`

```typescript
type VisiteStackParamList = {
  VisiteMenu: undefined;
  BookVisit: undefined;
  GestioneVisite: undefined;
  PagamentiPaziente: undefined;
};
```

### `src/screens/sessioni/types.ts`

```typescript
type SessioniStackParamList = {
  SessioniHome: undefined;
  SessioniPrenotazioni: undefined;
  SessioniCalendario: undefined;
};
```

### `src/screens/fitness/types.ts`

```typescript
type FitnessStackParamList = {
  FitnessCalendar: undefined;
  FitnessBookings: undefined;
  FitnessSessionsCalendar: undefined;
};
```

### Root e tab

**Non esistono tipi** per il root stack (`Login` / `Main`) né per il tab navigator: `App.tsx` usa
`createBottomTabNavigator()` e `createStackNavigator()` senza generics. Di conseguenza `HomeScreen`
naviga verso le tab con cast forzati:

```typescript
navigation.navigate('StudioVisits' as never);
navigation.navigate('Courses' as never);
navigation.navigate('Sessioni' as never);
```

I tre `as never` bypassano il type checking: un errore di battitura nel nome della route non verrebbe
rilevato in compilazione.

---

## 5.13 Tipi locali significativi nelle schermate

### `SelectModalProps<T>` — `src/screens/visite/SelectModal.tsx`

```typescript
interface SelectModalProps<T extends { id: number }> {
  visible: boolean;
  title: string;
  options: T[];
  selectedId: number | null;
  onClose: () => void;
  getLabel: (item: T) => string;
  onSelect: (item: T) => void;
  listEmptyText?: string;
  isItemDisabled?: (item: T) => boolean;
  disabledItemHint?: string;      // default 'Non prenotabile'
}
```

Unico componente generico dell'app. Riutilizzato tre volte in `BookVisitScreen` per studio,
osteopata e acquisto.

### `CorsiCatalogCopy` — `src/screens/corsi/CorsiCatalogView.tsx:21-30`

```typescript
interface CorsiCatalogCopy {
  headerTitle: string;
  headerSubtitle: string;
  badge: string;
  loadingSubtitle: string;
  emptyText: string;
  errorContext: string;
  errorFallback: string;
  supportWhatsAppMessage: string;
}
```

Pattern interessante: `CorsiCatalogView` è una vista condivisa parametrizzata da un oggetto di
stringhe. È l'approccio più vicino a un sistema di localizzazione presente nel codice, applicato però
solo al modulo Corsi.

### `CorsiCatalogViewProps` — `src/screens/corsi/CorsiCatalogView.tsx:32-40`

```typescript
interface CorsiCatalogViewProps {
  copy: CorsiCatalogCopy;
  courses: Course[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  onRefresh: () => void;
}
```

### `CourseCardProps` — `src/components/CourseCard.tsx:11-21`

```typescript
interface CourseCardProps {
  course: Course;
  title: string;
  instructor: string;               // NON renderizzato
  duration: number;                 // minuti
  completionPercentage: number;
  isCompleted: boolean;
  coverImage?: string;
  isLocked?: boolean;               // ← formazioneAttivo === false
}
```

Le props duplicano campi già presenti in `course`: il componente riceve sia l'oggetto completo sia i
singoli campi.

### `StreamVideo` — `src/services/cloudflareService.ts:13-33`

DTO della Cloudflare Stream API (non esportato, codice non raggiungibile):

```typescript
interface StreamVideo {
  uid: string;
  duration: number;
  meta: {
    course?: string; courseTitle?: string; courseDescription?: string;
    instructor?: string; category?: string; difficulty?: string;
    courseCoverImage?: string;
    module?: string; moduleTitle?: string; moduleOrder?: string;
    order?: string; title?: string; name?: string; description?: string;
  };
  thumbnail?: string;
}
```

L'idea era di derivare l'intera gerarchia corso/modulo/lezione dai **metadati custom** dei video
Cloudflare, senza database. Approccio abbandonato in favore delle API Mobilitas.

### `YouTubePlaylist`, `YouTubePlaylistItem`, `YouTubeVideoDetails`

Definiti in `src/services/youtubeService.ts` (e `YouTubePlaylist` **duplicato** in
`src/services/firebaseService.ts:80-96` con struttura identica). Rispecchiano le risposte della
YouTube Data API v3.

```typescript
interface YouTubePlaylist {
  id: string;
  snippet: {
    title: string;
    description: string;
    thumbnails: { default: { url: string }; medium: { url: string }; high: { url: string } };
    channelTitle: string;
    publishedAt: string;
  };
  contentDetails: { itemCount: number };
}
```

---

## 5.14 Riepilogo: tipi non utilizzati

| Tipo | File | Motivo |
|---|---|---|
| `Theme` | `src/types/index.ts:4-32` | Mai usato come annotazione; incompleto rispetto all'oggetto reale |
| `User` | `src/types/index.ts:34-39` | Sostituito da `StoredUserProfile`; ruoli incompatibili |
| `LoginRequestBody` | `src/services/authApi.ts:15-18` | Il body è costruito inline |
| `FitnessStackParamList` e tutti i DTO fitness | `src/screens/fitness/`, `src/services/fitnessService.ts` | Modulo non raggiungibile |
| `StreamVideo` | `src/services/cloudflareService.ts` | Servizio non raggiungibile |
| Tipi YouTube | `src/services/youtubeService.ts`, `firebaseService.ts` | Servizi non raggiungibili |
| `Course.youtubePlaylistId`, `Chapter.youtubePlaylistId`, `Video.youtubeVideoId` | `src/types/index.ts` | Mai popolati dai mapper attivi |
| `Video.richiedeToken` | `src/types/index.ts` | Popolato ma mai letto |
| `Course.ruoloRichiestoTipo` / `ruoloRichiestoId` | `src/types/index.ts` | Popolati ma mai letti |
| `PrenotazioneVisitaDto` | `src/services/studioVisitsService.ts` | Solo funzioni non invocate |
