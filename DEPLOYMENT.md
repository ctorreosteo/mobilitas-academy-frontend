# Deploy su Apple App Store — Mobilitas Academy

Guida operativa per portare l'app in produzione su App Store. Segui i passi in ordine.

> Dopo aver modificato la configurazione nativa (`app.json`, `Info.plist`, `eas.json`)
> hai due strade equivalenti:
> 1. lasciare che `eas build` faccia tutto da sé partendo dal `app.json`, oppure
> 2. rigenerare i file iOS con `npx expo prebuild --clean --platform ios`
>    se preferisci usare Xcode in locale.

---

## 1. Prerequisiti

- [ ] Apple Developer Program attivo (99 USD/anno) → [developer.apple.com/programs](https://developer.apple.com/programs)
- [ ] Accesso a [App Store Connect](https://appstoreconnect.apple.com)
- [ ] Mac con Xcode 16+ (solo se vuoi buildare in locale)
- [ ] `eas-cli` installato globalmente: `npm i -g eas-cli`
- [ ] Account Expo: `eas login`

## 2. Identificatori da personalizzare

I file sono già stati aggiornati con valori sensati. Cambia questi placeholder se necessario:

| File | Chiave | Valore attuale | Note |
|---|---|---|---|
| `app.json` | `expo.ios.bundleIdentifier` | `com.mobilitas.academy` | Cambialo se hai un dominio diverso |
| `app.json` | `expo.android.package` | `com.mobilitas.academy` | Idem |
| `eas.json` | `submit.production.ios.appleId` | `REPLACE_WITH_APPLE_ID@example.com` | Email Apple Developer |
| `eas.json` | `submit.production.ios.ascAppId` | `REPLACE_WITH_APP_STORE_CONNECT_APP_ID` | ID numerico App Store Connect (10 cifre) |
| `eas.json` | `submit.production.ios.appleTeamId` | `REPLACE_WITH_APPLE_TEAM_ID` | Team ID Apple Developer |
| `ios/Mobilitas.xcodeproj/project.pbxproj` | `PRODUCT_BUNDLE_IDENTIFIER` | `com.mobilitas.academy` | In sync con `app.json` |

> Se cambi il `bundleIdentifier`, aggiorna anche gli **Authorized redirect URIs** di Google Cloud Console (vedi `OAUTH_SETUP.md`).

## 3. Asset grafici da preparare

Sostituisci nella cartella `assets/`:

| File | Dimensione | Note |
|---|---|---|
| `assets/icon.png` | **1024×1024 PNG** | Niente canale alfa, niente angoli arrotondati |
| `assets/adaptive-icon.png` | 1024×1024 PNG | Android, può avere alpha |
| `assets/splash-icon.png` | 2048×2048 PNG centrato | Sfondo bianco |
| `assets/favicon.png` | 192×192 PNG | Solo web |

**Icona App Store** (separata, da caricare su App Store Connect): 1024×1024 PNG, sRGB, no alpha.

**Screenshot obbligatori** (li carichi su App Store Connect):
- iPhone 6.9" (es. iPhone 16 Pro Max): **1320×2868**, almeno 3, max 10
- iPad Pro 13": **2064×2752**, almeno 3 (obbligatori perché `supportsTablet: true`)

## 4. Sicurezza: pulisci i secret dal client

⚠️ Sono attualmente esposti nel bundle JS (chiunque può estrarli):

| Variabile | File | Azione |
|---|---|---|
| `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` | `src/services/youtubeTokenService.ts` | Spostare su Firebase Functions |
| `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN` | `src/services/youtubeTokenService.ts` | Spostare su Firebase Functions |
| `EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN` | `src/services/cloudflareService.ts` | Spostare su Firebase Functions e firmare gli URL lì |

⚠️ **YouTube API key committata in chiaro** in `README_YOUTUBE.md` (linea 9 e 76).
**Ruotala** subito su Google Cloud Console e cancella il valore vecchio dal file.
La nuova key dev'essere **vincolata** per bundle id su Google Cloud Console.

Per la prima versione puoi anche tenere il client com'è ma:
1. ruotare le credenziali esposte
2. nelle "App Review Information" chiarire che il login Google serve solo come admin tool

## 5. Configurazione EAS

```bash
eas login

eas init  # genera projectId in app.json sotto expo.extra.eas.projectId
```

Crea i secret EAS (non vanno in `eas.json`, sono cifrati lato server):

```bash
eas secret:create --scope project --name EXPO_PUBLIC_YOUTUBE_API_KEY --value "AIza..."
eas secret:create --scope project --name EXPO_PUBLIC_GOOGLE_CLIENT_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_CLOUDFLARE_ACCOUNT_ID --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_CLOUDFLARE_STREAM_SUBDOMAIN --value "..."
eas secret:create --scope project --name EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_BACKEND_URL --value "https://..."
```

Verifica i secret: `eas secret:list`.

## 6. Crea l'app su App Store Connect

1. Vai su [appstoreconnect.apple.com](https://appstoreconnect.apple.com) → My Apps → **+** → New App
2. Compila:
   - **Platform**: iOS
   - **Name**: Mobilitas Academy
   - **Primary Language**: Italian
   - **Bundle ID**: `com.mobilitas.academy` (lo crea EAS al primo build, oppure manualmente in [developer.apple.com](https://developer.apple.com) → Identifiers)
   - **SKU**: `mobilitas-academy-001`
   - **User Access**: Full Access
3. Copia il numero a 10 cifre dall'URL (es. `https://appstoreconnect.apple.com/apps/1234567890/...`) → mettilo in `eas.json` come `ascAppId`.

## 7. Build di produzione

```bash
# Prima build: EAS chiede credenziali Apple per gestire certificati e provisioning.
# Rispondi YES quando chiede di generare automaticamente le credenziali.
npm run build:ios:production
```

Tempi tipici: 15–25 minuti. Quando finisce, l'IPA è scaricabile dal dashboard EAS.

## 8. Upload su App Store Connect

```bash
npm run submit:ios
```

Apple impiega 10–30 minuti per processare il file. Lo trovi su App Store Connect → TestFlight.

## 9. Test su TestFlight (consigliato)

1. App Store Connect → TestFlight → seleziona la build.
2. Compila **Test Information** (descrizione + email contatto).
3. Aggiungi te stesso come Internal Tester.
4. Installa TestFlight su iPhone reale e testa:
   - Login email/password
   - Login Google (se ancora abilitato)
   - Riproduzione video Cloudflare (HLS)
   - Schermate Fitness, Visite, Profilo
   - Rotation portrait/landscape sul player
   - Deeplink (se attivati)

## 10. Listing su App Store Connect

Compila la sezione "Prepare for Submission" della tua app:

### Informazioni generali
- **Nome**: Mobilitas Academy
- **Sottotitolo** (max 30 caratteri): Corsi e fitness on demand
- **Categoria primaria**: Salute e benessere (o Istruzione)
- **Categoria secondaria**: Stile di vita

### Testi
- **Descrizione** (max 4000 caratteri):
  ```
  Mobilitas Academy è l'app ufficiale di [NOME STUDIO] per accedere
  a corsi di osteopatia, mobilità articolare e allenamento personalizzato.

  Funzionalità principali:
  • Catalogo video corsi sempre aggiornato
  • Programmi di fitness e mobilità guidati
  • Riproduzione fluida con qualità adattiva
  • Profilo personale per tenere traccia dei progressi
  • Login sicuro con email o account Google

  L'app è pensata per accompagnarti ogni giorno con contenuti
  professionali creati dai nostri osteopati e trainer certificati.
  ```
- **Keywords** (max 100 caratteri, separate da virgola):
  `osteopatia,mobilità,fitness,allenamento,corsi,salute,benessere,stretching,esercizi,postura`
- **Promotional text** (max 170 caratteri):
  `Nuovi corsi ogni settimana: osteopatia, mobilità articolare e allenamento. Inizia oggi.`
- **What's New** (per la v1.0.0):
  `Prima release pubblica di Mobilitas Academy.`

### URL pubblici (obbligatori)
- **Support URL**: `https://www.tuo-dominio.com/supporto`
- **Marketing URL**: `https://www.tuo-dominio.com`
- **Privacy Policy URL**: `https://www.tuo-dominio.com/privacy` ← **obbligatorio**, deve essere accessibile

### Age Rating
Rispondi "Nessuno" a tutte le domande del questionario → 4+.

### App Privacy ("Nutrition Label")
Dichiara per ogni categoria:
- **Identificativi** (User ID, email): collegati all'utente — per autenticazione
- **Dati di utilizzo**: collegati all'utente — per analytics
- **Dati diagnostici** (crash log): non collegati all'utente — per diagnostica
- **Tracking**: NO (non usi SDK di tracking cross-app)

### App Review Information
- **Sign-in required**: Yes
- **Demo account**:
  - Username: `review@mobilitas.example`
  - Password: `ReviewMobilitas2026!`
- **Notes** (in inglese):
  ```
  Demo credentials above grant full access to all app features.
  All video content is owned by [NOME STUDIO] or licensed for educational
  distribution. The optional Google sign-in is used only by internal admins
  to fetch YouTube playlists; reviewers can ignore it and use the demo
  account instead.
  ```
- **Contact**: tuo nome, cognome, telefono, email

## 11. Submit for Review

1. App Store Connect → versione 1.0.0 → **Add for Review** → **Submit to App Review**.
2. Scegli **Automatically release this version** o **Manually release**.
3. Tempi tipici di review: 24–48 ore.
4. Stati possibili:
   - *Waiting for Review* → *In Review* → *Pending Developer Release* / *Ready for Sale*
   - *Metadata Rejected* / *Binary Rejected* → leggi il messaggio, sistema, re-submit

## 12. Aggiornamenti successivi (release n+1)

```bash
# Bumpa version in app.json (es. "1.0.1")
# Il buildNumber lo gestisce EAS automaticamente (autoIncrement: true)

npm run build:ios:production
npm run submit:ios
```

Poi in App Store Connect → "+ Version or Platform" → nuova versione → seleziona la build → Submit.

---

## Checklist finale prima del submit

### Configurazione
- [x] `bundleIdentifier` cambiato (non più `com.anonymous.*`)
- [x] `version` + `buildNumber` impostati in `app.json`
- [x] `ITSAppUsesNonExemptEncryption=false` in `Info.plist`
- [x] `NSMicrophoneUsageDescription` in italiano e specifica
- [x] URL scheme `com.anonymous.*` rimosso
- [x] `eas.json` creato
- [x] `.easignore` creato
- [x] `.gitignore` completo
- [x] `.env.example` come template

### Asset
- [ ] Icona 1024×1024 PNG senza alpha in `assets/icon.png` (sostituisci quella attuale che è il favicon)
- [ ] Splash screen aggiornato in `assets/splash-icon.png`
- [ ] Screenshot iPhone 6.9" preparati (almeno 3)
- [ ] Screenshot iPad 13" preparati (almeno 3)

### Account e listing
- [ ] Apple Developer Program attivo
- [ ] Team ID copiato in `eas.json`
- [ ] App creata su App Store Connect
- [ ] `ascAppId` copiato in `eas.json`
- [ ] EAS secrets creati per le variabili `EXPO_PUBLIC_*`
- [ ] Privacy Policy pubblicata online
- [ ] Account demo creato per il reviewer
- [ ] Privacy "Nutrition Label" compilata
- [ ] Listing (testo, keyword, categoria) compilato

### Sicurezza
- [ ] YouTube API key di `README_YOUTUBE.md` **ruotata** su Google Cloud
- [ ] `EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` rimossa dal client
- [ ] `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN` rimossa dal client
- [ ] `EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN` rimossa dal client
- [ ] Tutti gli endpoint di produzione sono HTTPS

### QA
- [ ] Build EAS production OK senza warning
- [ ] TestFlight su iPhone reale superato
- [ ] TestFlight su iPad reale superato (se supporti tablet)
- [ ] Tutte le schermate funzionano in landscape (su iPhone E iPad)
- [ ] Login, video player, navigazione, deeplink testati

---

## Riferimenti

- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [Expo EAS Build](https://docs.expo.dev/build/introduction/)
- [Expo EAS Submit](https://docs.expo.dev/submit/introduction/)
- [App Store Connect Help](https://developer.apple.com/help/app-store-connect/)
