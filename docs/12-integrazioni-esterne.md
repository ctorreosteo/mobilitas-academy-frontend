# 12 — Integrazioni esterne

Tutto ciò che l'app contatta al di fuori del proprio backend, e tutto ciò che è predisposto per
contattarlo ma non lo fa più.

| Integrazione | Stato | File coinvolti | Righe |
|---|---|---|---|
| Cloudflare Stream (HLS) | **Attiva** | `courseContent.ts`, `hlsDuration.ts`, `VideoPlayerScreen` | — |
| Cloudflare Stream API | Non usata | `cloudflareService.ts` | 288 |
| WhatsApp | **Attiva** | `openStudioWhatsApp.ts`, `StudioWhatsAppSupportButton` | 91 |
| Google Reviews | **Attiva** | `ProfileScreen`, `studioVisitsService` | — |
| Fatture in Cloud (via backend) | **Attiva** | `pagamentiService.ts` | 255 |
| YouTube Data API v3 | Non raggiungibile | `youtubeService.ts`, hook | 674 |
| Firebase Cloud Functions | Non raggiungibile | `firebaseService.ts`, `youtubeTokenService.ts` | 394 |
| Google OAuth (PKCE) | Non raggiungibile | `useYouTubeAuth.ts` | 179 |

Il codice legacy legato a YouTube/Firebase/OAuth somma **1.247 righe non raggiungibili**, più le 288
di `cloudflareService.ts`: circa **1.535 righe**, quasi il 9% del codice in `src/`.

---

## 12.1 Cloudflare Stream — riproduzione video (attiva)

È l'unica integrazione video effettivamente in uso. L'app **non** parla con le API di Cloudflare:
riceve dal proprio backend l'identificativo del video (`cloudflareUid`) e costruisce localmente gli
URL pubblici di streaming.

### Costruzione dell'URL

```9:14:src/services/courseContent.ts
const CLOUDFLARE_STREAM_SUBDOMAIN =
  process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN?.replace(/\/$/, '') || '';

// ...
  if (!uid || !CLOUDFLARE_STREAM_SUBDOMAIN) return '';
  return `https://${CLOUDFLARE_STREAM_SUBDOMAIN}/${uid}/manifest/video.m3u8`;
```

Lo slash finale della variabile d'ambiente viene normalizzato via `replace(/\/$/, '')`, così la
configurazione tollera entrambe le forme. Se `uid` o il sottodominio mancano, la funzione restituisce
stringa vuota: il video risulterà non riproducibile, ma non si genera un URL malformato.

Pattern degli URL Cloudflare Stream usati nell'app:

| Risorsa | Pattern |
|---|---|
| Manifest HLS | `https://<subdomain>/<uid>/manifest/video.m3u8` |
| Thumbnail | `https://<subdomain>/<uid>/thumbnails/thumbnail.jpg` |

Il thumbnail è costruito solo in `cloudflareService.ts` (non usato); nel percorso attivo le copertine
arrivano dal backend come URL completi.

### Riproduzione

`VideoPlayerScreen` passa l'URL a `expo-av`, che gestisce HLS nativamente su entrambe le piattaforme
(AVPlayer su iOS, ExoPlayer su Android). Nessuna libreria HLS aggiuntiva è necessaria.
Vedi [09 §9.8](./09-modulo-corsi-e-video.md).

### Estrazione della durata dal manifest

Poiché il backend spesso non popola `durataSecondi`, l'app calcola la durata scaricando e parsando il
manifest. `src/utils/hlsDuration.ts` (81 righe) implementa un mini-parser HLS.

**Parsing dei segmenti**:

```typescript
const EXTINF_REGEX = /#EXTINF:\s*(\d*(?:\.\d+)?)(?:,|$)/;
```

Somma tutti i valori `#EXTINF` (durata dei singoli segmenti) e arrotonda il totale con `Math.round`.

**Gestione del master playlist**:

```35:55:src/utils/hlsDuration.ts
export async function getDurationFromHlsManifest(manifestUrl: string): Promise<number> {
  const response = await fetch(manifestUrl, { method: 'GET' });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${manifestUrl}`);
  const text = await response.text();

  const isMaster = /#EXT-X-STREAM-INF/i.test(text);
  if (isMaster) {
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      if (/#EXT-X-STREAM-INF/i.test(lines[i])) {
        const nextLine = lines[i + 1];
        if (nextLine && nextLine.trim() && !nextLine.startsWith('#')) {
          const variantUrl = resolveUrl(manifestUrl, nextLine);
          return getDurationFromHlsManifest(variantUrl);
        }
      }
    }
    throw new Error('Nessun variant trovato nel master playlist');
  }

  return parseVariantPlaylistContent(text);
}
```

Cloudflare serve un **master playlist** che elenca le varianti di bitrate: la funzione rileva
`#EXT-X-STREAM-INF`, prende la **prima** variante e ricorre su di essa. Quindi ogni durata costa
tipicamente **due richieste HTTP**. Poiché tutte le varianti hanno la stessa durata, scegliere la
prima è corretto e minimizza il traffico.

La risoluzione degli URL relativi usa `new URL(relativePath.trim(), base).href`, con `base` calcolato
troncando dopo l'ultimo `/`.

**Cache in-memory**:

```typescript
const durationCache = new Map<string, number>();

export async function getCachedDurationFromHls(url: string): Promise<number> {
  if (!url || !url.includes('.m3u8')) return 0;
  const cached = durationCache.get(url);
  if (cached !== undefined) return cached;
  try {
    const duration = await getDurationFromHlsManifest(url);
    durationCache.set(url, duration);
    return duration;
  } catch (e) {
    console.warn('hlsDuration: impossibile recuperare durata per', url, e);
    return 0;
  }
}
```

Chiave: l'URL completo. Nessun TTL: valida per l'intera sessione (una durata video non cambia, quindi
è corretto). In caso di errore restituisce `0` senza propagare, e **senza memorizzare il fallimento**:
un video non risolvibile verrà ritentato ad ogni apertura della schermata.

`clearHlsDurationCache()` è invocata da `cleanAndRefreshCaches` (vedi
[13](./13-stato-cache-e-storage.md)).

### `cloudflareService.ts` — non utilizzato, con rischio di sicurezza

288 righe che parlano **direttamente** con l'API di gestione di Cloudflare Stream:

```typescript
const STREAM_API_BASE = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/stream`;
```

Espone quattro funzioni: `fetchCloudflareCourses`, `fetchCloudflareCourseModules`,
`fetchCloudflareModuleVideos`, `fetchCloudflareCourseVideos`. **Nessuna è importata da alcun file.**

Il funzionamento previsto: scaricare l'elenco completo dei video dell'account (paginato a 100 per
pagina) e ricostruire corsi, moduli e lezioni dai `meta` di ciascun video (`courseTitle`, `module`,
`moduleOrder`, `order`…). Due costanti definiscono un corso e un modulo aggregati di default
(`'course-introduzione'`, `'module-introduzione'`), con commenti che segnalano la natura
`TEMPORANEO` dell'implementazione.

**Il problema critico** è l'autenticazione:

```typescript
const CLOUDFLARE_STREAM_TOKEN = process.env.EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN || '';
// ...
headers: { 'Authorization': `Bearer ${CLOUDFLARE_STREAM_TOKEN}` }
```

Un **token API di gestione Cloudflare** in una variabile `EXPO_PUBLIC_*`. Tutte le variabili con
questo prefisso vengono **inlineate nel bundle JavaScript** al momento della build e sono estraibili
da qualunque copia dell'app installata. Un token Stream permette, a seconda dei permessi concessi, di
elencare, caricare ed eliminare video sull'account.

Aggrava il quadro il logging in chiaro:

```typescript
console.log(`🔑 Token configurato: ${CLOUDFLARE_STREAM_TOKEN ? 'Sì (primi 10 caratteri: ' + CLOUDFLARE_STREAM_TOKEN.substring(0, 10) + '...)' : 'No'}`);
```

I primi 10 caratteri del token finiscono nei log dell'app.

**Azione consigliata**: eliminare il file, rimuovere `EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID` e
`EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN` dalla configurazione e **ruotare il token su Cloudflare** se è
mai stato incluso in una build distribuita. `EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN` va invece
mantenuto: è un valore pubblico e serve al percorso attivo. Vedi
[02](./02-configurazione-ambiente-e-build.md) e [15](./15-debito-tecnico-e-anomalie.md).

---

## 12.2 WhatsApp — canale di supporto (attiva)

L'unico canale di contatto diretto offerto dall'app. Non usa l'SDK di WhatsApp: apre un semplice
link `wa.me` con il modulo `Linking` di React Native.

```1:20:src/utils/openStudioWhatsApp.ts
import { Linking } from 'react-native';

/** Numero WhatsApp segreteria (solo cifre, prefisso internazionale senza +). */
const STUDIO_WHATSAPP_E164 = '393518198457';

export async function openStudioWhatsApp(options?: { message?: string }): Promise<boolean> {
  const q = options?.message?.trim();
  const url = q
    ? `https://wa.me/${STUDIO_WHATSAPP_E164}?text=${encodeURIComponent(q)}`
    : `https://wa.me/${STUDIO_WHATSAPP_E164}`;
  try {
    if (await Linking.canOpenURL(url)) {
      await Linking.openURL(url);
      return true;
    }
  } catch {
    // ignoriamo: il pulsante non deve far crashare l'app
  }
  return false;
}
```

Caratteristiche:

- **Numero hardcoded**: `+39 351 819 8457`, la segreteria dello studio. Non configurabile via
  variabile d'ambiente né via backend: cambiarlo richiede una nuova build.
- Il messaggio è codificato con `encodeURIComponent`, quindi accenti e punteggiatura passano
  correttamente.
- Restituisce `boolean` (successo/fallimento) ma **non lancia mai**: il commento esplicita la scelta
  (*"il pulsante non deve far crashare l'app"*).
- `wa.me` funziona sia con l'app WhatsApp installata (apertura diretta) sia via browser: non è
  necessario un fallback.
- Il valore di ritorno **non viene mai controllato** dai chiamanti: se WhatsApp non è disponibile,
  l'utente non riceve alcun feedback. È il punto migliorabile di questa integrazione.

### Il componente

`StudioWhatsAppSupportButton` (vedi [10 §10.4](./10-login-home-profilo.md)) incapsula la chiamata e
gestisce lo stato `busy`.

### Catalogo dei messaggi precompilati

Ogni punto di supporto invia un messaggio contestuale, così la segreteria capisce subito da dove
arriva la richiesta:

| Contesto | Messaggio |
|---|---|
| Corsi aziendali | `"Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi aziendali. Potete aiutarmi? Grazie."` |
| Corsi posturali | `"Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi posturali. Potete aiutarmi? Grazie."` |
| Eliminazione account | `'Buongiorno, vorrei richiedere la cancellazione definitiva del mio account Mobilitas Academy.'` |
| Sessioni posturali | vedi [08](./08-modulo-sessioni-e-fitness.md) — contiene il typo `"non iesco"` |

L'elenco completo dei messaggi è in [14 — Errori e messaggistica](./14-errori-e-messaggistica.md).

### Uso diretto senza il componente

`GestioneVisiteScreen` replica il colore `#25D366` e usa `openStudioWhatsApp` con un proprio pulsante
invece del componente condiviso — un'incoerenza minore, da uniformare.

---

## 12.3 Google Reviews (attiva)

Non è un'integrazione API: l'app apre con `Linking.openURL` il link recensione fornito dal backend.

`StudioDto.googleReviewLink` (da `GET /api/studi/attivi`) contiene l'URL della scheda Google Business
dello studio. `ProfileScreen` lo valida e lo apre — dettagli in
[10 §10.3](./10-login-home-profilo.md).

Punti rilevanti:

- Il link è **dato dal backend**, non hardcoded: aggiungere uno studio non richiede modifiche all'app.
- La validazione `/^https?:\/\//i` protegge da schemi arbitrari: senza di essa un valore malevolo nel
  database (ad esempio `javascript:` o un deep link verso un'altra app) verrebbe passato a
  `Linking.openURL`. È una difesa corretta e da mantenere.
- La preselezione tenta di individuare lo studio dell'osteopata di riferimento del paziente, così la
  recensione finisce sulla scheda giusta.

---

## 12.4 Fatture in Cloud — tramite backend (attiva)

L'app **non** parla con Fatture in Cloud: chiede il PDF al proprio backend, che a sua volta lo recupera
dal servizio di fatturazione. Nessuna credenziale FIC è presente nel client.

Endpoint: `GET /api/pagamenti/{pagamentoId}/fattura-fic-pdf` — risponde con **bytes PDF**, non con
l'envelope JSON standard.

### Il download

Poiché `axios` non è adatto a scaricare binari di grandi dimensioni su React Native, il servizio usa
`expo-file-system`:

```166:186:src/services/pagamentiService.ts
async function downloadFatturaPdfOnce(
  pagamentoId: number,
  token: string
): Promise<FileSystem.FileSystemDownloadResult> {
  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error('Impossibile salvare la fattura su questo dispositivo.');
  }
  const tmpUri = `${cacheDir}fattura_${pagamentoId}_${Date.now()}.bin`;
  return withTimeout(
    FileSystem.downloadAsync(`${API_BASE_URL}/pagamenti/${pagamentoId}/fattura-fic-pdf`, tmpUri, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/pdf',
      },
      sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
    }),
    FATTURA_PDF_TIMEOUT_MS,
    'Il download della fattura sta impiegando troppo tempo. Riprova tra poco.'
  );
}
```

Dettagli notevoli:

- **Import legacy**: `import * as FileSystem from 'expo-file-system/legacy'`. L'SDK 54 ha una nuova
  API basata su classi; il codice usa quella deprecata, che continua a funzionare ma è destinata alla
  rimozione.
- **Timeout manuale di 60 secondi** (`FATTURA_PDF_TIMEOUT_MS`), implementato con un `withTimeout`
  scritto a mano perché `downloadAsync` non accetta un timeout. Nota: il timeout fa rigettare la
  promise, ma **non annulla il download** in corso né elimina il file temporaneo.
- **Nome temporaneo con `.bin`** e timestamp: la risposta potrebbe essere un errore JSON, quindi non
  si assume l'estensione `.pdf` prima della verifica.
- `sessionType: FOREGROUND`: il download non prosegue in background.

### Il refresh del token, replicato a mano

`downloadAsync` non passa dagli interceptor di `apiClient`, quindi la logica di refresh su `401` è
riscritta qui:

```typescript
let result = await downloadFatturaPdfOnce(pagamentoId, token);
if (result.status === 401) {
  try { await FileSystem.deleteAsync(result.uri, { idempotent: true }); } catch { /* ignore */ }
  token = await refreshAuthToken();
  result = await downloadFatturaPdfOnce(pagamentoId, token);
}
```

Un solo tentativo di refresh, con pulizia del file parziale. È l'unico punto dell'app in cui il
refresh è gestito fuori dall'interceptor: se la logica di refresh cambia, va aggiornata in due posti.

### Validazione della risposta

```typescript
const contentType = (headerValue(result.headers, 'content-type') || result.mimeType || '').toLowerCase();
const isPdf = result.status === 200 && contentType.includes('application/pdf');
```

`headerValue` fa una ricerca **case-insensitive** sulle chiavi degli header, perché la
capitalizzazione varia tra piattaforme.

Se la risposta non è un PDF, il corpo scaricato viene letto e interpretato come JSON di errore da
`parseDownloadedErrorBody`, poi il file temporaneo viene eliminato e si lancia un `Error` con il
messaggio tradotto.

### Traduzione degli errori di fatturazione

```136:152:src/services/pagamentiService.ts
function fatturaPdfUserMessage(errorText?: string | null, fallback?: string): string {
  const e = (errorText ?? '').trim();
  if (/Nessuna fattura Fatture in Cloud associata/i.test(e)) {
    return 'Per questo pagamento non è disponibile una fattura da scaricare.';
  }
  if (/non ha il documentId/i.test(e)) {
    return 'Questa fattura non è scaricabile.';
  }
  if (/non abilitata|Company ID/i.test(e)) {
    return 'Il servizio fatture non è al momento disponibile. Contatta la segreteria.';
  }
  if (/non ha restituito|Download PDF non riuscito/i.test(e)) {
    return 'Non è stato possibile scaricare la fattura. Riprova tra poco.';
  }
  if (e) return e;
  return fallback ?? 'Download della fattura non riuscito. Riprova più tardi.';
}
```

Quattro pattern riconosciuti sui messaggi del backend, tradotti in linguaggio comprensibile. È una
buona pratica di UX, con una **fragilità strutturale**: il match è su stringhe italiane del backend, e
una riformulazione lato server fa ricadere l'app sul messaggio grezzo (che almeno resta leggibile,
grazie al `if (e) return e`). Un codice di errore stabile nell'envelope sarebbe più robusto.

### Nome del file e condivisione

Il nome è estratto dall'header `Content-Disposition`:

```typescript
const quoted = header.match(/filename="([^"]+)"/i);
const raw = quoted?.[1] ?? header.match(/filename=([^;]+)/i)?.[1];
const name = raw.trim().replace(/^.*[/\\]/, '');   // rimuove eventuali path
return name.toLowerCase().endsWith('.pdf') ? name : `${name}.pdf`;
```

Gestisce sia la forma con apici sia quella senza, **rimuove i componenti di path** (difesa contro
path traversal da header manipolati) e garantisce l'estensione `.pdf`.

Poi `safePdfFilename` sostituisce ogni carattere fuori da `[a-zA-Z0-9._-]` con `_`, con fallback
`fattura_{id}.pdf`. Due livelli di sanificazione su un valore proveniente dalla rete: attenzione
corretta.

Il file viene spostato da `.bin` al nome definitivo con `FileSystem.moveAsync` e poi condiviso:

```typescript
export async function shareFatturaPdf(uri: string, filename: string): Promise<void> {
  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Apertura della fattura non disponibile su questo dispositivo.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    UTI: 'com.adobe.pdf',
    dialogTitle: filename,
  });
}
```

`expo-sharing` apre il foglio di condivisione nativo: l'utente può aprire il PDF in un lettore,
salvarlo su File o inviarlo. L'app **non ha un visualizzatore PDF interno**.

I file restano in `FileSystem.cacheDirectory`, che il sistema operativo può svuotare
autonomamente — comportamento appropriato per documenti riscaricabili.

---

## 12.5 YouTube Data API v3 — non raggiungibile

`src/services/youtubeService.ts` (450 righe) è un client completo dell'API YouTube v3, con funzioni:

| Funzione | Scopo |
|---|---|
| `fetchPlaylistVideos(playlistId)` | Video di una playlist, con paginazione |
| `fetchPlaylistInfo(playlistId)` | Metadati playlist |
| `fetchPlaylistById(playlistId)` | Playlist singola, incluse le unlisted |
| `fetchChannelPlaylists(channelId?)` | Tutte le playlist di un canale |
| `extractPlaylistId(url)` | Parsing di URL YouTube |
| `extractVideoId(url)` | Parsing di URL YouTube |
| `extractChannelId(url)` | Parsing di URL YouTube |

Include anche un parser delle durate ISO 8601:

```typescript
function parseDuration(duration: string): number {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  // "PT4M13S" -> 253, "PT1H2M30S" -> 3750
}
```

**Strategia a due livelli**: se le Firebase Functions sono configurate, delega a loro; altrimenti
chiama direttamente `https://www.googleapis.com/youtube/v3` con
`EXPO_PUBLIC_YOUTUBE_API_KEY` come parametro `key`. La chiave API finisce quindi nel bundle e nelle
richieste in chiaro — accettabile per una API key YouTube con restrizioni, rischioso senza.

Un warning in fase di import avvisa lo sviluppatore quando né la chiave né Firebase sono configurati,
rimandando a `YOUTUBE_SETUP.md`. Quel file esiste nella root, insieme ad altra documentazione legacy
sullo stesso tema: `README_YOUTUBE.md`, `OAUTH_SETUP.md`, `REFRESH_TOKEN_SETUP.md`,
`TEST_FIREBASE_PROD.md` e lo script `get_refresh_token.py`. Tutta questa documentazione descrive
un'integrazione non più attiva.

### Gli hook

| Hook | Righe | Importato da |
|---|---|---|
| `useYouTubePlaylist` | 89 | **nessuno** |
| `useYouTubeChannelPlaylists` | 135 | **nessuno** |
| `useYouTubeAuth` | 179 | **nessuno** |

`youtubeService` è importato solo dai primi due hook, che a loro volta non sono importati da nessuna
schermata. L'intera catena è quindi orfana: nessun percorso di esecuzione dell'app la raggiunge.

### `useYouTubeAuth` — OAuth PKCE completo

179 righe che implementano un flusso OAuth 2.0 Authorization Code con PKCE tramite
`expo-auth-session`:

- Endpoint Google: `authorizationEndpoint`, `tokenEndpoint`, `revocationEndpoint`
- Scope: `https://www.googleapis.com/auth/youtube.readonly`
- Redirect URI: `AuthSession.makeRedirectUri({ scheme: 'mobilitas-academy', path: 'oauth' })`
- `usePKCE: true`, `responseType: Code`
- Scambio del code con il token via `fetch` su `https://oauth2.googleapis.com/token`
- Persistenza in `AsyncStorage` sotto la chiave `@youtube_access_token`
- `login()`, `logout()`, e caricamento del token salvato all'avvio

Lo schema `mobilitas-academy` è quello dichiarato in `app.json`, quindi il deep link di ritorno
funzionerebbe. Il flusso implementato è corretto e sicuro (PKCE senza client secret sul dispositivo),
ma non esiste alcuna interfaccia che chiami `login()`.

Note tecniche:

- Il flusso logga in console il Client ID completo e i primi 20 caratteri dell'access token.
- Il token è salvato **senza data di scadenza**: al riavvio verrebbe considerato valido anche se
  scaduto.
- Nessun refresh token viene richiesto o conservato.
- `logout` è dichiarato `logout: () => void` nell'interfaccia ma implementato come funzione `async`:
  incoerenza di tipo innocua.

La chiave `@youtube_access_token` è ancora **rimossa** da `cleanAndRefreshCaches`, che è il motivo per
cui la modale di pulizia cache in `ProfileScreen` cita ancora il *"token YouTube locale"*.

---

## 12.6 Firebase Cloud Functions — non raggiungibile

`src/services/firebaseService.ts` (229 righe) è un client per un set di Cloud Functions che fanno da
proxy verso YouTube, tenendo le credenziali Google lato server:

| Funzione client | Endpoint |
|---|---|
| `getYouTubeAccessToken()` | `GET {FUNCTIONS_URL}/getYouTubeToken` |
| `fetchPlaylistVideos(playlistId)` | `GET {FUNCTIONS_URL}/getPlaylistVideos` |
| `fetchPlaylistInfo(playlistId)` | `GET {FUNCTIONS_URL}/getPlaylistInfo` |
| `fetchChannelPlaylists(channelId?)` | `GET {FUNCTIONS_URL}/getChannelPlaylists` |
| `fetchPlaylistById(playlistId)` | riusa `getChannelPlaylists` e filtra in memoria |
| `isFirebaseConfigured()` | verifica che l'URL sia valorizzato |

L'architettura era corretta: **le credenziali OAuth stanno sul server**, il client chiede solo token
a breve scadenza. È l'approccio opposto (e giusto) rispetto a `cloudflareService.ts`.

### Risoluzione dell'URL delle functions

Logica a tre livelli, replicata quasi identica in `firebaseService.ts` e `youtubeTokenService.ts`:

```typescript
const USE_PRODUCTION_IN_DEV = process.env.EXPO_PUBLIC_FIREBASE_USE_PRODUCTION === 'true';
const FIREBASE_FUNCTIONS_URL = __DEV__
  ? (USE_PRODUCTION_IN_DEV
      ? process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL
      : (getLocalUrl() || process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL))
  : process.env.EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL;
```

`getLocalUrl()` (solo in `firebaseService.ts`) gestisce il caso dell'emulatore locale: se l'URL
contiene `localhost` e non siamo su web, tenta di sostituirlo con `EXPO_PUBLIC_FIREBASE_LOCAL_IP`,
altrimenti stampa un warning esplicativo con le istruzioni per trovare l'IP nel terminale Expo.
È lo stesso problema risolto in modo più pulito da `resolveDevBackendUrl.ts` per il backend
principale (vedi [02](./02-configurazione-ambiente-e-build.md)).

### `youtubeTokenService.ts` — cascata a tre livelli

165 righe che orchestrano l'ottenimento di un access token con priorità decrescente:

1. **Firebase Functions** (se `FIREBASE_FUNCTIONS_URL` è configurato) — il più sicuro
2. **Backend proprio**: `GET {API_BASE_URL}/youtube/token` — endpoint che il backend Mobilitas
   probabilmente non espone più
3. **Refresh token da variabili d'ambiente**: `POST https://oauth2.googleapis.com/token` con
   `EXPO_PUBLIC_GOOGLE_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` e
   `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN`

Il livello 3 è il più problematico: **client secret e refresh token OAuth in variabili
`EXPO_PUBLIC_*`**, quindi nel bundle. Un client secret Google e un refresh token a lunga vita
estraibili dall'APK sono credenziali di valore. Il codice ne è consapevole solo in parte: i commenti
lo etichettano come "modalità sviluppo", ma il codice compilato è identico in produzione, e
`USE_BACKEND = !USE_FIREBASE` fa sì che il livello 3 sia raggiunto solo quando anche il livello 2
fallisce.

Cache del token in memoria, con margine di sicurezza:

```typescript
tokenExpiryTime = Date.now() + (3600 - 300) * 1000;   // 1 ora meno 5 minuti
```

Il logging stampa i primi 20 caratteri di Client ID e refresh token.

`hasRefreshToken()` restituisce `USE_FIREBASE || USE_BACKEND || !!REFRESH_TOKEN`: poiché
`USE_BACKEND` è definito come `!USE_FIREBASE`, l'espressione è **sempre `true`**. È un bug latente in
codice non eseguito.

---

## 12.7 Riepilogo delle azioni raccomandate

### Sicurezza (priorità alta)

1. **Ruotare il token Cloudflare Stream** se `EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN` è mai stato
   valorizzato in una build distribuita, ed eliminare `cloudflareService.ts`.
2. **Ruotare le credenziali Google** (`EXPO_PUBLIC_GOOGLE_CLIENT_SECRET`,
   `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN`) per lo stesso motivo, ed eliminare `youtubeTokenService.ts`.
3. Rimuovere le variabili corrispondenti da `.env`, `.env.example` e dai profili `eas.json`.
4. Eliminare i `console.log` che stampano frammenti di credenziali (`cloudflareService.ts:41`,
   `youtubeTokenService.ts:105-107`, `useYouTubeAuth.ts:74`, `130`).

### Pulizia (priorità media)

5. Rimuovere `youtubeService.ts`, `firebaseService.ts`, `useYouTubeAuth.ts`,
   `useYouTubeChannelPlaylists.ts`, `useYouTubePlaylist.ts`: circa 1.250 righe non raggiungibili.
6. Rimuovere dalle dipendenze `react-native-youtube-iframe` e verificare se `react-native-webview` è
   ancora necessario per altro.
7. Aggiornare il testo della modale "Pulisci cache" per non citare più il token YouTube, e rimuovere
   la relativa chiave da `appCacheService`.

### Robustezza (priorità bassa)

8. Controllare il valore di ritorno di `openStudioWhatsApp` e mostrare un messaggio se
   l'apertura fallisce.
9. Rendere configurabile il numero WhatsApp (variabile d'ambiente o campo su `StudioDto`).
10. Migrare `expo-file-system/legacy` alla nuova API dell'SDK 54.
11. Sostituire il match sui messaggi di errore di fatturazione con codici di errore stabili
    concordati con il backend.
12. Popolare `durataSecondi` lato backend, eliminando la necessità del parsing HLS lato client.
