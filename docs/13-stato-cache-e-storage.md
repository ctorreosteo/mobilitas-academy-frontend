# 13 — Stato, cache e storage

Come l'app conserva i dati: React Query per il server state, `AsyncStorage` per la sessione, tre cache
in-memory per casi specifici. **Nessun Redux, nessun Zustand, nessun database locale.**

---

## 13.1 I quattro livelli di stato

| Livello | Tecnologia | Durata | Contenuto |
|---|---|---|---|
| Stato locale di componente | `useState` | vita del componente | Form, modali, selezioni |
| Stato globale di sessione | `AuthContext` (`useState` + Context) | vita dell'app | `token`, `userProfile` |
| Server state | React Query | secondo `staleTime` / `gcTime` | Risposte API |
| Persistenza | `AsyncStorage` | fino a logout o disinstallazione | JWT, profilo, preferenze |

Più tre cache in-memory ad hoc: durate HLS, catalogo sessioni posturali, catalogo fitness.

Non esiste uno store globale per i dati di dominio: ogni schermata possiede il proprio stato e le
proprie query. La conseguenza è che due schermate che mostrano lo stesso dato lo richiedono
separatamente — attenuato dalla condivisione delle query key (vedi §13.3).

---

## 13.2 Configurazione di React Query

```31:31:App.tsx
const queryClient = new QueryClient();
```

**Nessuna opzione di default.** Valgono quindi i default della libreria (TanStack Query v5):

| Opzione | Default in v5 | Effetto nell'app |
|---|---|---|
| `staleTime` | `0` | I dati sono considerati stantii immediatamente |
| `gcTime` | `5 * 60 * 1000` (5 min) | Cache scartata 5 minuti dopo l'ultimo uso |
| `retry` | `3` | Tre tentativi con backoff esponenziale su ogni errore |
| `refetchOnMount` | `true` | Refetch quando un componente monta con dati stantii |
| `refetchOnWindowFocus` | `true` | Su React Native non ha effetto senza `focusManager` |
| `refetchOnReconnect` | `true` | Richiede `onlineManager` configurato con NetInfo |
| `networkMode` | `'online'` | |

Due conseguenze importanti:

1. **`retry: 3` si applica anche agli errori 4xx.** Una richiesta che risponde `403` (utente senza
   permessi) viene ritentata tre volte prima di mostrare l'errore, con backoff crescente: l'utente
   aspetta diversi secondi per vedere un messaggio che era già determinato al primo tentativo.
   Configurare `retry` per non ripetere sui `4xx` sarebbe un miglioramento immediato.
2. **`refetchOnReconnect` e `refetchOnWindowFocus` non funzionano** perché l'app non installa
   `@react-native-community/netinfo` né configura `focusManager`/`onlineManager` di React Query
   (dipendenze assenti da `package.json`). Rientrando nell'app dopo una perdita di rete non si ottiene
   un aggiornamento automatico: serve un pull-to-refresh manuale.

Il `QueryClientProvider` avvolge l'intera app dentro l'`ErrorBoundary` (vedi
[01](./01-panoramica-e-architettura.md)).

---

## 13.3 Catalogo completo delle query key

Solo **8 file** usano React Query. Tutte le query dell'app:

| Query key | `queryFn` | `staleTime` | `enabled` | File |
|---|---|---|---|---|
| `['auth-me-profile']` | `fetchCurrentUser` | 60 s | sempre | `BookVisitScreen`, `GestioneVisiteScreen`, `PagamentiPazienteScreen` |
| `['corsi', 'aziendali']` | `fetchCourses` | 60 s | `hasGestionaleRole(ruoli)` | `useCorsiAziendali` |
| `['corsi', 'posturali']` | `fetchCourses` | 60 s | sempre | `useCorsiPosturali` |
| `['visite-studi']` | `fetchStudiAttivi` | — (0) | sempre | `BookVisitScreen` |
| `['visite-osteopati', studioId]` | `fetchOsteopatiPerStudio` | — | `studioId != null` | `BookVisitScreen` |
| `['pazienti-advanced-search', query]` | `searchPazientiAdvanced` | 15 s | query ≥ soglia | `BookVisitScreen` |
| `['acquisti-paziente', pazienteId]` | `fetchAcquistiByPaziente` | — | operatore e id valido | `BookVisitScreen` |
| `['paziente-osteopata-riferimento', pazienteId]` | `fetchOsteopataRiferimentoPaziente` | 60 s | paziente e id valido | `BookVisitScreen` |
| `['visite-disponibilita', osteopataId, …]` | `fetchDisponibilita…` | — | vedi [07](./07-modulo-visite.md) | `BookVisitScreen` |
| `['visite-by-paziente', pazienteId, 'ASC']` | `fetchVisiteByPaziente` | — | non-operatore, id valido | `GestioneVisiteScreen` |
| `['calendario-completo', osteopataId, giornoYmd]` | `fetchCalendarioCompletoGiorno` | — | agenda operatore | `GestioneVisiteScreen` |
| `['pagamenti-paziente', pazienteId, 'DESC']` | `fetchPagamentiByPaziente` | — | paziente con id | `PagamentiPazienteScreen` |
| `['servizi-attivi']` | `fetchServiziAttivi` | 60 s | modale aperta e id valido | `CreaAcquistoModal` |
| `['profile-review-studi']` | `fetchStudiAttivi` | 60 s | modale recensioni aperta | `ProfileScreen` |
| `['profile-review-osteopata-riferimento', pazienteId]` | `fetchOsteopataRiferimentoPaziente` | 60 s | modale aperta e id valido | `ProfileScreen` |
| `['courses']` | `apiClient.get('/courses')` | — | — | `useApi` — **mai usata** |

### Osservazioni

**`['auth-me-profile']` è condivisa da tre schermate**, tutte con `staleTime: 60_000`: entrando in
Visite, poi in Pagamenti, la seconda schermata riusa la risposta invece di richiedere di nuovo il
profilo. È l'unico caso di deduplicazione intenzionale tra schermate, e funziona bene.

**Chiave duplicata per lo stesso dato**: `['visite-studi']` e `['profile-review-studi']` chiamano
entrambe `fetchStudiAttivi`. Usando la stessa chiave, la lista degli studi sarebbe condivisa fra le
due schermate; con chiavi diverse viene scaricata due volte. Stessa situazione per
`['paziente-osteopata-riferimento', id]` e `['profile-review-osteopata-riferimento', id]`.

**Convenzione delle chiavi non uniforme**: alcune sono gerarchiche (`['corsi', 'aziendali']`), altre
piatte con separatori nel nome (`['visite-by-paziente', …]`), altre con prefisso di schermata
(`['profile-review-studi']`). Una convenzione unica (`['dominio', 'risorsa', ...parametri]`)
renderebbe le invalidazioni più prevedibili.

**Parametri di ordinamento nella chiave**: `['visite-by-paziente', pazienteId, 'ASC']` e
`['pagamenti-paziente', pazienteId, 'DESC']` includono la direzione dell'ordinamento. Corretto,
perché fa parte della richiesta, anche se il valore è costante nel codice.

**`staleTime` mancante in 7 query su 16**: quelle senza valore usano `0`, quindi refetchano ad ogni
mount. Per dati come l'elenco degli studi (che cambia raramente) è un carico evitabile.

### Le mutation

| Mutation | Invalidazioni | File |
|---|---|---|
| `createVisita` | `visite-by-paziente`, `calendario-completo`, `visite-disponibilita`, `acquisti-paziente` | `BookVisitScreen` |
| `createAcquisto` | `['acquisti-paziente', effectivePazienteId]` | `CreaAcquistoModal` (via callback) |
| `useCreateCourse` | `['courses']` | `useApi` — **mai usata** |

Le invalidazioni di `createVisita` usano chiavi **parziali** (senza i parametri), quindi colpiscono
tutte le varianti: comportamento corretto e desiderato dopo la creazione di una visita.

### `useApi.ts` — scaffolding non utilizzato

```1:37:src/hooks/useApi.ts
export const useApi = () => {
  const queryClient = useQueryClient();

  // Esempio di hook per fetch dei corsi
  const useCourses = () => {
    return useQuery({
      queryKey: ['courses'],
      queryFn: async () => {
        const response = await apiClient.get('/courses');
        return response.data;
      },
    });
  };
  // ...
};
```

Chiama `GET /courses` (endpoint inglese che il backend non espone: il vero percorso è
`/formazione/corsi/accessibili`). I commenti dicono esplicitamente *"Esempio di hook"*. Contiene
anche un `any` non tipizzato e definisce hook dentro un hook, pattern che viola le regole dei React
Hooks se usato condizionalmente. **Non è importato da nessun file**: va rimosso.

---

## 13.4 I moduli senza React Query

`SessioniHomeScreen`, `SessioniCalendarioScreen`, `SessioniPrenotazioniScreen`,
`CourseVideosScreen`, `CorsiCatalogView` (indirettamente tramite hook), `FitnessScreen` e tutte le
schermate Fitness **non usano React Query**: gestiscono il caricamento con `useState` +
`useEffect` (o `useFocusEffect`) e `try/catch` manuali.

Conseguenze:

- Nessuna deduplicazione: due schermate che chiedono lo stesso dato fanno due richieste.
- Nessuna cache tra navigazioni: tornando indietro e rientrando si ricarica tutto.
- Il `refreshing` del `RefreshControl` va gestito con uno stato dedicato.
- Nessun retry automatico.
- Il pattern `let cancelled = false` nel cleanup dell'effect va ripetuto in ogni schermata.

Per compensare l'assenza di cache, il modulo Sessioni ha una **cache in-memory dedicata** (§13.6).
Uniformare questi moduli su React Query eliminerebbe entrambe le complicazioni.

---

## 13.5 `AsyncStorage` — le chiavi persistite

Cinque chiavi in totale su tutta l'app.

| Chiave | Contenuto | Scritta da | Rimossa da |
|---|---|---|---|
| `@mobilitas_jwt` | JWT in chiaro | `setAuthToken` (login, refresh) | `clearAuthToken` (logout, refresh fallito) |
| `@mobilitas_user_profile` | `StoredUserProfile` serializzato in JSON | `setStoredUserProfile` (login, `/auth/me`) | `clearStoredUserProfile` |
| `@mobilitas_remember_username_enabled` | `'1'` o `'0'` | `setRememberUsernamePreference` | mai (viene sovrascritta) |
| `@mobilitas_last_login_username` | username o email | `setRememberUsernamePreference` | quando la preferenza è disattivata |
| `@youtube_access_token` | access token OAuth Google | `useYouTubeAuth` — **mai eseguito** | `cleanAndRefreshCaches` |

Tutte le chiavi sono definite in `src/services/authTokenStorage.ts`, tranne
`@youtube_access_token` che è duplicata in `useYouTubeAuth.ts` e `appCacheService.ts` (con un commento
che segnala la duplicazione).

### Considerazioni di sicurezza

`AsyncStorage` **non è cifrato**: su Android è un file in `/data/data/<package>/`, su iOS un file nella
sandbox dell'app. Su un dispositivo non compromesso i dati sono protetti dall'isolamento delle app; su
un dispositivo con root o jailbreak, o tramite backup non cifrato, il JWT è leggibile in chiaro.

Per un token con scadenza breve il rischio è contenuto, ma `expo-secure-store` (già disponibile
nell'ecosistema Expo e supportato da Keychain/Keystore) sarebbe la scelta corretta per il JWT.
Dettagli in [03](./03-autenticazione-ruoli-e-sessione.md) e [15](./15-debito-tecnico-e-anomalie.md).

Il profilo persistito contiene dati personali (nome, cognome, email, telefono, codice fiscale e data
di nascita del paziente, tramite `StoredPazienteProfile`): sono dati sensibili sotto GDPR, anch'essi in
chiaro.

### Gestione degli errori di storage

Il pattern è coerente: le letture non lanciano mai.

```typescript
export async function getAuthToken(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
```

`getStoredUserProfile` incapsula anche `JSON.parse` nel `try`, così un valore corrotto restituisce
`null` invece di far crashare l'avvio dell'app. È una difesa importante, perché questa funzione viene
chiamata durante l'idratazione della sessione.

Le **scritture** invece non hanno `try/catch`: `setAuthToken` e `setStoredUserProfile` propagano
l'errore al chiamante, che in `AuthContext.signIn` lo trasforma in un messaggio di login fallito.
Scelta ragionevole: se non si può salvare il token, l'accesso non è realmente riuscito.

### La preferenza "ricorda username"

```106:126:src/services/authTokenStorage.ts
export async function setRememberUsernamePreference(
  enabled: boolean,
  username?: string
): Promise<void> {
  if (enabled && username?.trim()) {
    await AsyncStorage.multiSet([
      [REMEMBER_USERNAME_KEY, '1'],
      [LAST_USERNAME_KEY, username.trim()],
    ]);
  } else {
    await AsyncStorage.multiSet([[REMEMBER_USERNAME_KEY, '0']]);
    await AsyncStorage.removeItem(LAST_USERNAME_KEY);
  }
}

/** Default `true` finché l'utente non ha effettuato un accesso con preferenza disattiva (`0`). */
export async function getRememberUsernamePreference(): Promise<boolean> {
  const v = await AsyncStorage.getItem(REMEMBER_USERNAME_KEY);
  if (v === null) return true;
  return v === '1';
}
```

Due dettagli corretti: `multiSet` rende atomica la scrittura della coppia preferenza/username, e la
disattivazione **cancella** l'username memorizzato invece di limitarsi a nasconderlo. Il default
`true` su chiave assente rende la funzione opt-out al primo avvio.

Nota: queste due chiavi **non vengono rimosse al logout** (`clearAllAuth` tocca solo JWT e profilo).
È intenzionale: dopo il logout la schermata di login ripropone l'username, che è esattamente
l'obiettivo della funzione.

---

## 13.6 Le cache in-memory

Tre cache a livello di modulo, che vivono per l'intera sessione dell'app e si azzerano al riavvio.

### 1. Durate HLS (`src/utils/hlsDuration.ts`)

`Map<string, number>` con chiave l'URL del manifest. Nessun TTL (una durata video non cambia).
Dettagli in [12 §12.1](./12-integrazioni-esterne.md).

### 2. Catalogo sessioni posturali (`src/services/sessioniPosturaliCatalogPrefetch.ts`)

89 righe che implementano un piccolo store osservabile, il pezzo di gestione stato più sofisticato
dell'app fuori da React Query.

**Struttura**:

```typescript
let catalog: SessionePosturaleDto[] | null = null;
const coverBySessionId = new Map<number, string | null>();
const sessionById = new Map<number, SessionePosturaleDto>();
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
```

Tre indici derivati dalla stessa lista, per accessi O(1) per id, più un riferimento alla richiesta in
volo e un set di listener.

**Deduplicazione delle richieste concorrenti**:

```71:88:src/services/sessioniPosturaliCatalogPrefetch.ts
export function prefetchSessioniPosturaliCatalog(): Promise<void> {
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const sessioni = await fetchSessioniPosturali();
      applySessioniPosturaliCatalog(sessioni);
      const urls = sessioni
        .map((s) => s.immagineCopertinaUrl)
        .filter((url): url is string => typeof url === 'string' && url.length > 0);
      await prefetchCoverImages(urls);
    } catch {
      // prefetch non bloccante
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}
```

Il pattern `inflight` garantisce che chiamate simultanee condividano una sola richiesta HTTP — la
stessa garanzia che React Query offrirebbe gratuitamente.

**Prefetch delle immagini**:

```typescript
async function prefetchCoverImages(urls: string[]): Promise<void> {
  const unique = [...new Set(urls.filter((url) => url.length > 0))];
  await Promise.allSettled(unique.map((url) => Image.prefetch(url)));
}
```

`Image.prefetch` di React Native scarica le copertine nella cache immagini nativa, così quando la
lista viene renderizzata le immagini appaiono già pronte. `Promise.allSettled` fa sì che un'immagine
non scaricabile non blocchi le altre. È un'ottimizzazione percepibile e ben implementata.

**Osservabilità**:

```typescript
export function subscribeSessioniPosturaliCatalog(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
```

Sottoscrizione con funzione di annullamento, adatta all'uso in `useEffect`. `notifyListeners` è
invocata da `applySessioniPosturaliCatalog`, quindi le schermate montate si aggiornano quando il
catalogo arriva.

**API di lettura**:

| Funzione | Ritorno |
|---|---|
| `getSessioniPosturaliCatalog()` | `SessionePosturaleDto[]` (array vuoto se non caricato) |
| `getSessionePosturaleById(id)` | `SessionePosturaleDto \| undefined` |
| `getSessionePosturaleCoverUrl(id)` | `string \| null \| undefined` |
| `getSessioniPosturaliCoversRecord()` | `Record<number, string \| null>` |

Il tipo di ritorno a tre stati di `getSessionePosturaleCoverUrl` è intenzionale e ben pensato:
`undefined` = sessione non in cache, `null` = sessione presente ma senza copertina, `string` = URL.
Permette a chi chiama di distinguere "non lo so ancora" da "non c'è".

`clearSessioniPosturaliCatalogCache()` azzera tutto, incluso `inflight`. **Non è chiamata da
`cleanAndRefreshCaches`**: la pulizia cache dal profilo lascia questa cache popolata. È
un'incoerenza da correggere.

### 3. Catalogo fitness (`src/services/fitnessCatalogPrefetch.ts`)

Struttura identica alla precedente, per il modulo Fitness non raggiungibile. Codice morto per
duplicazione: quando il modulo Fitness verrà rimosso, questo file va con lui. Vedi
[08](./08-modulo-sessioni-e-fitness.md).

---

## 13.7 `cleanAndRefreshCaches`

L'unico punto in cui l'utente può intervenire sulle cache, esposto da "Pulisci cache e aggiorna" nel
profilo.

```13:22:src/services/appCacheService.ts
export async function cleanAndRefreshCaches(queryClient: QueryClient): Promise<void> {
  queryClient.clear();
  try {
    await AsyncStorage.removeItem(YOUTUBE_ACCESS_TOKEN_KEY);
  } catch {
    // ignora
  }
  clearHlsDurationCache();
  await queryClient.invalidateQueries();
}
```

Cosa fa, nell'ordine:

1. `queryClient.clear()` — svuota **tutta** la cache React Query, incluse le query attive.
2. Rimuove `@youtube_access_token` (chiave legacy, mai scritta nella versione attuale).
3. `clearHlsDurationCache()` — azzera la `Map` delle durate video.
4. `queryClient.invalidateQueries()` — invalida tutte le query, forzando il refetch di quelle montate.

Cosa **non** fa (correttamente): non toccare `@mobilitas_jwt` né
`@mobilitas_user_profile`. La sessione resta attiva, come promesso dal testo della modale.

Due punti da sistemare:

- **Cache dei cataloghi non svuotate**: `clearSessioniPosturaliCatalogCache()` e l'equivalente
  fitness non vengono chiamate. Chi usa la pulizia cache per risolvere un problema sui dati delle
  sessioni non ottiene l'effetto atteso.
- `clear()` seguito da `invalidateQueries()` è parzialmente ridondante: dopo `clear()` non restano
  query in cache da invalidare, ma le query **montate** vengono rifetchate dal `clear()` stesso.
  La chiamata non è dannosa, solo superflua.

Il testo della modale cita ancora il *"token YouTube locale"*, riferimento incomprensibile per
l'utente e residuo dell'integrazione legacy.

---

## 13.8 Ottimizzazioni di performance presenti

| Tecnica | Dove | Beneficio |
|---|---|---|
| `Image.prefetch` delle copertine | prefetch cataloghi sessioni/fitness | Immagini già in cache al render |
| Deduplicazione `inflight` | prefetch cataloghi | Una sola richiesta per chiamate concorrenti |
| Cache durate HLS | `hlsDuration.ts` | Evita di riscaricare i manifest |
| `enabled` sulle query | quasi tutte | Nessuna richiesta senza i parametri necessari o senza permessi |
| Query lazy legate a modali | `CreaAcquistoModal`, recensioni | Nessuna richiesta se la modale non si apre |
| Debounce della ricerca pazienti | `BookVisitScreen` | Riduce le richieste durante la digitazione |
| `useMemo` / `useCallback` | tutte le schermate complesse | Evita ricalcoli e re-render |
| `keyExtractor` sulle `FlatList` | tutte le liste | Riconciliazione efficiente |
| `Map` di indici per id | prefetch cataloghi | Lookup O(1) invece di `find` |
| `PixelRatio.roundToNearestPixel` | `SpineIcon` | Rendering nitido senza sub-pixel |

---

## 13.9 Cosa manca

1. **Persistenza della cache React Query.** Non c'è `@tanstack/query-async-storage-persister`: ad ogni
   avvio a freddo tutte le liste ripartono da zero. Persistere le query a lettura lunga (studi,
   servizi, cataloghi corsi) renderebbe l'avvio molto più rapido, anche offline.
2. **Rilevamento della connettività.** Senza NetInfo e `onlineManager`, l'app non distingue "errore
   del server" da "sei offline", e non riprova automaticamente al ritorno della rete. Il messaggio di
   errore generico è l'unico feedback.
3. **`retry` selettivo.** Ritentare tre volte un `403` o un `404` è tempo perso e messaggi lenti.
4. **Default espliciti sul `QueryClient`.** Un `defaultOptions` con `staleTime` e `retry` sensati
   eliminerebbe la necessità di ripetere `staleTime: 60_000` in ogni chiamata (e la dimenticanza in 7
   query su 16).
5. **Storage cifrato per il JWT** (`expo-secure-store`).
6. **Uniformare i moduli senza React Query**, eliminando le cache in-memory scritte a mano che ne
   replicano le funzioni.
7. **Chiamare `clearSessioniPosturaliCatalogCache` in `cleanAndRefreshCaches`.**
8. **Unificare le query key duplicate** (`visite-studi` / `profile-review-studi` e la coppia
   sull'osteopata di riferimento).
