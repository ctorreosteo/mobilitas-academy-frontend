# 01 — Panoramica e architettura

## 1.1 Cos'è l'applicazione

Mobilitas Academy è l'app mobile (iOS + Android) dello Studio Mobilitas, uno studio osteopatico di
Torino. Il claim presente nel codice della splash screen è
`"Lo Studio Osteopatico più importante di Torino"` (`src/components/SplashScreen.tsx:393-395`).

L'app copre quattro domini funzionali:

1. **Visite osteopatiche** — prenotazione su slot di disponibilità reali, agenda giornaliera per lo
   staff, storico visite per il paziente, storico pagamenti con download della fattura PDF.
2. **Sessioni posturali di gruppo** — calendario mensile delle sessioni in presenza, prenotazione e
   annullamento.
3. **Formazione video** — cataloghi di corsi organizzati in moduli e lezioni, con video HLS su
   Cloudflare Stream.
4. **Area personale** — profilo, recensioni Google per studio, manutenzione cache, logout,
   richiesta di eliminazione account.

Un quinto dominio, **Fitness**, è completamente implementato nel codice ma non è montato in
navigazione: è stato sostituito dal modulo Sessioni posturali. Il commento in
`src/screens/fitness/FitnessStack.tsx:11` lo dichiara esplicitamente:
`"Tenuto nel progetto ma non montato nella tab bar: sostituito da Sessioni posturali."`

## 1.2 Doppia personalità in base al ruolo

L'aspetto architetturalmente più caratterizzante è che **la stessa build serve due prodotti diversi**.
La discriminante è l'array `ruoli: string[]` del profilo utente, valutato da due predicati in
`src/services/authApi.ts`:

```75:100:src/services/authApi.ts
export function hasPazienteRole(roles: string[] | null | undefined): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => role.toUpperCase().includes('PAZIENTE'));
}

/** Ruoli puramente app mobile: non danno accesso alle API `/api/formazione`. */
const MOBILE_ONLY_ROLES = new Set([
  'ROLE_PAZIENTE',
  'ROLE_UTENTE_MOBILE_APP',
  'ROLE_ABBONATO_MOBILE_APP',
]);

/**
 * True se l'utente ha almeno un ruolo gestionale (dipendente/osteopata/manager/admin).
 * È la condizione che il backend usa per `/api/formazione`: chi ha solo ruoli mobile
 * riceve 403. Un osteopata che è anche paziente resta gestionale.
 */
export function hasGestionaleRole(roles: string[] | null | undefined): boolean {
  if (!Array.isArray(roles)) return false;
  return roles.some((role) => {
    const normalized = role.trim().toUpperCase();
    if (!normalized) return false;
    const withPrefix = normalized.startsWith('ROLE_') ? normalized : `ROLE_${normalized}`;
    return !MOBILE_ONLY_ROLES.has(withPrefix);
  });
}
```

Semantica dei due predicati:

- `hasPazienteRole` è una **substring match** case-insensitive su `PAZIENTE`. Basta che un ruolo
  contenga quella sequenza (es. `ROLE_PAZIENTE`, `PAZIENTE_VIP`) per risultare `true`.
- `hasGestionaleRole` è **inverso ed esclusivo**: è `true` se esiste almeno un ruolo che *non*
  appartiene ai tre ruoli mobile-only. Un osteopata che sia anche paziente risulta quindi
  contemporaneamente `hasPazienteRole === true` e `hasGestionaleRole === true`.

Il terzo discriminante, indipendente dai ruoli, è **`profile.osteopataId`**: se è un numero maggiore
di zero l'utente viene trattato come operatore in due punti chiave (agenda giornaliera in
`GestioneVisiteScreen`, prenotazione a nome di terzi in `BookVisitScreen`).

Matrice completa in [03 — Autenticazione, ruoli e sessione](./03-autenticazione-ruoli-e-sessione.md).

## 1.3 Stack tecnologico

Da `package.json`:

### Runtime e framework

| Pacchetto | Versione | Ruolo |
|---|---|---|
| `expo` | `~54.0.20` | SDK e toolchain |
| `react-native` | `0.81.5` | Runtime nativo |
| `react` | `19.1.0` | Libreria UI |
| `typescript` | `~5.9.2` (dev) | Tipizzazione, `strict: true` |
| `@types/react` | `~19.1.0` (dev) | Tipi React |

`newArchEnabled: true` in `app.json` e `RCTNewArchEnabled: true` nell'`Info.plist`: l'app gira sulla
**New Architecture** di React Native (Fabric + TurboModules).

### Navigazione

| Pacchetto | Versione |
|---|---|
| `@react-navigation/native` | `^7.1.18` |
| `@react-navigation/bottom-tabs` | `^7.5.0` |
| `@react-navigation/stack` | `^7.5.0` |
| `react-native-screens` | `~4.16.0` |
| `react-native-safe-area-context` | `^5.6.1` |

### Dati e rete

| Pacchetto | Versione | Uso |
|---|---|---|
| `@tanstack/react-query` | `^5.90.5` | Cache server-state; usato nei moduli Visite, Corsi, Profilo |
| `axios` | `^1.12.2` | Client HTTP con interceptor JWT e refresh |
| `@react-native-async-storage/async-storage` | `2.2.0` | Persistenza token, profilo, preferenze |

### Media e contenuti

| Pacchetto | Versione | Uso reale |
|---|---|---|
| `expo-av` | `~16.0.7` | Player video HLS + `Audio.setAudioModeAsync` |
| `expo-screen-orientation` | `~9.0.8` | Lock/unlock orientamento in fullscreen |
| `react-native-webview` | `13.15.0` | **Non importato da alcun file `src/`**: dipendenza transitiva di `react-native-youtube-iframe` |
| `react-native-youtube-iframe` | `^2.4.1` | **Non importato da alcun file `src/`**: residuo legacy YouTube |
| `expo-file-system` | `~19.0.24` | Download PDF fattura (API legacy) |
| `expo-sharing` | `~14.0.8` | Condivisione del PDF fattura |
| `expo-linear-gradient` | `~15.0.7` | Gradiente della splash screen |

### Altro

| Pacchetto | Versione | Uso |
|---|---|---|
| `expo-auth-session` | `~7.0.8` | OAuth PKCE Google/YouTube (`useYouTubeAuth`, non raggiungibile da UI) |
| `expo-crypto` | `~15.0.7` | Dipendenza di `expo-auth-session` per PKCE |
| `expo-constants` | `~18.0.13` | Dipendenza SDK |
| `expo-status-bar` | `~3.0.8` | `<StatusBar style="light" />` |
| `@react-native-community/datetimepicker` | `8.4.4` | Date picker in `BookVisitScreen` e `GestioneVisiteScreen` |
| `react-native-vector-icons` | `^10.3.0` | Presente in dependencies; le icone effettive arrivano da `@expo/vector-icons` (Ionicons) |

**Assenze rilevanti**: nessun framework di test (Jest, Detox), nessun linter (ESLint), nessun
formatter (Prettier), nessuna libreria di form (React Hook Form, Formik), nessuna libreria di
validazione schema (Zod, Yup), nessun sistema di i18n, nessun tool di error reporting (Sentry).

## 1.4 Architettura a livelli

L'app segue una separazione a quattro livelli con dipendenze unidirezionali dall'alto verso il basso.

```
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 1 — Navigazione e bootstrap                             │
│  App.tsx  ·  index.ts                                            │
│  ErrorBoundary → SafeAreaProvider → QueryClientProvider →         │
│  AuthProvider → RootNavigator                                    │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 2 — Schermate e componenti                              │
│  src/screens/**  ·  src/components/**                            │
│  Stato UI locale, orchestrazione chiamate, rendering              │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 3 — Hook e contesto                                     │
│  src/hooks/**  ·  src/context/AuthContext.tsx                     │
│  Wrapper React Query, hook di sessione, hook di layout            │
└──────────────────────────────────────────────────────────────────┘
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│  LIVELLO 4 — Servizi, client HTTP e utility                      │
│  src/services/**  ·  src/api/index.ts  ·  src/utils/**            │
│  DTO, chiamate HTTP, normalizzazione, cache in-memory, formatting  │
└──────────────────────────────────────────────────────────────────┘
```

### Caratteristiche del livello servizi

Ogni file in `src/services/` segue lo stesso pattern:

1. Dichiara le `interface` dei DTO del backend (fedeli ai nomi Java, quindi **in italiano**:
   `titolo`, `descrizione`, `ordine`, `attivo`, `dataAggiunta`).
2. Esporta funzioni `async` che chiamano `apiClient` e **scartano l'envelope**, restituendo
   direttamente `data.data`.
3. Valida la risposta: se `success !== true` o la forma non è quella attesa, lancia un `Error` con
   messaggio italiano.
4. Applica normalizzazioni difensive (accetta array diretti, `content`, `data`, `items`, alias
   camelCase/snake_case).

Le schermate **non conoscono l'envelope**: ricevono già array o oggetti tipizzati, oppure
un'eccezione.

### Envelope di risposta del backend

Definito una sola volta in `src/services/formazioneService.ts:3-8` e reimportato da tutti gli altri
servizi:

```typescript
export interface ApiResponseDto<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string | null;
}
```

## 1.5 Bootstrap applicativo

### Entry point

`index.ts` (5 righe effettive) registra il componente root con Expo:

```typescript
import { registerRootComponent } from 'expo';
import App from './App';
registerRootComponent(App);
```

`package.json` dichiara `"main": "index.ts"`.

### Composizione dei provider

`App.tsx:257-269` compone l'albero nel seguente ordine (dall'esterno all'interno):

```
ErrorBoundary
└── SafeAreaProvider
    └── QueryClientProvider (client={queryClient})
        └── AuthProvider
            └── RootNavigator
```

Implicazioni dell'ordine:

- L'`ErrorBoundary` è il più esterno: intercetta qualunque eccezione di rendering, anche quelle
  originate durante l'idratazione della sessione.
- `QueryClientProvider` sta **fuori** da `AuthProvider`, ed è ciò che permette a `AuthContext` di
  usare `useQueryClient()` per invalidare la cache al login e svuotarla al logout.

### ErrorBoundary

Classe definita in `App.tsx:41-74`. Implementa `getDerivedStateFromError` e `componentDidCatch`
(che logga `'❌ Errore React catturato:'` e l'`errorInfo` in console). La UI di fallback mostra:

- Titolo: `"Ops! Qualcosa è andato storto"`
- Messaggio: `this.state.error?.message` con fallback `"Errore sconosciuto"`
- Suggerimento: `"Controlla la console per i dettagli"`

Non esiste alcun pulsante di recovery o retry: l'utente deve chiudere e riaprire l'app.

### QueryClient

`App.tsx:31`: `const queryClient = new QueryClient();` — **nessuna opzione di default configurata**.
Valgono quindi i default di TanStack Query v5: `staleTime: 0`, `gcTime: 5 minuti`,
`retry: 3` con backoff esponenziale, `refetchOnWindowFocus: true`. I singoli hook sovrascrivono
localmente `staleTime` dove serve (tipicamente `60_000`).

### Gate di sessione

`RootNavigator` (`App.tsx:225-255`) legge `isReady` e `isSignedIn` da `useAuth()`:

- `!isReady` → schermata di boot: `View` centrata con `ActivityIndicator size="large"` colore
  `theme.colors.secondary` su sfondo `theme.colors.background.primary`. **Nessun testo**.
- `isReady && !isSignedIn` → `RootStack.Screen name="Login"`.
- `isReady && isSignedIn` → `RootStack.Screen name="Main"` (il tab navigator).

Le due schermate sono **mutuamente esclusive nella dichiarazione del navigator**, non semplicemente
nascoste: al cambio di `isSignedIn` React Navigation smonta l'una e monta l'altra, azzerando lo
stack. Non esiste quindi alcun modo di tornare indietro al Login con il gesto di back.

`RootStack.Navigator` ha `headerShown: false` e `cardStyle: { paddingTop: 12 }`.

### Tema di navigazione

`App.tsx:32-39` estende `DefaultTheme` sovrascrivendo `background` e `card` con
`theme.colors.background.primary` (`#001831`), per evitare il flash bianco durante le transizioni.

## 1.6 Struttura del repository

```
mobilitas-academy-frontend/
├── App.tsx                     Root: provider, tab bar, gate di sessione, ErrorBoundary
├── AppTest.tsx                 Componente di test isolato — NON referenziato (codice morto)
├── index.ts                    registerRootComponent
├── app.json                    Configurazione Expo
├── eas.json                    Profili di build/submit EAS
├── tsconfig.json               Estende expo/tsconfig.base, strict: true
├── package.json                Dipendenze e script
├── get_refresh_token.py        Script Python one-off per ottenere il refresh token YouTube
├── .env / .env.example         Variabili EXPO_PUBLIC_* (il .env reale è gitignorato)
├── .easignore                  Esclusioni dal tarball EAS (include tutti i .md legacy e scripts/)
│
├── assets/                     icon.png, adaptive-icon.png, splash-icon.png, favicon.png, logo_verde.png
├── fonts/README.md             Istruzioni non applicate per installare Montserrat
├── scripts/fill-video-durations.js   Script deprecato: stampa un avviso ed esce con 0
├── android/                    Progetto nativo generato da prebuild
├── ios/                        Progetto nativo generato da prebuild (target "Mobilitas")
│
├── docs/                       ← questa documentazione
├── DOCUMENTAZIONE_COMPLETA_APP.md    Documento storico, parzialmente obsoleto
├── DEPLOYMENT.md               Guida deploy
├── BACKEND_SETUP.md            Setup backend
├── OAUTH_SETUP.md              Setup OAuth Google
├── REFRESH_TOKEN_SETUP.md      Setup refresh token YouTube
├── README_YOUTUBE.md           Note integrazione YouTube
├── YOUTUBE_SETUP.md            Setup YouTube
├── TEST_FIREBASE_PROD.md       Test Firebase in produzione
├── TROUBLESHOOTING.md          Problemi noti
│
└── src/
    ├── api/index.ts            Istanza axios, interceptor JWT, refresh automatico su 401
    ├── context/AuthContext.tsx Provider di sessione
    ├── theme/index.ts          Palette, font, withOpacity
    ├── types/index.ts          Tipi di dominio UI: Course, Chapter, Video, User, Theme
    │
    ├── components/             6 componenti riutilizzabili + 1 non usato (Button)
    │   ├── Button.tsx                      NON usato da nessuna schermata
    │   ├── ChapterSection.tsx              Accordion modulo → lista lezioni
    │   ├── CourseCard.tsx                  Card corso nel catalogo
    │   ├── SpineIcon.tsx                   Icona vettoriale procedurale "colonna vertebrale"
    │   ├── SplashScreen.tsx                Splash animata — NON montata in App.tsx
    │   ├── StudioWhatsAppSupportButton.tsx Pulsante di supporto WhatsApp
    │   └── VideoItem.tsx                   Riga lezione
    │
    ├── hooks/                  7 hook
    │   ├── useApi.ts                       Placeholder su /courses (endpoint inesistente)
    │   ├── useCorsiAziendali.ts            React Query catalogo formazione
    │   ├── useCorsiPosturali.ts            React Query catalogo posturale
    │   ├── useTabBarBottomPadding.ts       Altezza tab bar + 12px di clearance
    │   ├── useYouTubeAuth.ts               OAuth PKCE YouTube — non raggiungibile da UI
    │   ├── useYouTubeChannelPlaylists.ts   Playlist canale → Course[] — non raggiungibile
    │   └── useYouTubePlaylist.ts           Video playlist — non raggiungibile
    │
    ├── screens/
    │   ├── HomeScreen.tsx              Tab Home
    │   ├── LoginScreen.tsx             Root stack Login
    │   ├── ProfileScreen.tsx           Tab Profilo (1238 righe, la più grande)
    │   ├── CourseVideosScreen.tsx      Dettaglio corso: moduli e lezioni
    │   ├── VideoPlayerScreen.tsx       Player video
    │   ├── FitnessScreen.tsx           Hub fitness — non raggiungibile
    │   ├── corsi/       CorsiStack, CorsiCatalogView, CorsiAziendaliScreen, CorsiPosturaliScreen, types
    │   ├── visite/      VisiteStack, VisiteMenuScreen, BookVisitScreen, GestioneVisiteScreen,
    │   │                PagamentiPazienteScreen, CreaAcquistoModal, SelectModal,
    │   │                visiteFormatting, types
    │   ├── sessioni/    SessioniStack, SessioniHomeScreen, SessioniCalendarioScreen,
    │   │                SessioniPrenotazioniScreen, types
    │   └── fitness/     FitnessStack, FitnessSessionsCalendarScreen, FitnessBookingsScreen, types
    │                    (intero sottoalbero non raggiungibile da UI)
    │
    ├── services/               21 file: DTO + chiamate HTTP + cache in-memory
    └── utils/                  7 file: formatting, error mapping, HLS, URL, WhatsApp
```

### File più grandi (righe)

| File | Righe |
|---|---|
| `src/screens/visite/BookVisitScreen.tsx` | 1446 |
| `src/screens/ProfileScreen.tsx` | 1238 |
| `src/screens/visite/GestioneVisiteScreen.tsx` | 886 |
| `src/screens/sessioni/SessioniCalendarioScreen.tsx` | 740 |
| `src/screens/fitness/FitnessSessionsCalendarScreen.tsx` | 713 |
| `src/screens/VideoPlayerScreen.tsx` | 617 |
| `src/screens/visite/CreaAcquistoModal.tsx` | 603 |
| `src/screens/sessioni/SessioniPrenotazioniScreen.tsx` | 553 |
| `src/screens/fitness/FitnessBookingsScreen.tsx` | 548 |
| `src/components/SplashScreen.tsx` | 529 |

## 1.7 Due pattern di data fetching coesistenti

Il codice usa **due strategie diverse e non uniformi** per caricare i dati. Questo è il principale
elemento di incoerenza architetturale.

### Pattern A — React Query

Usato in: modulo **Visite** (tutte le schermate), modulo **Corsi** (cataloghi), **ProfileScreen**.

Caratteristiche: `useQuery` con `queryKey` esplicita, `enabled` per gating su ruolo/ID,
`staleTime` tipicamente `60_000`, `useMutation` con `onSuccess` che invalida chiavi correlate,
pull-to-refresh collegato a `refetch()` e `isRefetching`.

Esempio (`src/hooks/useCorsiAziendali.ts`): `queryKey: ['corsi', 'aziendali']`,
`enabled: hasGestionaleRole(userProfile?.ruoli)` — il gating su `enabled` evita di chiamare
`/api/formazione/corsi/accessibili` con un utente mobile-only, che riceverebbe `403`.

### Pattern B — `useState` + `useFocusEffect`

Usato in: modulo **Sessioni posturali** (tutte le schermate), modulo **Fitness** (tutte le
schermate), `HomeScreen` (nessun fetch).

Caratteristiche: triplette `data`/`loading`/`error` gestite a mano, `useCallback` per il loader,
`useFocusEffect` che ricarica ad ogni focus, nessuna deduplicazione tra schermate, nessuna
invalidazione incrociata (dopo una prenotazione la schermata ricarica solo i propri dati).

Conseguenza pratica: prenotando una sessione dal calendario, il contatore mostrato sulla card in
`SessioniHomeScreen` si aggiorna solo perché quella schermata rifà il fetch al focus successivo, non
per invalidazione della cache.

## 1.8 Cache in-memory dei cataloghi

Oltre a React Query esistono due moduli di cache a livello di modulo ES, con pattern
publish/subscribe manuale:

- `src/services/sessioniPosturaliCatalogPrefetch.ts`
- `src/services/fitnessCatalogPrefetch.ts`

Entrambi mantengono `catalog`, una `Map` di copertine per `sessioneId`, una promise `inflight` per
deduplicare i fetch concorrenti e un `Set` di listener. Il prefetch chiama anche
`Image.prefetch(url)` su ogni URL di copertina per scaldare la cache immagini di React Native.

**Nessun TTL**: la cache vive fino alla `clear*CatalogCache()` esplicita (invocata dal logout in
`AuthContext`) o al riavvio dell'applicazione.

Il prefetch delle sessioni posturali viene invocato in tre punti:
`AuthContext` dopo l'idratazione della sessione, `AuthContext` dopo il login,
`SessioniCalendarioScreen` ad ogni focus.

Dettagli completi in [13 — Stato, cache e storage](./13-stato-cache-e-storage.md).
