# Mobilitas Academy — Documentazione completa dell’applicazione

## Indice

1. [Scopo del documento](#1-scopo-del-documento)
2. [Panoramica prodotto](#2-panoramica-prodotto)
3. [Repository e naming](#3-repository-e-naming)
4. [Stack tecnologico](#4-stack-tecnologico)
5. [Architettura applicativa](#5-architettura-applicativa)
6. [Struttura del repository](#6-struttura-del-repository)
7. [Schermate e responsabilità](#7-schermate-e-responsabilità)
8. [Flussi end-to-end](#8-flussi-end-to-end)
9. [Contratti API e integrazione backend](#9-contratti-api-e-integrazione-backend)
10. [Integrazioni esterne](#10-integrazioni-esterne)
11. [Configurazioni runtime, native e deploy](#11-configurazioni-runtime-native-e-deploy)
12. [UX tecnica: loading, errori, resilienza](#12-ux-tecnica-loading-errori-resilienza)
13. [Sicurezza lato client](#13-sicurezza-lato-client)
14. [Qualità, test e tooling](#14-qualità-test-e-tooling)
15. [Debito tecnico e incongruenze](#15-debito-tecnico-e-incongruenze)
16. [Glossario dominio](#16-glossario-dominio)
17. [Mappa file chiave](#17-mappa-file-chiave-indice-rapido)
18. [Piano evolutivo consigliato (90 giorni)](#18-piano-evolutivo-consigliato-90-giorni)
19. [Conclusione](#19-conclusione)

---

## 1. Scopo del documento

Questo documento descrive in modo approfondito l’app mobile **Mobilitas Academy**, coprendo:

- visione prodotto;
- architettura tecnica;
- struttura del codice;
- flussi utente principali;
- integrazioni esterne;
- configurazioni runtime e build;
- sicurezza lato client;
- limiti attuali e possibili evoluzioni.

L’obiettivo è fornire una base unica e aggiornata al codice per onboarding, manutenzione, audit tecnico e pianificazione evolutiva.

---

## 2. Panoramica prodotto

Mobilitas Academy è un’app mobile orientata a due macro-domini:

- **Formazione**: fruizione di corsi video (corsi, moduli, lezioni, progressi);
- **Operatività clinico-sportiva**: gestione visite osteopatiche e prenotazioni fitness.

L’app include anche:

- autenticazione utente con sessione persistita;
- area profilo con utility e funzioni di supporto;
- integrazioni esterne per contenuti e token (YouTube, Firebase Cloud Functions, Cloudflare Stream) dove configurato.

### 2.1 Profili utente e comportamento adattivo

La UX cambia in base al ruolo dell’utente autenticato (ad esempio paziente vs osteopata):

- nella gestione visite, l’utente paziente vede il proprio storico prenotazioni;
- l’utente osteopata può visualizzare agenda giornaliera e prenotare per pazienti selezionati.

I ruoli sono veicolati dal profilo backend (`ruoli`) e consumati nel frontend per abilitare o disabilitare percorsi. Dopo il login, `GET /auth/me` arricchisce il profilo locale con dati **osteopata** (se presente `osteopataId`) e **paziente** (se il ruolo include paziente), vedi `src/services/authApi.ts`.

---

## 3. Repository e naming

- Cartella di lavoro tipica: `mobilitas-academy-frontend`.
- In `package.json` il campo **`name`** è ancora `studio-osteopatico-frontend` (legacy npm); il prodotto e `app.json` usano **Mobilitas Academy** / slug `mobilitas-academy`.
- Identifiers nativi: `com.mobilitas.academy` (iOS bundle id, Android package).

---

## 4. Stack tecnologico

### 4.1 Core (da `package.json`)

| Area | Tecnologia |
|------|------------|
| Framework | **Expo SDK ~54** + **React Native 0.81** |
| React | **19.1** |
| Linguaggio | **TypeScript ~5.9** |
| Navigazione | **React Navigation 7** (bottom tabs + stack) |
| Server state | **TanStack React Query 5** |
| HTTP | **Axios** |
| Video HLS | **`expo-av`** (Video, Audio mode) |
| Orientamento | **`expo-screen-orientation`** |
| OAuth app | **`expo-auth-session`** (flussi Google/YouTube lato hook) |
| Storage | **AsyncStorage** |
| Icone | **@expo/vector-icons** (Ionicons) |

Dipendenze dichiarate ma **non referenziate nel codice sotto `src/`** al momento della stesura: `react-native-youtube-iframe`, `react-native-webview` (possibile uso futuro o residuo da rimuovere o integrare).

### 4.2 Runtime e toolchain

- Avvio dev: `npm run start` → `expo start`;
- Build native locali: `expo run:ios` / `expo run:android`;
- Build cloud: **EAS** (`eas build`, `eas submit`);
- Repository con cartelle native **`ios/`** e **`android/`** (prebuild / progetto gestito).

Riferimenti: `package.json`, `app.json`, `eas.json`, `tsconfig.json`.

---

## 5. Architettura applicativa

### 5.1 Entrypoint e bootstrap

- **`index.ts`**: `registerRootComponent(App)` (entry Expo).
- **`App.tsx`**: shell dell’app, `ErrorBoundary`, provider, navigazione.

Ordine dei provider (dal root):

1. **`ErrorBoundary`** (classe definita inline in `App.tsx`) — cattura errori React e mostra schermata di fallback;
2. **`SafeAreaProvider`** (`react-native-safe-area-context`);
3. **`QueryClientProvider`** (istanza `QueryClient` locale in `App.tsx`);
4. **`AuthProvider`** (`src/context/AuthContext.tsx`);
5. **`RootNavigator`**: `NavigationContainer` + stack root condizionale (`Login` vs `Main`).

### 5.2 Navigazione

**Root stack** (`RootStack` in `App.tsx`):

- **`Login`**: utente non autenticato (`LoginScreen`);
- **`Main`**: tab navigator autenticato (`MainTabNavigator`).

**Tab principali** (`MainTabNavigator`):

| Tab (name) | Componente | Note |
|------------|--------------|------|
| `Home` | `HomeScreen` | Header tab nascosto |
| `Courses` | `CoursesStack` | Stack interno corsi |
| `StudioVisits` | `VisiteStack` | Label UI: «Visite» |
| `Fitness` | `FitnessStack` | Stack fitness |
| `Profile` | `ProfileScreen` | |

**`CoursesStack`** (stack dentro la tab Corsi):

1. `CoursesList` → `CoursesScreen`
2. `CourseVideos` → `CourseVideosScreen`
3. `VideoPlayer` → `VideoPlayerScreen`

**`VisiteStack`** (`src/screens/visite/VisiteStack.tsx`):

1. `VisiteMenu` → `VisiteMenuScreen` (route iniziale)
2. `BookVisit` → `BookVisitScreen`
3. `GestioneVisite` → `GestioneVisiteScreen`

**`FitnessStack`** (`src/screens/fitness/FitnessStack.tsx`):

1. `FitnessCalendar` → `FitnessScreen` (hub «Calendario Fitness»: riepilogo, link a prenotazioni e calendario)
2. `FitnessBookings` → `FitnessBookingsScreen` (prenotazioni attive)
3. `FitnessSessionsCalendar` → `FitnessSessionsCalendarScreen` (calendario sessioni e prenotazione)

### 5.3 Stato globale e stato locale

- **Auth**: `AuthContext` — `isReady`, `isSignedIn`, `userProfile`, `signIn`, `signOut`. Il flag `isSignedIn` deriva dalla presenza del JWT in memoria dopo l’hydration da storage.
- **Server state**: React Query (`useQuery` / `useMutation` dove usati; invalidazione su login in `signIn`).
- **UI locale**: `useState` / `useFocusEffect` nelle schermate.

### 5.4 Layer servizi e API

Il client HTTP centralizzato è **`src/api/index.ts`** (`apiClient` Axios):

- **`API_BASE_URL`**: costante **`https://mobilitas-backend-990845221858.europe-west8.run.app/api`** (origine produzione **fissa nel codice**, non letta da `.env`; vedi commento in `.env.example`).
- Interceptor **request**: aggiunge `Authorization: Bearer` se esiste token in AsyncStorage.
- Interceptor **response** su **401** (salvo path `/auth/login`, `/auth/register`, `/auth/refresh`): tenta **`POST /auth/refresh`** con il token attuale; in caso di successo aggiorna storage e **ripete la richiesta originale**; in caso di fallimento chiama `clearAllAuth()`.

Servizi dominio (cartella `src/services/`): tra gli altri `authApi`, `authTokenStorage`, `formazioneService`, `formazioneCourseContent`, `visiteService`, **`studioVisitsService`** (studi, osteopati, disponibilità calcolata, prenotazioni `visite-studio`), `fitnessService`, `acquistiService`, `serviziService`, `pazientiService`, `youtubeService`, **`youtubeTokenService`**, `firebaseService`, `cloudflareService`, **`appCacheService`**.

Hook dedicati in `src/hooks/`: ad esempio `useFormazioneCourses`, `useYouTubeAuth`, `useYouTubePlaylist`, `useYouTubeChannelPlaylists`, `useApi`, `useTabBarBottomPadding`.

---

## 6. Struttura del repository

### 6.1 Directory principali

| Path | Contenuto |
|------|-----------|
| `src/screens` | Schermate per feature |
| `src/screens/visite` | Flusso visite (stack, modali, tipi) |
| `src/screens/fitness` | Flusso fitness (stack, tipi) |
| `src/services` | Chiamate API e normalizzazione DTO |
| `src/api` | Configurazione Axios e interceptor |
| `src/context` | Stato globale (auth) |
| `src/components` | UI riusabile (card, bottoni, capitoli, splash, ecc.) |
| `src/hooks` | Hook custom |
| `src/utils` | Date, errori API user-facing, HLS duration, tema, WhatsApp studio |
| `src/theme` | Tema e costanti di stile |
| `src/types` | Tipi condivisi |
| `assets/` | Icone, splash, favicon |
| `ios/`, `android/` | Progetti nativi |
| `scripts/` | Script di supporto (es. `fill-video-durations.js`) |

### 6.2 Documentazione operativa presente

Oltre a questo file:

- `DEPLOYMENT.md`, `BACKEND_SETUP.md`, `TROUBLESHOOTING.md`
- `YOUTUBE_SETUP.md`, `README_YOUTUBE.md`, `REFRESH_TOKEN_SETUP.md`, **`OAUTH_SETUP.md`**
- `TEST_FIREBASE_PROD.md`
- `fonts/README.md`, `.expo/README.md`

---

## 7. Schermate e responsabilità

### 7.1 Accesso e sessione — `src/screens/LoginScreen.tsx`

- Login con **username o email** + password (`POST /api/auth/login`);
- preferenza **ricorda username** (solo identificativo, mai la password);
- feedback errori;
- modale informativa registrazione.

### 7.2 Home — `src/screens/HomeScreen.tsx`

- Dashboard e accessi rapidi verso aree core (visite, corsi, fitness).

### 7.3 Formazione

- **`CoursesScreen.tsx`**: corsi accessibili, stati loading/errore, refresh.
- **`CourseVideosScreen.tsx`**: moduli e lezioni, gerarchia capitoli, durata HLS opzionale (`hlsDuration`), avanzamento.
- **`VideoPlayerScreen.tsx`**:  
  - URL **HLS** (`.m3u8`): riproduzione con **`expo-av`**, mute, velocità, fullscreen modale con **`expo-screen-orientation`** (unlock in fullscreen, lock portrait all’uscita);  
  - URL **non HLS**: area video con thumbnail/placeholder e controlli limitati (nessun player WebView/YouTube integrato in questa schermata al momento).

### 7.4 Fitness

- **`FitnessScreen.tsx`**: hub con conteggio prenotazioni, navigazione verso **Prenotazioni attive** e **Calendario sessioni**; supporto WhatsApp in errore (`StudioWhatsAppSupportButton`).
- **`FitnessSessionsCalendarScreen.tsx`**: calendario disponibilità, prenotazione sessione.
- **`FitnessBookingsScreen.tsx`**: elenco prenotazioni, annullamento con conferma.

### 7.5 Visite

- **`VisiteMenuScreen.tsx`**: accesso a gestione visite e nuova prenotazione.
- **`GestioneVisiteScreen.tsx`**: comportamento per ruolo (paziente vs osteopata), fallback WhatsApp dove previsto.
- **`BookVisitScreen.tsx`**: wizard prenotazione (studi, osteopati, slot da `studioVisitsService`, paziente/acquisti per osteopata, invio al backend).

Componenti di supporto: `SelectModal`, `CreaAcquistoModal`, `visiteFormatting.ts`, tipi in `types.ts`.

### 7.6 Profilo — `src/screens/ProfileScreen.tsx`

- Snapshot profilo e sync con `/auth/me` dove applicabile;
- utilità **pulizia cache** (React Query + token OAuth YouTube in storage + cache durate HLS) tramite **`appCacheService.cleanAndRefreshCaches`** senza logout;
- link recensione Google studio se esposto dal backend;
- logout (`signOut` → `POST /auth/logout` best-effort + clear storage).

---

## 8. Flussi end-to-end

### 8.1 Autenticazione

1. Credenziali in `LoginScreen` → `signIn` in `AuthContext`.
2. `loginMobilitas` → **`POST /api/auth/login`** → JWT + payload profilo base.
3. `persistLoginSession` salva token e profilo in AsyncStorage.
4. `fetchCurrentUser` → **`GET /api/auth/me`** con arricchimento osteopata/paziente e aggiornamento storage.
5. Root navigator mostra `Main`.

**Bootstrap all’avvio** (`AuthContext`):

- lettura parallela token + profilo da storage; se c’è token, **UI autenticata immediata** (evita flash del login);
- `restorePersistedSession()` → validazione con **`GET /auth/me`**:
  - **401**: `clearAllAuth()`, utente disconnesso;
  - **altri errori / rete**: si **mantiene** sessione locale (comportamento «offline permissivo» documentato in `authApi.ts`).

File chiave: `src/context/AuthContext.tsx`, `src/services/authApi.ts`, `src/services/authTokenStorage.ts`.

### 8.2 Corsi e video

1. **`GET /formazione/corsi/accessibili`** — lista corsi (`fetchCorsi`).
2. Apertura corso → **`GET /formazione/corsi/{corsoId}/moduli`** e **`GET /formazione/moduli/{moduloId}/lezioni`**.
3. Se manca la durata e l’URL è HLS, stima da manifest (`src/utils/hlsDuration.ts`).
4. Player per stream HLS in `VideoPlayerScreen`.

### 8.3 Visite

- **Gestione**: paziente vs osteopata tramite `visiteService` (es. visite per paziente, agenda filtrata).
- **Prenotazione**: studi/osteopati/disponibilità tramite **`studioVisitsService`**; creazione visita e flussi acquisti/pazienti tramite `visiteService`, `acquistiService`, `pazientiService`, `serviziService` (coerente con `BookVisitScreen`).

### 8.4 Fitness

1. **`GET /fitness/calendario-sessioni`** (query opzionali per filtri data/sessione/istruttore).
2. **`GET /fitness/partecipanti-sessioni`** — prenotazioni dell’utente (o elenco gestito dal backend).
3. **`POST /fitness/partecipanti-sessioni`** — crea prenotazione (`utenteId`, `sessioneId`).
4. **`DELETE /fitness/partecipanti-sessioni/{id}`** — annullamento.

---

## 9. Contratti API e integrazione backend

### 9.1 Pattern risposta

Envelope tipico (`ApiResponseDto` / analoghi): `success`, `message`, `error`, `data`. I servizi normalizzano risposte eterogenee per l’UI.

### 9.2 Domini principali

Prefisso client: **`/api`** su `API_BASE_URL`.

Esempi di famiglie usate: `auth/*`, `formazione/*`, `visite/*`, `visite-studio/*`, `fitness/*`, `studi/*`, `osteopati/*`, `pazienti/*`, `acquisti/*`, `servizi/*`, eventuale **`youtube/token`** per token YouTube lato backend.

### 9.3 Token e refresh

- Header **`Authorization: Bearer <JWT>`**;
- refresh automatico su 401 tramite **`POST /api/auth/refresh`** nell’interceptor in `src/api/index.ts`.

---

## 10. Integrazioni esterne

### 10.1 YouTube

- **`youtubeService.ts`**: chiamate Data API dove serve (playlist, metadati; dipende da chiavi/token disponibili).
- **`youtubeTokenService.ts`**: ottiene access token con priorità:  
  1) **Firebase Functions** (se `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` configurato in build),  
  2) **backend** `GET ${API_BASE_URL}/youtube/token` se non si usa Firebase,  
  3) variabili ambiente (client secret / refresh — **sconsigliato in produzione**).  
  Cache in-memory del token con scadenza anticipata.
- **`useYouTubeAuth.ts`**: OAuth con **`expo-auth-session`**, redirect `mobilitas-academy://oauth`, token salvato in AsyncStorage (`@youtube_access_token`).
- Hook **`useYouTubePlaylist`**, **`useYouTubeChannelPlaylists`**: consumo playlist/canale.

### 10.2 Firebase

- **`firebaseService.ts`**: bridge verso Cloud Functions (es. token YouTube), URL da env (`EXPO_PUBLIC_FIREBASE_*`, `EXPO_PUBLIC_FIREBASE_USE_PRODUCTION` in `eas.json` per profili build).

### 10.3 Cloudflare Stream

- **`cloudflareService.ts`**: account, subdomain, token (documentazione in `.env.example` avverte di non esporre token in produzione sul client).

### 10.4 Storage locale (`authTokenStorage.ts`)

JWT, profilo utente, preferenze login; separato dal token OAuth YouTube gestito dalla hook / `appCacheService`.

---

## 11. Configurazioni runtime, native e deploy

### 11.1 `app.json` (Expo)

- Nome **Mobilitas Academy**, slug `mobilitas-academy`, **scheme** `mobilitas-academy` (deep link / OAuth).
- **`newArchEnabled`: true** (Nuova architettura React Native).
- **Android**: `edgeToEdgeEnabled`, package `com.mobilitas.academy`, adaptive icon.
- **iOS**: `bundleIdentifier` `com.mobilitas.academy`, tablet, testo microfono in `infoPlist`.
- **Plugin**: `expo-av` (permesso microfono con messaggio localizzato), **`expo-screen-orientation`**.

### 11.2 `eas.json`

Profili **`development`** (client dev, simulatore iOS), **`preview`**, **`production`** (autoIncrement versione iOS).  
Variabile comune: **`EXPO_PUBLIC_FIREBASE_USE_PRODUCTION`** (`false` in development, `true` in preview/production).  
Sezione **`submit.production`** contiene placeholder Apple da sostituire prima del submit reale.

### 11.3 Variabili ambiente

**`.env.example`**: elenca Firebase, YouTube, Cloudflare; ribadisce che **`EXPO_PUBLIC_*`** è pubblico nel bundle e che l’**URL API principale non è configurabile da `.env`** (è in `src/api/index.ts`).

### 11.4 Android / iOS

- Android: `AndroidManifest.xml`, `build.gradle` sotto `android/app/`.
- iOS: `ios/Mobilitas/Info.plist` (URL scheme allineato a Expo, orientamenti, ATS, dichiarazione crittografia).

---

## 12. UX tecnica: loading, errori, resilienza

- Indicatori di caricamento e pull-to-refresh dove implementati.
- Messaggi user-facing centralizzati in parte tramite **`getUserFacingApiErrorMessage`** (`src/utils/apiErrorMessage.ts`).
- **`ErrorBoundary`** in `App.tsx` per crash non gestiti.
- Date picker e differenze iOS/Android dove presenti nelle schermate prenotazione.
- Tab bar floating con padding bottom dedicato (`useTabBarBottomPadding`) per non coprire contenuti.

---

## 13. Sicurezza lato client

### 13.1 Punti positivi

- Documentazione esplicita su rischio `EXPO_PUBLIC_*` in `.env.example`.
- Bearer + refresh centralizzato sugli endpoint protetti.
- Percorsi preferiti per segreti YouTube: Firebase o endpoint backend, non env client in produzione.

### 13.2 Rischi

- Possibilità teorica di configurare **client secret** / refresh token in variabili pubbliche se qualcuno compila `.env` in modo errato.
- Logging dettagliato in `authApi` (login) in console: utile in dev, da mitigare in release se necessario.

### 13.3 Raccomandazioni

1. Nessun segreto OAuth nel client in build store.
2. Proxy server-side per provider terzi.
3. Ruotare chiavi eventualmente esposte.
4. Ridurre log sensibili nelle build di produzione.

---

## 14. Qualità, test e tooling

- TypeScript con **`"strict": true`** in `tsconfig.json` (estende `expo/tsconfig.base`).
- **Non** risultano script **`test`**, **`lint`** o **`format`** in `package.json` al momento della stesura.
- Impatto: QA prevalentemente manuale; consigliati lint, typecheck CI, test su servizi e smoke su login / prenotazioni / corsi.

---

## 15. Debito tecnico e incongruenze

- `package.json` **name** non allineato al brand (`studio-osteopatico-frontend`).
- Dipendenze **`react-native-youtube-iframe`** e **`react-native-webview`** senza uso in `src/`.
- **`VideoPlayerScreen`**: per stream non-HLS l’esperienza di riproduzione è limitata rispetto a HLS.
- Alcune azioni UI (es. «Segna come completato») possono essere placeholder — verificare il file prima di promettere comportamento in release.
- Permessi Android: verificare che siano minimi necessari per le funzioni realmente usate.

---

## 16. Glossario dominio

- **Visita**: appuntamento clinico paziente–osteopata.
- **Studio**: sede fisica.
- **Osteopata**: professionista in agenda e prenotazioni.
- **Paziente**: destinatario della visita.
- **Acquisto**: pacchetto/servizio prenotabile.
- **Servizio**: definizione di prestazione.
- **Disponibilità / slot**: finestre temporali prenotabili.
- **Corso / modulo / lezione**: gerarchia didattica.
- **Sessione fitness**: evento prenotabile a calendario.

---

## 17. Mappa file chiave (indice rapido)

| Area | File |
|------|------|
| Bootstrap | `index.ts`, `App.tsx` |
| Auth | `src/context/AuthContext.tsx`, `src/services/authApi.ts`, `src/services/authTokenStorage.ts` |
| HTTP | `src/api/index.ts` |
| Formazione | `src/screens/CoursesScreen.tsx`, `CourseVideosScreen.tsx`, `VideoPlayerScreen.tsx`, `src/services/formazioneService.ts`, `formazioneCourseContent.ts`, `src/hooks/useFormazioneCourses.ts`, `src/utils/hlsDuration.ts` |
| Visite | `VisiteStack.tsx`, `VisiteMenuScreen.tsx`, `GestioneVisiteScreen.tsx`, `BookVisitScreen.tsx`, `src/services/visiteService.ts`, **`studioVisitsService.ts`** |
| Fitness | `FitnessStack.tsx`, `FitnessScreen.tsx`, `FitnessSessionsCalendarScreen.tsx`, `FitnessBookingsScreen.tsx`, `src/services/fitnessService.ts` |
| Profilo | `ProfileScreen.tsx`, **`appCacheService.ts`** |
| YouTube / media | `youtubeService.ts`, **`youtubeTokenService.ts`**, `firebaseService.ts`, `cloudflareService.ts`, `useYouTubeAuth.ts`, `useYouTubePlaylist.ts`, `useYouTubeChannelPlaylists.ts` |
| Errori UI | `src/utils/apiErrorMessage.ts` |
| Build | `app.json`, `eas.json`, `.env.example`, `android/app/src/main/AndroidManifest.xml`, `ios/Mobilitas/Info.plist` |

---

## 18. Piano evolutivo consigliato (90 giorni)

### Fase 1 (settimane 1–3) — Sicurezza e baseline

- Nessun segreto nel client; hardening logging.
- Lint + typecheck in CI.

### Fase 2 (settimane 4–8) — Affidabilità

- Test unitari su `authApi`, interceptor, servizi visite/fitness/formazione.
- Smoke E2E su flussi principali.
- Allineamento naming npm / repo se richiesto dal team release.

### Fase 3 (settimane 9–12) — UX e performance

- Caching liste lunghe e strategie query React Query.
- UX coerente per vuoti ed errori.
- Completamento player per formati non-HLS o rimozione dipendenze inutilizzate.

---

## 19. Conclusione

Mobilitas Academy ha una base solida su **autenticazione con refresh**, **formazione video HLS**, **visite** (incluso catalogo studi/slot tramite `studioVisitsService`) e **fitness**, con navigazione chiara e servizi separati per dominio. Le priorità strategiche restano: **sicurezza delle integrazioni**, **qualità automatizzata** (test/lint/CI) e **coerenza tra config store, nome pacchetto npm e dipendenze effettivamente usate**. Intervenendo su questi assi, il progetto resta pronto per rilasci rapidi e controllati.
