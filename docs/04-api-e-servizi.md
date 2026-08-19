# 04 — Catalogo API e layer servizi

## 4.1 Convenzioni comuni

- **Base URL**: `${API_ORIGIN}/api`, dove `API_ORIGIN` è
  `https://mobilitas-backend-990845221858.europe-west8.run.app` in produzione. Nei path elencati
  sotto, `/visite` significa `${API_BASE_URL}/visite`.
- **Autenticazione**: header `Authorization: Bearer <JWT>` aggiunto automaticamente dall'interceptor
  di `apiClient`.
- **Timeout**: `15000` ms per tutte le chiamate via `apiClient`. Eccezione: il download del PDF
  fattura, che usa `expo-file-system` con timeout `60_000` ms.
- **Envelope**: ogni risposta è `{ success: boolean, message?: string, data?: T, error?: string | null }`.
  I servizi scartano l'envelope e restituiscono `data`.
- **Content-Type**: `application/json` di default.

## 4.2 Catalogo completo degli endpoint

### Autenticazione — `src/services/authApi.ts`, `src/api/index.ts`

| Metodo | Path | Body / Query | Risposta (`data`) | Chiamato da |
|---|---|---|---|---|
| `POST` | `/auth/login` | `{ username, password }` | `LoginResponseData` | `loginMobilitas` |
| `POST` | `/auth/refresh` | `{}` | `RefreshPayload` | Interceptor 401 di `apiClient`; `refreshAuthToken` (retry PDF fattura) |
| `POST` | `/auth/logout` | `{}` | ignorata | `logoutMobilitas` |
| `GET` | `/auth/me` | — | `UserInfoResponseDto` | `fetchCurrentUser`, `restorePersistedSession` |

### Osteopati e studi — `src/services/studioVisitsService.ts`

| Metodo | Path | Query | Risposta | Chiamato da |
|---|---|---|---|---|
| `GET` | `/studi` | — | `StudioDto[]` (solo `attivo`, ordinati per nome) | `fetchStudiAttivi` |
| `GET` | `/osteopati/{osteopataId}` | — | `OsteopataDto` | `fetchOsteopataById`, `fetchCurrentUser` |
| `GET` | `/osteopati/studio/{studioId}` | — | `OsteopataDto[]` | `fetchOsteopatiPerStudio` |
| `GET` | `/osteopati/disponibilita-effettive` | `dataInizio`, `dataFine`, `studioId`, `osteopataIds` (ripetuto) | `DisponibilitaCalcolataDto[] \| null` | `fetchDisponibilitaVisite` |
| `POST` | `/visite-studio/prenotazioni` | `{ osteopataId, studioId, inizio }` | `PrenotazioneVisitaDto` | `creaPrenotazioneVisita` |
| `DELETE` | `/visite-studio/prenotazioni/{id}` | — | — | `annullaPrenotazioneVisita` |

Nota: `creaPrenotazioneVisita` e `annullaPrenotazioneVisita` **non sono invocate da alcuna
schermata**. Il flusso di prenotazione effettivo usa `POST /visite` (vedi sotto). Sono
implementazioni alternative rimaste nel servizio.

Il parametro `osteopataIds` viene costruito con `URLSearchParams` e
`qs.append('osteopataIds', String(osteopataId))`: il backend accetta occorrenze ripetute, ma l'app
ne invia sempre **una sola**.

Un commento in `studioVisitsService.ts:11` documenta un endpoint alternativo non usato:
`GET /api/visite/disponibilita?data&osteopataId&studioId`.

### Visite e calendario — `src/services/visiteService.ts`

| Metodo | Path | Query / Body | Risposta | Chiamato da |
|---|---|---|---|---|
| `GET` | `/calendario/completo` | `osteopataId`, `dataInizio`, `dataFine` | `CalendarioCompletoDto` → si usa solo `items[]` | `fetchCalendarioCompletoGiorno` |
| `GET` | `/visite/by-paziente/{pazienteId}` | `sortOrder` (default `'ASC'`) | `VisitaMinimaleDto[]` | `fetchVisiteByPaziente` |
| `POST` | `/visite` | `CreateVisitaRequestDto` | `VisitaCreataDto` | `createVisita` |

Un commento in `visiteService.ts:8` segnala che `POST /api/visite` è configurato come `permitAll`
nella `SecurityConfig` del backend: l'endpoint non richiederebbe il JWT. L'app lo invia comunque.

`fetchCalendarioCompletoGiorno` viene sempre chiamato con `dataInizio === dataFine`: è una query su
un **singolo giorno**, nonostante l'endpoint supporti intervalli.

### Pazienti — `src/services/pazientiService.ts`

| Metodo | Path | Query | Risposta | Chiamato da |
|---|---|---|---|---|
| `GET` | `/pazienti/search/advanced` | `query`, `page` (default `0`), `size` (default `50`, cap `100`) | `SpringPageDto<PazienteDto>` | `searchPazientiAdvanced` |
| `GET` | `/pazienti/{pazienteId}/osteopata` | — | `OsteopataDto \| null` (404 → `null`) | `fetchOsteopataRiferimentoPaziente` |
| `GET` | `/pazienti/by-utente/{utenteId}` | — | `PazienteDto \| null` (404 → `null`) | `fetchPazienteByUtenteId`, `fetchCurrentUser` |

Regola importante: `searchPazientiAdvanced` **non effettua la chiamata HTTP** se
`query.trim().length < MIN_QUERY_LEN` (dove `MIN_QUERY_LEN = 2`, esportato come
`PAZIENTI_SEARCH_MIN_QUERY_LEN`). Restituisce direttamente una pagina vuota
`{ content: [], totalElements: 0, totalPages: 0, size: params.size ?? 25, number: 0 }`.

### Acquisti — `src/services/acquistiService.ts`

| Metodo | Path | Query / Body | Risposta | Chiamato da |
|---|---|---|---|---|
| `GET` | `/acquisti/paziente/{pazienteId}` | `sortDir` (default `'DESC'`), `size` opzionale (cap `1000`) | `AcquistoDto[]` | `fetchAcquistiByPaziente` |
| `POST` | `/acquisti` | `CreateAcquistoRequestDto` | `AcquistoDto` | `createAcquisto` |

### Servizi (pacchetti commerciali) — `src/services/serviziService.ts`

| Metodo | Path | Risposta | Chiamato da |
|---|---|---|---|
| `GET` | `/servizi/attivi` | `ServizioDto[]` (dopo `normalizeServiziList`) | `fetchServiziAttivi` |

### Pagamenti e fatture — `src/services/pagamentiService.ts`

| Metodo | Path | Query | Risposta | Chiamato da |
|---|---|---|---|---|
| `GET` | `/pagamenti/paziente/{pazienteId}` | `sortDir` (default `'DESC'`) | `PagamentoDto[]` | `fetchPagamentiByPaziente` |
| `GET` | `/pagamenti/{pagamentoId}/fattura-fic-pdf` | — | binario PDF | `downloadFatturaPdf` |

Il download PDF è l'**unica chiamata che non passa da `apiClient`**: usa
`FileSystem.downloadAsync` da `expo-file-system/legacy` con:

- header `Authorization: Bearer <token>` (letto manualmente) e `Accept: application/pdf`
- `sessionType: FileSystemSessionType.FOREGROUND`
- timeout `60_000` ms (`FATTURA_PDF_TIMEOUT_MS`)
- destinazione `${cacheDirectory}fattura_${pagamentoId}_${Date.now()}.bin`
- validazione: status `200` **e** `content-type` che include `'application/pdf'`
- retry su 401: cancella il file temporaneo, chiama `refreshAuthToken()`, ripete il download una
  volta

Il nome file finale viene estratto dall'header `Content-Disposition` con fallback
`fattura_{pagamentoId}.pdf`, sanitizzato con `/[^a-zA-Z0-9._-]/g` → `_`.

### Formazione (corsi aziendali) — `src/services/formazioneService.ts`

| Metodo | Path | Risposta | Chiamato da |
|---|---|---|---|
| `GET` | `/formazione/corsi/accessibili` | `CorsoDto[]` | `fetchCorsi` |
| `GET` | `/formazione/corsi/{corsoId}/moduli` | `ModuloDto[]` | `fetchModuliByCorso` |
| `GET` | `/formazione/moduli/{moduloId}/lezioni` | `LezioneDto[]` | `fetchLezioniByModulo` |

L'endpoint `/formazione/corsi/accessibili` restituisce già filtrati i corsi accessibili al ruolo
dell'utente. Restituisce `403` per gli utenti mobile-only: per questo `useCorsiAziendali` ha
`enabled: hasGestionaleRole(...)`.

### Corsi posturali — `src/services/corsiPosturaliService.ts`

| Metodo | Path | Risposta | Chiamato da |
|---|---|---|---|
| `GET` | `/corsi-posturali` | `CorsoPosturaleDto[]` | `fetchCorsiPosturali` |
| `GET` | `/corsi-posturali/{corsoId}` | `CorsoPosturaleDto` | `fetchCorsoPosturaleById` |
| `GET` | `/corsi-posturali/{corsoId}/moduli` | `ModuloPosturaleDto[]` (sort client per `ordine`) | `fetchModuliByCorsoPosturale` |
| `GET` | `/corsi-posturali/moduli/{moduloId}/lezioni` | `LezionePosturaleDto[]` (sort client per `ordine`) | `fetchLezioniByModuloPosturale` |
| `GET` | `/corsi-posturali/lezioni/{lezioneId}` | `LezionePosturaleDto` | `fetchLezionePosturaleById` |

`fetchLezionePosturaleById` non è invocata da alcuna schermata.

### Sessioni posturali — `src/services/sessioniPosturaliService.ts`

| Metodo | Path | Query / Body | Risposta | Chiamato da |
|---|---|---|---|---|
| `GET` | `/sessioni-posturali` | — | `SessionePosturaleDto[]` | `fetchSessioniPosturali` |
| `GET` | `/sessioni-posturali/{id}` | — | `SessionePosturaleDto` | `fetchSessionePosturaleById` |
| `GET` | `/sessioni-posturali/calendario` | `data?`, `dataDa?`, `dataA?`, `sessioneId?`, `istruttoreId?` | `CalendarioSessionePosturaleDto[]` | `fetchCalendarioSessioniPosturali` |
| `GET` | `/sessioni-posturali/calendario/{id}` | — | `CalendarioSessionePosturaleDto` | `fetchCalendarioSessionePosturaleById` |
| `GET` | `/sessioni-posturali/partecipanti` | — | `PartecipanteSessionePosturaleDto[]` (già filtrate sull'utente del token) | `fetchPartecipazioniSessioniPosturali` |
| `POST` | `/sessioni-posturali/partecipanti` | `{ sessioneId }` | `PartecipanteSessionePosturaleDto` | `creaPrenotazioneSessionePosturale` |
| `DELETE` | `/sessioni-posturali/partecipanti/{prenotazioneId}` | — | — | `eliminaPrenotazioneSessionePosturale` |

`fetchSessionePosturaleById` e `fetchCalendarioSessionePosturaleById` non sono invocate da alcuna
schermata.

Nota sul payload di prenotazione: il tipo `PartecipanteSessionePosturaleCreateDto` dichiara
`{ sessioneId: number; utenteId?: number }` ma l'implementazione invia **solo `{ sessioneId }`**.
È il backend a derivare l'utente dal token.

### Sessioni fitness — `src/services/fitnessService.ts`

Modulo funzionante ma **non raggiungibile dalla UI**.

| Metodo | Path | Query / Body | Risposta | Chiamato da |
|---|---|---|---|---|
| `GET` | `/fitness/sessioni` | — | `SessioneFitnessDto[]` | `fetchSessioniFitness` |
| `GET` | `/fitness/calendario-sessioni` | `data?`, `dataDa?`, `dataA?`, `sessioneId?`, `istruttoreId?` | `CalendarioSessioneFitnessDto[]` | `fetchCalendarioSessioniFitness` |
| `GET` | `/fitness/partecipanti-sessioni` | — | `PartecipanteSessioneFitnessDto[]` | `fetchPartecipazioniSessioniFitness` |
| `POST` | `/fitness/partecipanti-sessioni` | `{ utenteId, sessioneId }` | `PartecipanteSessioneFitnessDto` | `creaPrenotazioneSessioneFitness` |
| `DELETE` | `/fitness/partecipanti-sessioni/{partecipazioneId}` | — | — | `annullaPrenotazioneSessioneFitness` |

**Differenza rispetto alle sessioni posturali**: il payload di prenotazione fitness include
`utenteId` esplicito, e il client filtra le partecipazioni con `row.utenteId === utenteId` invece di
fidarsi dello scoping server-side.

### Endpoint inesistente (`src/hooks/useApi.ts`)

| Metodo | Path | Nota |
|---|---|---|
| `GET` | `/courses` | Non esiste nel backend |
| `POST` | `/courses` | Non esiste nel backend |

`useApi()` è un hook di esempio (`queryKey: ['courses']`) mai importato da alcun componente. Vedi
[15 — Debito tecnico](./15-debito-tecnico-e-anomalie.md).

## 4.3 Endpoint esterni (non Mobilitas)

| Servizio | Metodo | URL | Uso | Raggiungibile da UI |
|---|---|---|---|---|
| Cloudflare Stream API | `GET` | `https://api.cloudflare.com/client/v4/accounts/{accountId}/stream?page=N&per_page=100` | Enumerazione libreria video | **No** |
| Cloudflare Stream HLS | `GET` | `https://{subdomain}/{uid}/manifest/video.m3u8` | Manifest video per il player e per il calcolo durata | **Sì** |
| Cloudflare Stream thumb | `GET` | `https://{subdomain}/{uid}/thumbnails/thumbnail.jpg` | Miniature | Solo via `cloudflareService` (**No**) |
| YouTube Data API v3 | `GET` | `https://www.googleapis.com/youtube/v3/playlistItems` | Video di una playlist | **No** |
| YouTube Data API v3 | `GET` | `https://www.googleapis.com/youtube/v3/videos` | Dettagli e durate | **No** |
| YouTube Data API v3 | `GET` | `https://www.googleapis.com/youtube/v3/playlists` | Info playlist / playlist del canale | **No** |
| Google OAuth | `GET` | `https://accounts.google.com/o/oauth2/v2/auth` | Authorization endpoint (PKCE) | **No** |
| Google OAuth | `POST` | `https://oauth2.googleapis.com/token` | Code exchange e refresh token | **No** |
| Google OAuth | — | `https://oauth2.googleapis.com/revoke` | Revocation endpoint (dichiarato, non usato) | **No** |
| Firebase Functions | `GET` | `{FUNCTIONS_URL}/getYouTubeToken` | Proxy token YouTube | **No** |
| Firebase Functions | `GET` | `{FUNCTIONS_URL}/getPlaylistVideos?playlistId=` | Video playlist via proxy | **No** |
| Firebase Functions | `GET` | `{FUNCTIONS_URL}/getPlaylistInfo?playlistId=` | Info playlist via proxy | **No** |
| Firebase Functions | `GET` | `{FUNCTIONS_URL}/getChannelPlaylists?channelId=` | Playlist canale via proxy | **No** |
| WhatsApp | deep link | `https://wa.me/393518198457?text=<urlencoded>` | Supporto segreteria | **Sì** |
| Google Reviews | deep link | `studio.googleReviewLink` (dal backend) | Recensione studio | **Sì** |
| Sito studio | deep link | `https://www.studiomobilitas.it/privacy-policy-applicazione` | Link legale nel Login | **Sì** |

Dettagli in [12 — Integrazioni esterne](./12-integrazioni-esterne.md).

## 4.4 Riferimento per servizio

### `src/api/index.ts`

Esporta `API_ORIGIN`, `API_BASE_URL`, `apiClient`. Vedi
[03 §3.5-3.6](./03-autenticazione-ruoli-e-sessione.md) per gli interceptor.

### `src/services/authApi.ts`

| Export | Firma |
|---|---|
| `LoginRequestBody` | interface |
| `LoginResponseData` | interface |
| `UserInfoResponseDto` | interface |
| `hasPazienteRole` | `(roles: string[] \| null \| undefined) => boolean` |
| `hasGestionaleRole` | `(roles: string[] \| null \| undefined) => boolean` |
| `loginMobilitas` | `(usernameOrEmail: string, password: string) => Promise<LoginResponseData>` |
| `refreshAuthToken` | `() => Promise<string>` |
| `logoutMobilitas` | `() => Promise<void>` |
| `persistLoginSession` | `(session: LoginResponseData) => Promise<void>` |
| `fetchCurrentUser` | `() => Promise<StoredUserProfile>` |
| `restorePersistedSession` | `() => Promise<boolean>` |

Messaggi di errore hardcoded: `'Login fallito'`, `'Refresh fallito'`,
`'Impossibile caricare il profilo'`.

### `src/services/visiteService.ts`

| Export | Tipo |
|---|---|
| `VisitaSortOrder` | `'ASC' \| 'DESC'` |
| `VisitaStatus` | union di 5 stati |
| `VisitaMinimaleDto` | interface |
| `CalendarioItemTipo` | `'VISITA' \| 'EVENTO' \| 'NON_REPERIBILITA'` |
| `TipoEventoCalendario` | union di 15 tipi |
| `CalendarioVisitaItem`, `CalendarioEventoItem`, `CalendarioNonReperibilitaItem` | interface |
| `CalendarioItemDto` | union discriminata su `tipo` |
| `CalendarioCompletoDto` | interface |
| `VisitaIdRefDto`, `CreateVisitaRequestDto`, `VisitaCreataDto` | interface / type |
| `fetchCalendarioCompletoGiorno` | `(params: { osteopataId, dataInizio, dataFine }) => Promise<CalendarioItemDto[]>` |
| `fetchVisiteByPaziente` | `(pazienteId: number, options?: { sortOrder?: VisitaSortOrder }) => Promise<VisitaMinimaleDto[]>` |
| `createVisita` | `(body: CreateVisitaRequestDto) => Promise<VisitaCreataDto>` |

Gli `items` del calendario arrivano già ordinati per `dataInizio` crescente; la chiave di lista in UI
è `tipo + id` (poiché gli ID sono unici solo all'interno del proprio tipo).

### `src/services/studioVisitsService.ts`

Oltre alle funzioni già elencate, contiene tre trasformazioni interne:

- **`normalizeTimePart(value)`**: se la stringa è lunga 5 (`"HH:mm"`), aggiunge `":00"`.
- **`slotBackendToApp(slot)`**: combina `data` + `oraInizio`/`oraFine` in ISO UTC via `Date.parse` +
  `toISOString()`. Restituisce `null` se i campi mancano o le date sono `NaN`.
- **`flattenDisponibilitaEffettive(list)`**: appiattisce la struttura per-osteopata
  (`DisponibilitaCalcolataDto[]` con `slotDisponibili` annidati) in un array piatto di
  `SlotDisponibilitaDto`.

### `src/services/pagamentiService.ts`

| Export | Firma |
|---|---|
| `AllocazionePagamentoDto`, `PagamentoDto` | interface |
| `fetchPagamentiByPaziente` | `(pazienteId: number, options?: { sortDir?: 'ASC' \| 'DESC' }) => Promise<PagamentoDto[]>` |
| `downloadFatturaPdf` | `(pagamentoId: number) => Promise<{ uri: string; filename: string }>` |
| `shareFatturaPdf` | `(uri: string, filename: string) => Promise<void>` |

`shareFatturaPdf` usa `expo-sharing` con `mimeType: 'application/pdf'` e `UTI: 'com.adobe.pdf'`.

`normalizePagamentiResponse` accetta tre forme: array diretto, `{ content: [...] }`,
`{ data: [...] }`. `normalizePagamento` garantisce `allocazioni` sempre array (default `[]`).

Mappatura errori fattura → messaggio utente (`fatturaPdfUserMessage`):

| Pattern nel messaggio server | Messaggio mostrato |
|---|---|
| `/Nessuna fattura Fatture in Cloud associata/i` | `'Per questo pagamento non è disponibile una fattura da scaricare.'` |
| `/non ha il documentId/i` | `'Questa fattura non è scaricabile.'` |
| `/non abilitata\|Company ID/i` | servizio fatture non disponibile |
| `/non ha restituito\|Download PDF non riuscito/i` | invito a riprovare |
| status `403` | `'Accesso non autorizzato. Effettua di nuovo il login.'` |

### `src/services/pazientiService.ts`

`pazienteLabel(p)` → `"nome cognome"` trimmato, con fallback `` `Paziente #${p.id}` ``.

### `src/services/acquistiService.ts`

Due funzioni di logica di business pura:

**`isAcquistoPrenotabile(a)`**:
```typescript
a.prenotabile === true || a.isPrenotabile === true
```
Richiede il boolean esplicito: `undefined` o `null` non contano. Il doppio campo copre due possibili
serializzazioni Jackson dello stesso getter.

**`leastRecentPrenotabileAcquistoId(acquisti)`**: filtra i prenotabili e sceglie quello con
`dataAcquisto` **meno recente** (timestamp minimo). Se `dataAcquisto` è assente o non parsabile, il
valore diventa `Number.POSITIVE_INFINITY` (quindi non vince mai). A parità di timestamp vince l'`id`
minore. Serve a consumare i pacchetti nell'ordine in cui sono stati acquistati (FIFO).

`normalizeAcquistiResponse` accetta: array diretto, `content`, `acquisti`, `data`.
`normalizeAcquistoShape` recupera l'id anche da `Id` o `acquistoId`.

`acquistoLabel(a)` → `"servizio · data(primi 10 char) · stato"` con separatore `' · '`.

### `src/services/serviziService.ts`

`normalizeServiziList(raw)` cerca l'array nelle chiavi `'content'`, `'servizi'`, `'data'`, `'items'`,
`'results'`, poi filtra per `id > 0` e `nome.trim().length > 0`. L'id è recuperato da `id`, `Id` o
`servizioId`.

`servizioPriceSegment` formatta i prezzi con `toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })`:

- Se esistono sia `prezzoAnticipato` che `prezzoRate`: `"{anticipato} oppure {rate}"`.
- Per le rate con `numeroRate > 0`: `"{prezzoRate / numeroRate} x N rate"`.

`servizioRestLabel(s)` → `"N visite · prezzo"`.

### `src/services/fitnessService.ts` e `sessioniPosturaliService.ts`

Struttura pressoché identica. Elementi comuni:

- `parseSessione*Tags(tags)`: split su `';'`, `trim`, filtro dei vuoti.
- `sortCalendarRows`: ordinamento per `data` poi `oraInizio` con `localeCompare`.
- Normalizzazione della copertina via `pickCoverImageUrl` su alias
  `immagineCopertinaUrl` / `immagine_copertina_url` / `immagineCopertina`.
- Estrazione errori dall'envelope; il servizio posturale mappa il `404` sul messaggio
  `'Contenuto non disponibile'`, quello fitness usa il fallback
  `'Impossibile comunicare con il servizio fitness'`.

`eliminaPrenotazioneSessionePosturale` lancia **solo** se `data.success === false` esplicito: una
risposta senza campo `success` è considerata riuscita.

### `src/services/corsiPosturaliService.ts` e `formazioneService.ts`

Differenze rilevanti:

| Aspetto | `formazioneService` | `corsiPosturaliService` |
|---|---|---|
| Lista corsi | `/formazione/corsi/accessibili` (filtro server per ruolo) | `/corsi-posturali` |
| Dettaglio corso singolo | non disponibile | `/corsi-posturali/{id}` |
| Ordinamento moduli/lezioni | non applicato client-side | `[...data].sort((a,b) => a.ordine - b.ordine)` |
| Copertina | campo diretto | `pickCoverImageUrl(immagineCopertina, immagine_copertina)` |
| Gestione 404 | errore generico | `'Contenuto non disponibile'` |

### `src/services/courseContent.ts`

È il servizio di **aggregazione** che alimenta `CourseVideosScreen`. Espone:

```typescript
export interface CourseContent {
  chapters: Chapter[];
  videos: Video[];
  course?: Course;
}
export function loadCourseContent(course: Course): Promise<CourseContent>
```

Comportamento:

1. `Number(course.id)` — se non finito, ritorna `{ chapters: [], videos: [] }`.
2. Routing: `course.catalog === 'posturale'` → `loadCorsoPosturaleContent`, altrimenti
   `loadFormazioneContent` (default implicito: formazione).
3. **Formazione**: `GET /formazione/corsi/{id}/moduli`, poi `GET /formazione/moduli/{m.id}/lezioni`
   in parallelo per ogni modulo.
4. **Posturale**: `GET /corsi-posturali/{id}` (per rinfrescare i metadati del corso),
   `GET /corsi-posturali/{id}/moduli`, poi `GET /corsi-posturali/moduli/{m.id}/lezioni`.
   Il corso ricaricato sovrascrive `title`, `description`, `coverImage` e imposta
   `formazioneAttivo: corso.attivo`.
5. Moduli e lezioni vengono ordinati per `ordine`.
6. Costruzione URL video:

```typescript
const CLOUDFLARE_STREAM_SUBDOMAIN = process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN?.replace(/\/$/, '') || '';
const manifestUrlFromUid = (uid: string) => `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${uid}/manifest/video.m3u8`;
```

7. Mapping lezione → `Video`: `duration: l.durataSecondi ?? 0`,
   `thumbnail: l.immagineCopertina || undefined`, `description: l.descrizione ?? ''`,
   `isCompleted: false` (**hardcoded**), `richiedeToken: l.richiedeToken`.

**Nota sul completamento**: `isCompleted` è sempre `false`. L'app non traccia né persiste il progresso
di visione; le percentuali mostrate nell'interfaccia sono di conseguenza sempre `0%`.

### `src/services/appCacheService.ts`

```typescript
export async function cleanAndRefreshCaches(queryClient: QueryClient): Promise<void>
```

Esegue nell'ordine:

1. `queryClient.clear()` — svuota l'intera cache React Query.
2. `AsyncStorage.removeItem('@youtube_access_token')` (con `catch` silenzioso).
3. `clearHlsDurationCache()` — svuota la `Map` delle durate HLS.
4. `queryClient.invalidateQueries()` — invalida tutte le query.

Un commento nel file precisa che il **JWT Mobilitas non viene toccato**: la sessione resta attiva.

Il passo 4 dopo il passo 1 è ridondante (`clear()` rimuove già tutte le query), ma innocuo.

### `src/services/*CatalogPrefetch.ts`

Vedi [13 — Stato, cache e storage](./13-stato-cache-e-storage.md).

`sessioniPosturaliCatalogPrefetch.ts` espone: `applySessioniPosturaliCatalog`,
`getSessioniPosturaliCatalog`, `getSessionePosturaleById`, `getSessionePosturaleCoverUrl`,
`getSessioniPosturaliCoversRecord`, `subscribeSessioniPosturaliCatalog`,
`clearSessioniPosturaliCatalogCache`, `prefetchSessioniPosturaliCatalog`.

`fitnessCatalogPrefetch.ts` espone l'equivalente più `resolveFitnessSessionCoverUrl` e
`getFitnessSessionCoverUrl` (che distingue `undefined` = sessione non in catalogo da `null` = URL
esplicitamente nullo).

## 4.5 Utility

### `src/utils/pickCoverImageUrl.ts`

```typescript
export function pickCoverImageUrl(...candidates: unknown[]): string | null
```

Restituisce il primo candidato che sia una stringa con `trim().length > 0`, trimmata. Altrimenti
`null`. Serve a gestire in modo uniforme gli alias camelCase/snake_case restituiti dal backend.

### `src/utils/mapCorsoToCourse.ts`

Due mapper DTO → `Course` (modello UI). Valori hardcoded:

| Campo `Course` | `mapCorsoDtoToCourse` (formazione) | `mapCorsoPosturaleDtoToCourse` (posturale) |
|---|---|---|
| `id` | `String(dto.id)` | `String(dto.id)` |
| `instructor` | `'Mobilitas'` | `'Mobilitas'` |
| `duration` | `0` | `0` |
| `isCompleted` | `false` | `false` |
| `completionPercentage` | `0` | `0` |
| `category` | `'Formazione'` | `'Postura'` |
| `difficulty` | `'Principiante'` | `'Principiante'` |
| `catalog` | `'formazione'` | `'posturale'` |
| `formazioneAttivo` | `dto.attivo` | `dto.attivo` |
| `ruoloRichiestoTipo` / `ruoloRichiestoId` | dal DTO | non presenti |

`duration: 0` e `completionPercentage: 0` sono la ragione per cui il catalogo mostra sempre
`"—"` come durata e `0%` come progresso.

### `src/utils/hlsDuration.ts`

| Export | Firma |
|---|---|
| `getDurationFromHlsManifest` | `(manifestUrl: string) => Promise<number>` |
| `getCachedDurationFromHls` | `(url: string) => Promise<number>` |
| `clearHlsDurationCache` | `() => void` |

Algoritmo:

1. Early exit: URL vuota o che non contiene `'.m3u8'` → `0`.
2. `fetch(manifestUrl)`. Se `!response.ok` → `throw new Error('HTTP {status}: {url}')`.
3. Se il contenuto contiene `#EXT-X-STREAM-INF` (master playlist), prende il **primo URI non
   commentato** dopo il tag e ricorre su quello. Se non trova variant →
   `throw new Error('Nessun variant trovato nel master playlist')`.
4. Sul variant playlist, somma tutti i valori catturati da
   `EXTINF_REGEX = /#EXTINF:\s*(\d*(?:\.\d+)?)(?:,|$)/` e restituisce `Math.round(total)`.

`getCachedDurationFromHls` avvolge il tutto in una `Map<string, number>` **senza TTL** e con
`catch → console.warn + 0`. La cache viene svuotata solo da `clearHlsDurationCache()`, invocata da
`cleanAndRefreshCaches`.

Costo: per un corso con N lezioni prive di `durataSecondi` si effettuano da N a 2N richieste HTTP
(master + variant per ciascuna) in parallelo.

### `src/utils/resolveDevBackendUrl.ts`

Vedi [02 §2.2](./02-configurazione-ambiente-e-build.md).

### `src/utils/apiErrorMessage.ts`

Vedi [14 — Errori e messaggistica](./14-errori-e-messaggistica.md).

### `src/utils/openStudioWhatsApp.ts`

```typescript
const STUDIO_WHATSAPP_E164 = '393518198457';
export async function openStudioWhatsApp(options?: { message?: string }): Promise<boolean>
```

Costruisce `https://wa.me/393518198457` con eventuale `?text=<encodeURIComponent(message)>`, verifica
con `Linking.canOpenURL` e apre. Qualunque eccezione → `false` silenzioso.

Il numero è hardcoded nel sorgente.

### `src/utils/themeUtils.ts`

`getTheme`, `getColors`, `getFonts`, `getFontFamily(weight?)`, `createTextStyle(size, weight?, color?)`,
`createContainerStyle(bg?, padding?)`. **Nessun componente lo importa**: è codice non utilizzato.

### `src/screens/visite/visiteFormatting.ts`

21 funzioni di formattazione condivise dal modulo Visite. Documentate in dettaglio in
[07 — Modulo Visite](./07-modulo-visite.md).

## 4.6 Servizi legacy non raggiungibili

Tre servizi completi non sono raggiungibili da alcuna schermata montata:

| Servizio | Righe | Scopo | Perché non raggiungibile |
|---|---|---|---|
| `src/services/youtubeService.ts` | 450 | YouTube Data API v3 con fallback Firebase | Nessuna schermata importa gli hook YouTube |
| `src/services/firebaseService.ts` | 229 | Proxy Cloud Functions per token e playlist | Importato solo da `youtubeService` e `youtubeTokenService` |
| `src/services/cloudflareService.ts` | 288 | Enumerazione libreria Cloudflare Stream | Nessun importatore in `src/` |
| `src/services/youtubeTokenService.ts` | 165 | Cache token YouTube con tre strategie | Importato solo da `youtubeService` |

Sono documentati per completezza in
[12 — Integrazioni esterne](./12-integrazioni-esterne.md), con l'avvertenza che rappresentano
superficie di attacco e peso di bundle senza valore funzionale attuale.

## 4.7 Endpoint definiti nei servizi ma mai invocati dalla UI

Riepilogo delle funzioni esportate senza chiamanti nelle schermate:

| Funzione | Endpoint |
|---|---|
| `creaPrenotazioneVisita` | `POST /visite-studio/prenotazioni` |
| `annullaPrenotazioneVisita` | `DELETE /visite-studio/prenotazioni/{id}` |
| `fetchOsteopataById` | `GET /osteopati/{id}` (usata indirettamente da `fetchCurrentUser`) |
| `fetchPazienteByUtenteId` | `GET /pazienti/by-utente/{id}` (usata indirettamente da `fetchCurrentUser`) |
| `fetchLezionePosturaleById` | `GET /corsi-posturali/lezioni/{id}` |
| `fetchSessionePosturaleById` | `GET /sessioni-posturali/{id}` |
| `fetchCalendarioSessionePosturaleById` | `GET /sessioni-posturali/calendario/{id}` |
| tutte le funzioni `*Fitness*` | `/fitness/**` |
| `useApi().useCourses` / `useCreateCourse` | `/courses` (inesistente) |
