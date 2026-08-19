# 02 — Configurazione, ambienti e build

## 2.1 Variabili d'ambiente

Tutte le variabili usate dall'app hanno prefisso `EXPO_PUBLIC_`, quindi vengono **inlineate nel
bundle JavaScript a build time** e sono leggibili da chiunque ottenga l'IPA o l'APK. Il file
`.env.example` lo dichiara esplicitamente:

> `IMPORTANTE: tutto ciò che inizia con EXPO_PUBLIC_ finisce nel bundle JS pubblico dell'app ed è leggibile da chiunque scarichi l'IPA/APK. NON mettere qui veri segreti server-side: vanno tenuti su Firebase Functions o su un backend.`

### Elenco completo (15 variabili)

| Variabile | Letta in | Default se assente | Note |
|---|---|---|---|
| `EXPO_PUBLIC_API_URL_LOCAL` | `src/api/index.ts:16` | `'http://localhost:8080'` | Origin del backend in dev; lo slash finale viene rimosso |
| `EXPO_PUBLIC_API_USE_PRODUCTION` | `src/api/index.ts:14` | non `'true'` → false | Solo la stringa esatta `'true'` forza il backend di produzione in dev |
| `EXPO_PUBLIC_API_LOCAL_IP` | `src/utils/resolveDevBackendUrl.ts:29` | nessuno | IP LAN per device fisici; prima scelta |
| `EXPO_PUBLIC_FIREBASE_USE_PRODUCTION` | `src/services/firebaseService.ts:50`, `src/services/youtubeTokenService.ts:10` | non `'true'` → false | Definita anche nei profili `eas.json` |
| `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` | `firebaseService.ts:54-55`, `youtubeTokenService.ts:13-15` | `''` | URL Cloud Functions di produzione |
| `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL_LOCAL` | `firebaseService.ts:10`, `youtubeTokenService.ts:14` | `''` | URL Cloud Functions locali (solo dev) |
| `EXPO_PUBLIC_FIREBASE_LOCAL_IP` | `firebaseService.ts:27-40`, `resolveDevBackendUrl.ts:29` | nessuno | IP LAN; fallback di `EXPO_PUBLIC_API_LOCAL_IP` |
| `EXPO_PUBLIC_YOUTUBE_API_KEY` | `src/services/youtubeService.ts:8` | `''` | API key YouTube Data v3 |
| `EXPO_PUBLIC_YOUTUBE_UNLISTED_PLAYLISTS` | `youtubeService.ts:411-413` | undefined | CSV di ID playlist unlisted da forzare in elenco |
| `EXPO_PUBLIC_GOOGLE_CLIENT_ID` | `youtubeTokenService.ts:21`, `src/hooks/useYouTubeAuth.ts:33` | `''` | Client ID OAuth (pubblico per natura) |
| `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` | `youtubeTokenService.ts:22` | `''` | **Segreto** — `.env.example` raccomanda di lasciarlo vuoto nel client |
| `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN` | `youtubeTokenService.ts:23` | `''` | **Segreto** — idem |
| `EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID` | `src/services/cloudflareService.ts:4` | `''` | Account ID Cloudflare |
| `EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN` | `cloudflareService.ts:5` | `''` | **Segreto** — token API Cloudflare Stream |
| `EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` | `cloudflareService.ts:6`, `src/services/courseContent.ts:9-10` | `''` | Sottodominio per manifest e thumbnail; slash finale rimosso |

### Variabili effettivamente necessarie al funzionamento

Delle 15 variabili, quelle che influenzano il **percorso di codice raggiungibile dall'utente** sono
soltanto quattro:

1. `EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` — indispensabile: senza di essa gli URL dei manifest HLS
   diventano `https:///<uid>/manifest/video.m3u8` e nessun video parte.
2. `EXPO_PUBLIC_API_USE_PRODUCTION` — determina quale backend viene contattato in sviluppo.
3. `EXPO_PUBLIC_API_URL_LOCAL` — origin del backend locale.
4. `EXPO_PUBLIC_API_LOCAL_IP` — necessaria per testare su device fisico contro backend locale.

Le variabili YouTube, Firebase, e `CLOUDFLARE_ACCOUNT_ID`/`CLOUDFLARE_STREAM_TOKEN` alimentano
esclusivamente codice non raggiungibile dalla UI attuale (`youtubeService`, `firebaseService`,
`cloudflareService`, hook YouTube). Vedi
[15 — Debito tecnico e anomalie](./15-debito-tecnico-e-anomalie.md).

### Rischio di sicurezza

Tre variabili sono segreti server-side che, se popolati nel `.env`, finiscono in chiaro nel bundle:

- `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET`
- `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN`
- `EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN`

Il token Cloudflare in particolare, se presente, consente di enumerare via
`GET https://api.cloudflare.com/client/v4/accounts/{id}/stream` **l'intera libreria video
dell'account**, non solo i contenuti autorizzati per l'utente. Il commento nel `.env.example` è
esplicito: `"⚠️ Token Cloudflare: NON metterlo nel client per produzione. Spostalo nel backend e firma gli URL lì."`

## 2.2 Risoluzione dell'URL del backend

Questa è la logica più delicata della configurazione, perché deve funzionare su emulatore Android,
simulatore iOS, device fisico e web.

### Selezione dell'origin

`src/api/index.ts:12-27`:

```typescript
const PRODUCTION_BACKEND_ORIGIN = 'https://mobilitas-backend-990845221858.europe-west8.run.app';
const USE_PRODUCTION_IN_DEV = process.env.EXPO_PUBLIC_API_USE_PRODUCTION === 'true';
const LOCAL_BACKEND_ORIGIN = (process.env.EXPO_PUBLIC_API_URL_LOCAL || 'http://localhost:8080').replace(/\/$/, '');

function getBackendOrigin(): string {
  if (!__DEV__ || USE_PRODUCTION_IN_DEV) {
    return PRODUCTION_BACKEND_ORIGIN;
  }
  return resolveDevBackendOrigin(LOCAL_BACKEND_ORIGIN);
}

export const API_ORIGIN = getBackendOrigin();
export const API_BASE_URL = `${API_ORIGIN}/api`;
```

Tabella decisionale:

| `__DEV__` | `EXPO_PUBLIC_API_USE_PRODUCTION` | Origin risultante |
|---|---|---|
| `false` (build release) | qualsiasi | `https://mobilitas-backend-990845221858.europe-west8.run.app` |
| `true` | `'true'` | `https://mobilitas-backend-990845221858.europe-west8.run.app` |
| `true` | qualsiasi altro | `resolveDevBackendOrigin(LOCAL_BACKEND_ORIGIN)` |

**L'URL di produzione è hardcoded nel sorgente**, non configurabile via variabile d'ambiente. È un
servizio Cloud Run nella regione `europe-west8` (Milano).

In dev viene loggato: `console.log('[API] base URL', API_BASE_URL, USE_PRODUCTION_IN_DEV ? '(produzione forzata)' : '(locale)')`.

### Riscrittura per piattaforma

`src/utils/resolveDevBackendOrigin(origin: string): string` in `src/utils/resolveDevBackendUrl.ts`:

1. Rimuove lo slash finale.
2. Se l'origin **non** contiene `localhost` né `127.0.0.1`, lo restituisce invariato.
3. **Android**: sostituisce `localhost` e `127.0.0.1` con `10.0.2.2` (alias dell'host dall'emulatore
   Android).
4. **Web**: restituisce invariato (il browser risolve `localhost` correttamente).
5. **iOS / device nativo**: sostituisce `localhost|127.0.0.1` con
   `EXPO_PUBLIC_API_LOCAL_IP ?? EXPO_PUBLIC_FIREBASE_LOCAL_IP`, se definito.
6. Se siamo in `__DEV__` e nessun IP è configurato, emette
   `console.warn('[API] EXPO_PUBLIC_API_LOCAL_IP non configurato...')` e restituisce l'origin
   invariato (che su device fisico non funzionerà).

Regex usate: `/\/$/` per lo slash finale, `/localhost|127\.0\.0\.1/g` per la sostituzione.

**Attenzione**: `10.0.2.2` è corretto per l'emulatore Android ufficiale ma **errato per un device
Android fisico**, dove servirebbe `EXPO_PUBLIC_API_LOCAL_IP`. Il ramo Android non consulta la
variabile IP.

### Client HTTP

`src/api/index.ts:33-39`:

```typescript
export const apiClient = axios.create({
  baseURL: API_BASE_URL,          // {origin}/api
  timeout: 15000,                  // 15 secondi
  headers: { 'Content-Type': 'application/json' },
});
```

Interceptor e refresh sono documentati in
[03 — Autenticazione, ruoli e sessione](./03-autenticazione-ruoli-e-sessione.md).

## 2.3 `app.json` — configurazione Expo

```json
{
  "expo": {
    "name": "Mobilitas Academy",
    "slug": "mobilitas-academy",
    "version": "1.0.0",
    "scheme": "mobilitas-academy",
    "orientation": "default",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "light",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    }
  }
}
```

Punti significativi:

- **`orientation: "default"`** — l'app non blocca l'orientamento a livello di configurazione. È il
  `VideoPlayerScreen` a gestirlo programmaticamente via `expo-screen-orientation`.
- **`userInterfaceStyle: "light"`** — nonostante la palette dell'app sia di fatto scura
  (`#001831`), il sistema viene istruito a usare il tema chiaro. Non esiste supporto dark mode.
- **`scheme: "mobilitas-academy"`** — deep link scheme, usato come redirect URI OAuth in
  `useYouTubeAuth` con path `oauth` (quindi `mobilitas-academy://oauth`).
- **`splash.backgroundColor: "#ffffff"`** — la splash nativa è **bianca**, in contrasto con la
  palette scura dell'app; si nota un flash chiaro all'avvio.

### iOS

```json
"ios": {
  "supportsTablet": true,
  "bundleIdentifier": "com.mobilitas.academy",
  "buildNumber": "1",
  "infoPlist": {
    "ITSAppUsesNonExemptEncryption": false,
    "NSMicrophoneUsageDescription": "Mobilitas Academy può usare il microfono solo se attivi funzioni interattive durante una lezione. Nessun audio viene registrato senza il tuo consenso esplicito."
  }
}
```

### Android

```json
"android": {
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  },
  "edgeToEdgeEnabled": true,
  "predictiveBackGestureEnabled": false,
  "package": "com.mobilitas.academy",
  "versionCode": 2
}
```

- `edgeToEdgeEnabled: true` — richiesto da Android 15; è la ragione per cui tutte le schermate usano
  `useTabBarBottomPadding()` e `SafeAreaView` con `edges` espliciti.
- `predictiveBackGestureEnabled: false` — la back gesture predittiva è disattivata
  (`android:enableOnBackInvokedCallback="false"` nel manifest).

### Plugin

```json
"plugins": [
  ["expo-av", { "microphonePermission": "Mobilitas Academy può usare il microfono solo se attivi funzioni interattive durante una lezione. Nessun audio viene registrato senza il tuo consenso esplicito." }],
  "expo-screen-orientation"
]
```

Il permesso microfono è richiesto dal plugin `expo-av` anche se **l'app non registra audio**:
`VideoPlayerScreen` imposta `allowsRecordingIOS: false`. È una richiesta di permesso non
strettamente necessaria che può generare rilievi in review App Store.

## 2.4 Configurazione nativa Android

Da `android/app/build.gradle`:

| Proprietà | Valore |
|---|---|
| `namespace` | `com.mobilitas.academy` |
| `applicationId` | `com.mobilitas.academy` |
| `versionCode` | `2` |
| `versionName` | `"1.0.0"` |
| `compileSdk` / `minSdkVersion` / `targetSdkVersion` | delegati a `rootProject.ext.*` (gestiti da Expo) |

### Permessi dichiarati (`android/app/src/main/AndroidManifest.xml`)

| Permesso | Necessario? |
|---|---|
| `android.permission.INTERNET` | Sì |
| `android.permission.MODIFY_AUDIO_SETTINGS` | Sì — richiesto da `expo-av` |
| `android.permission.RECORD_AUDIO` | **No** — l'app non registra audio |
| `android.permission.READ_EXTERNAL_STORAGE` | Dubbio — `expo-file-system` usa la cache dir dell'app |
| `android.permission.WRITE_EXTERNAL_STORAGE` | Dubbio — idem |
| `android.permission.SYSTEM_ALERT_WINDOW` | **No** — nessun overlay di sistema |
| `android.permission.VIBRATE` | **No** — nessuna vibrazione nel codice |

Quattro dei sette permessi non hanno riscontro nel codice applicativo: sono aggiunti dai plugin Expo
di default. Vale la pena rimuoverli per ridurre le domande in fase di pubblicazione.

### Configurazione dell'activity

```xml
<activity android:name=".MainActivity"
  android:configChanges="keyboard|keyboardHidden|orientation|screenSize|screenLayout|uiMode"
  android:launchMode="singleTask"
  android:windowSoftInputMode="adjustResize"
  android:theme="@style/Theme.App.SplashScreen"
  android:exported="true"
  android:screenOrientation="unspecified">
```

- `windowSoftInputMode="adjustResize"` — il layout si ridimensiona con la tastiera; è ciò che rende
  funzionante il `KeyboardAvoidingView` di `LoginScreen`.
- `screenOrientation="unspecified"` — coerente con `orientation: "default"`.

### Deep link e queries

- Intent filter per lo scheme `mobilitas-academy`.
- `<queries>` con intent `VIEW` + categoria `BROWSABLE` + scheme `https`: necessario su Android 11+
  perché `Linking.canOpenURL()` funzioni sui link `https://wa.me/...` (WhatsApp) e sui link Google
  Reviews.

### Expo Updates

```xml
<meta-data android:name="expo.modules.updates.ENABLED" android:value="false"/>
```

**Gli update OTA sono disabilitati**: ogni modifica richiede una nuova build e una nuova submission
agli store.

## 2.5 Configurazione nativa iOS

Da `ios/Mobilitas/Info.plist`:

| Chiave | Valore |
|---|---|
| `CFBundleDisplayName` | `Mobilitas` (non "Mobilitas Academy") |
| `CFBundleShortVersionString` | `1.0.1` |
| `CFBundleVersion` | `2` |
| `LSMinimumSystemVersion` | `12.0` |
| `UIUserInterfaceStyle` | `Light` |
| `UIRequiresFullScreen` | `false` |
| `RCTNewArchEnabled` | `true` |
| `ITSAppUsesNonExemptEncryption` | `false` |
| `UILaunchStoryboardName` | `SplashScreen` |
| `UIRequiredDeviceCapabilities` | `arm64` |

**Disallineamento versioni**: `app.json` dichiara `version: "1.0.0"` e `buildNumber: "1"`, mentre
l'`Info.plist` committato riporta `1.0.1` / `2`. Con `appVersionSource: "remote"` in `eas.json` la
versione autorevole è quella su EAS, ma i valori locali restano incoerenti fra loro.

### URL scheme

```xml
<key>CFBundleURLSchemes</key>
<array>
  <string>mobilitas-academy</string>
  <string>com.mobilitas.academy</string>
</array>
```

### App Transport Security

```xml
<key>NSAppTransportSecurity</key>
<dict>
  <key>NSAllowsArbitraryLoads</key><false/>
  <key>NSAllowsLocalNetworking</key><true/>
</dict>
```

`NSAllowsArbitraryLoads: false` (buona pratica: HTTP non cifrato bloccato) con
`NSAllowsLocalNetworking: true` per consentire il backend locale in HTTP durante lo sviluppo.

### Orientamenti supportati

Tutti e quattro, sia su iPhone che su iPad (`UISupportedInterfaceOrientations` e
`UISupportedInterfaceOrientations~ipad`). Serve al fullscreen del player video.

### Descrizione permesso microfono

Il testo nell'`Info.plist` differisce da quello in `app.json`:

> `"L'accesso al microfono è richiesto esclusivamente per supportare le funzionalità di riproduzione audio e video durante le lezioni interattive. Mobilitas Academy non registra, non memorizza e non trasmette alcun dato audio dell'utente."`

Poiché il progetto `ios/` è committato, un `expo prebuild --clean` sovrascriverebbe questo testo con
quello di `app.json`, perdendo la formulazione più dettagliata.

## 2.6 `eas.json` — profili di build

```json
{
  "cli": { "version": ">= 12.0.0", "appVersionSource": "remote" }
}
```

| Profilo | `distribution` | `channel` | Simulatore iOS | `autoIncrement` | `EXPO_PUBLIC_FIREBASE_USE_PRODUCTION` |
|---|---|---|---|---|---|
| `development` | `internal` | `development` | `true` | — | `"false"` |
| `preview` | `internal` | `preview` | `false` | — | `"true"` |
| `production` | (store) | `production` | — | `true` | `"true"` |

`development` ha inoltre `developmentClient: true`. Tutti i profili usano
`ios.resourceClass: "m-medium"`.

### Submit

Il profilo `submit.production.ios` contiene **placeholder non sostituiti**:

```json
"appleId": "REPLACE_WITH_APPLE_ID@example.com",
"ascAppId": "REPLACE_WITH_APP_STORE_CONNECT_APP_ID",
"appleTeamId": "REPLACE_WITH_APPLE_TEAM_ID"
```

`npm run submit:ios` non funzionerà finché questi valori non vengono compilati. Non è configurato
alcun profilo `submit.production.android` (manca il service account key), quindi anche
`npm run submit:android` richiederà configurazione interattiva.

### Osservazione sui profili

I profili controllano solo `EXPO_PUBLIC_FIREBASE_USE_PRODUCTION`. **Non impostano
`EXPO_PUBLIC_API_USE_PRODUCTION`**: la selezione del backend applicativo si basa unicamente su
`__DEV__`, che è `false` in tutte le build EAS (anche in `development`, che però usa il dev client e
quindi carica il bundle da Metro con `__DEV__ === true`). In pratica: le build `preview` e
`production` puntano sempre al backend Cloud Run.

## 2.7 `tsconfig.json`

```json
{
  "extends": "expo/tsconfig.base",
  "compilerOptions": { "strict": true }
}
```

`strict: true` è attivo, ma **non c'è alcuno script di type check** in `package.json`: nessun
`tsc --noEmit`. Gli errori di tipo emergono soltanto nell'IDE o al bundling con Metro (che con
`babel-preset-expo` esegue il transpiling senza type checking). Non esiste inoltre configurazione di
path alias: tutti gli import sono relativi (`../../services/...`).

## 2.8 Script npm

| Script | Comando | Scopo |
|---|---|---|
| `start` | `expo start` | Dev server Metro |
| `android` | `expo run:android` | Build e installa su Android |
| `android:clean` | `rm -rf android/app/.cxx android/.cxx && cd android && ./gradlew clean` | Pulisce cache CMake e Gradle |
| `ios` | `expo run:ios` | Build e installa su iOS |
| `ios:pod` | `cd ios && pod install` | Reinstalla i CocoaPods |
| `ios:go` | `expo start --ios` | Avvia in Expo Go |
| `web` | `expo start --web` | Avvia su web (non supportato: `expo-av`, orientamento e file system hanno limiti) |
| `prebuild` | `expo prebuild --clean` | Rigenera `android/` e `ios/` — **distruttivo**, sovrascrive le modifiche native |
| `prebuild:ios` | `expo prebuild --clean --platform ios` | Solo iOS |
| `build:ios:preview` | `eas build --platform ios --profile preview` | Build interna iOS |
| `build:ios:production` | `eas build --platform ios --profile production` | Build store iOS |
| `build:android:production` | `eas build --platform android --profile production` | Build store Android |
| `submit:ios` | `eas submit --platform ios --latest` | Submit App Store (richiede placeholder compilati) |
| `submit:android` | `eas submit --platform android --latest` | Submit Play Store |
| `fill-video-durations` | `node scripts/fill-video-durations.js` | **Deprecato**: lo script stampa un avviso ed esce con `process.exit(0)` |

**Manca un profilo `build:android:preview`**, presente solo per iOS.

Contenuto integrale di `scripts/fill-video-durations.js`:

```javascript
/**
 * Storicamente aggiornava src/data/courseVideos.json (rimosso: i contenuti
 * provengono da API formazione / Cloudflare Stream).
 *
 * Uso: node scripts/fill-video-durations.js
 */
console.log('fill-video-durations: courseVideos.json non è più usato. Le durate HLS vengono risolte a runtime (es. CourseVideosScreen).');
process.exit(0);
```

## 2.9 Asset

| File | Dimensione | Uso |
|---|---|---|
| `assets/icon.png` | 22 KB | Icona app iOS |
| `assets/adaptive-icon.png` | 17,5 KB | Foreground adaptive icon Android |
| `assets/splash-icon.png` | 17,5 KB | Immagine splash nativa (identica per byte-size all'adaptive icon) |
| `assets/favicon.png` | 52 KB | Favicon web |
| `assets/logo_verde.png` | 80 KB | Logo usato **solo** in `SplashScreen.tsx`, che non è montato |

`assets/logo_verde.png` è quindi un asset da 80 KB incluso nel bundle senza essere mai visualizzato.

## 2.10 Font

`src/theme/index.ts` dichiara `fonts.primary = 'Montserrat'` con `fallback: 'System'`, e
`src/utils/themeUtils.ts:14-23` seleziona `'System'` su iOS e `'Montserrat'` su Android.

Tuttavia:

- **Non esiste `assets/fonts/`** e `app.json` non contiene alcuna chiave `fonts`.
- La cartella `fonts/` contiene solo un `README.md` con le istruzioni **non applicate** per
  installare i cinque pesi di Montserrat.
- `themeUtils.ts` non è importato da nessun componente: tutte le schermate applicano gli stili
  direttamente con `fontWeight` numerico.

**Conclusione**: l'app usa i font di sistema su entrambe le piattaforme (San Francisco su iOS, Roboto
su Android). Su Android il riferimento a `'Montserrat'` verrebbe ignorato in assenza del font
registrato. La configurazione tipografica del theme è di fatto inerte.

## 2.11 Esclusioni build (`.easignore`)

Oltre alle esclusioni standard (`node_modules`, `.env*` tranne `.env.example`, artefatti nativi,
`.expo`, `dist`, `web-build`, log, `.DS_Store`, `.vscode`, `.idea`), il file esclude esplicitamente:

```
scripts/
get_refresh_token.py
TEST_FIREBASE_PROD.md
TROUBLESHOOTING.md
OAUTH_SETUP.md
REFRESH_TOKEN_SETUP.md
README_YOUTUBE.md
BACKEND_SETUP.md
YOUTUBE_SETUP.md
AppTest.tsx
```

Nota: `DEPLOYMENT.md`, `DOCUMENTAZIONE_COMPLETA_APP.md` e la cartella `docs/` **non** sono esclusi e
vengono quindi caricati nel tarball di build EAS. Non è un problema funzionale (i `.md` non entrano
nel bundle JS) ma allunga inutilmente l'upload.

## 2.12 Script Python `get_refresh_token.py`

Utility one-off (~60 righe) per ottenere un refresh token OAuth Google da linea di comando, da usare
per popolare `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN`. È escluso dal build EAS. Dato che l'integrazione
YouTube non è raggiungibile dalla UI, lo script è attualmente senza scopo operativo.

## 2.13 Checklist di setup per un nuovo sviluppatore

1. `npm install`
2. `cp .env.example .env`
3. Compilare almeno `EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` (per i video).
4. Scegliere il backend:
   - contro produzione: `EXPO_PUBLIC_API_USE_PRODUCTION=true`
   - contro locale: `EXPO_PUBLIC_API_USE_PRODUCTION=false` e `EXPO_PUBLIC_API_URL_LOCAL=http://localhost:8080`
5. Se si testa su **device fisico** con backend locale: impostare `EXPO_PUBLIC_API_LOCAL_IP` con l'IP
   LAN mostrato da Expo (es. `192.168.1.54`).
6. `npm run ios` o `npm run android`. Le variabili `EXPO_PUBLIC_*` sono lette a build time: dopo
   averle modificate serve riavviare Metro con cache pulita.
7. Verificare in console la riga `[API] base URL ...` per confermare l'endpoint effettivo.

Lasciare le variabili YouTube/Firebase/Cloudflare-token vuote: non servono al funzionamento delle
schermate attive.
