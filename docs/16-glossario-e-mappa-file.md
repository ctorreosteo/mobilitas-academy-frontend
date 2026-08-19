# 16 — Glossario e mappa dei file

Riferimento rapido: terminologia di dominio, corrispondenze italiano/inglese, e indice di ogni file
con la sua responsabilità.

---

## 16.1 Glossario di dominio

### Entità clinico-amministrative

**Acquisto** — Il titolo che autorizza una prestazione. Un paziente compra un servizio (una seduta, un
pacchetto di sedute, un abbonamento) e ottiene un `Acquisto`. Le visite si agganciano a un acquisto:
senza acquisto prenotabile, un operatore non può registrare una visita. Campo chiave:
`prenotabile` (booleano che indica se l'acquisto ha ancora prestazioni disponibili).

**Servizio** — Il catalogo delle prestazioni acquistabili (`GET /api/servizi/attivi`). Ha un prezzo,
una durata e un flag di attività. È ciò che si seleziona creando un acquisto.

**Visita** — L'appuntamento individuale in studio, fra un paziente e un osteopata, in una fascia
orario di uno studio specifico. Ha uno stato e un acquisto di riferimento.

**Slot / Disponibilità** — Le fasce orario libere di un osteopata in un dato giorno e studio, calcolate
dal backend. L'app le mostra e ne fa selezionare una.

**Sessione posturale** — Corso di gruppo in presenza, con calendario ricorrente. È una **tipologia**
(es. "Postura base"), non un singolo evento: le occorrenze di quella tipologia compaiono nel
calendario. Concetto centrale: si prenota una **occorrenza di una tipologia**, non un evento isolato.

**Prenotazione** — L'iscrizione di un paziente a un'occorrenza di sessione posturale. Distinta dalla
`Visita`, che riguarda gli appuntamenti individuali.

**Studio** — La sede fisica. L'app ne recupera l'elenco attivo (`GET /api/studi/attivi`); ogni studio
ha un proprio `googleReviewLink` e un insieme di osteopati associati.

**Osteopata** — Il professionista. Ha uno o più studi, un colore identificativo in agenda, e può essere
tirocinante. Un paziente ha un **osteopata di riferimento**.

**Paziente** — L'anagrafica clinica, distinta dall'`Utente` (le credenziali). Un utente con ruolo
paziente ha un `pazienteId` che serve a interrogare visite, pagamenti e acquisti.

**Pagamento** — L'incasso registrato, con metodo, importo, stato ed eventuali **allocazioni** su uno o
più acquisti. Può avere una fattura associata su Fatture in Cloud (`fatturaPresente`).

**Allocazione** — La quota di un pagamento imputata a un acquisto specifico. Serve perché un pagamento
unico può coprire più acquisti.

**Calendario completo (giorno)** — La vista aggregata dell'agenda di un osteopata per una data:
visite, eventi e assenze insieme (`GET /api/calendario/completo`).

### Entità formative

**Corso** (`Course` nel codice) — Il contenitore formativo. Esistono due cataloghi distinti e non
intercambiabili: **corsi aziendali** (formazione interna del personale) e **corsi posturali** (per i
pazienti).

**Modulo** (`Chapter` nel codice) — Raggruppamento ordinato di lezioni dentro un corso. Nell'interfaccia
è una sezione a fisarmonica.

**Lezione** (`Video` nel codice) — La singola unità video. Ha un `cloudflareUid` da cui si costruisce
l'URL del manifest HLS.

**HLS** — HTTP Live Streaming: il formato di streaming adattivo usato da Cloudflare Stream. Il
**master playlist** (`.m3u8`) elenca le varianti di bitrate; ogni **variant playlist** elenca i
segmenti con la loro durata (`#EXTINF`).

**Cloudflare Stream** — La piattaforma che ospita i video. L'app ne consuma solo gli URL pubblici di
streaming, senza toccare le API di gestione.

### Ruoli e permessi

**Ruolo mobile-only** — Un ruolo che identifica un utente finale dell'app (paziente o abbonato), non
un membro del personale. La costante `MOBILE_ONLY_ROLES` in `authApi.ts` li elenca.

**`hasPazienteRole(ruoli)`** — Vero se l'utente ha un ruolo paziente/mobile.

**`hasGestionaleRole(ruoli)`** — Vero se l'utente ha almeno un ruolo **non** presente in
`MOBILE_ONLY_ROLES`: identifica il personale dello studio. È il discriminante che determina quale
catalogo corsi montare e quale variante delle schermate visite mostrare.

**Gestionale** — Il sistema di back-office dello studio (Mobilitas HQ). Gli account nascono lì; l'app
non ha registrazione self-service.

### Termini tecnici del progetto

**Envelope** — Il formato uniforme delle risposte del backend:
`{ success: boolean, message: string, data: T, error: string }`. Ogni servizio verifica `success` e
lancia un `Error` con `message` o `error` in caso negativo.

**Idratazione della sessione** — La fase di avvio in cui `AuthContext` legge JWT e profilo da
`AsyncStorage` e decide se mostrare il login o l'app.

**Arricchimento del profilo** — Dopo `GET /auth/me`, l'app effettua chiamate aggiuntive
(`/osteopati/{id}`, `/pazienti/by-utente/{id}`) per completare lo `StoredUserProfile`.

**Copy** — L'oggetto di stringhe che parametrizza `CorsiCatalogView`, permettendo a una sola vista di
servire due cataloghi diversi.

**Prefetch catalogo** — Il caricamento anticipato del catalogo sessioni con precaricamento delle
immagini di copertina, implementato come store in-memory osservabile.

**`inflight`** — Il pattern di deduplicazione: un riferimento alla promise in corso, restituito alle
chiamate concorrenti per evitare richieste duplicate.

---

## 16.2 Corrispondenze italiano ↔ inglese

Il codice mescola i due vocabolari: i DTO seguono il backend italiano, i modelli UI usano nomi inglesi.

| Backend / dominio | Codice UI | Note |
|---|---|---|
| `Corso` / `CorsoDto` | `Course` | |
| `Modulo` / `ModuloDto` | `Chapter` | "chapter" non compare mai nell'interfaccia utente |
| `Lezione` / `LezioneDto` | `Video` | |
| `titolo` | `title` | |
| `descrizione` | `description` | |
| `ordine` | `order` | |
| `durataSecondi` | `duration` | **secondi** in `Video`, **minuti** in `Course` |
| `immagineCopertina` / `immagineCopertinaUrl` | `coverImage` / `thumbnail` | |
| `attivo` / `formazioneAttivo` | `formazioneAttivo` | mantenuto in italiano nel modello UI |
| `cloudflareUid` | `cloudflareUid` | invariato |
| `richiedeToken` | `richiedeToken` | invariato, e non usato dal player |
| `Visita` | `Visita` | non tradotto |
| `Acquisto` | `Acquisto` | non tradotto |
| `Pagamento` | `Pagamento` | non tradotto |
| `SessionePosturale` | `SessionePosturale` | non tradotto |

La traduzione avviene in `src/utils/mapCorsoToCourse.ts` e `src/services/courseContent.ts`. Solo il
dominio formativo è tradotto; visite, sessioni e pagamenti restano in italiano end-to-end.

---

## 16.3 Mappa dei file: `src/`

74 file, 17.164 righe. Ordinati per cartella.

### `src/api/`

| File | Righe | Responsabilità |
|---|---|---|
| `index.ts` | 137 | Istanza `axios` condivisa, risoluzione di `API_ORIGIN` per piattaforma, interceptor JWT e refresh su 401 |

### `src/context/`

| File | Righe | Responsabilità |
|---|---|---|
| `AuthContext.tsx` | 155 | `AuthProvider` e `useAuth`: idratazione sessione, `signIn`, `signOut`, stato globale `token`/`userProfile` |

### `src/hooks/`

| File | Righe | Responsabilità |
|---|---|---|
| `useCorsiAziendali.ts` | 27 | Query catalogo formazione interna, con `enabled` su ruolo gestionale |
| `useCorsiPosturali.ts` | 18 | Query catalogo corsi posturali |
| `useTabBarBottomPadding.ts` | 12 | Padding inferiore per liste sotto la tab bar in overlay |
| `useApi.ts` | 37 | **Non usato** — scaffolding di esempio |
| `useYouTubeAuth.ts` | 179 | **Non usato** — OAuth PKCE Google |
| `useYouTubeChannelPlaylists.ts` | 135 | **Non usato** |
| `useYouTubePlaylist.ts` | 89 | **Non usato** |

### `src/services/`

| File | Righe | Responsabilità |
|---|---|---|
| `authApi.ts` | 312 | Login, refresh, `/auth/me`, arricchimento profilo, `hasPazienteRole` / `hasGestionaleRole` |
| `authTokenStorage.ts` | 130 | Le 4 chiavi `AsyncStorage` di sessione, tipi `Stored*Profile`, preferenza "ricorda username" |
| `visiteService.ts` | 201 | CRUD visite, disponibilità, calendario completo del giorno |
| `studioVisitsService.ts` | 210 | Studi attivi, osteopati per studio |
| `acquistiService.ts` | 161 | Acquisti per paziente, creazione acquisto |
| `pagamentiService.ts` | 254 | Pagamenti per paziente, download e condivisione PDF fattura |
| `pazientiService.ts` | 119 | Ricerca avanzata pazienti, osteopata di riferimento |
| `serviziService.ts` | 120 | Catalogo servizi attivi |
| `sessioniPosturaliService.ts` | 217 | Catalogo, calendario e prenotazioni sessioni posturali |
| `sessioniPosturaliCatalogPrefetch.ts` | 88 | Store in-memory osservabile del catalogo + prefetch immagini |
| `formazioneService.ts` | 74 | Corsi aziendali accessibili, moduli, lezioni; tipo `ApiResponseDto` |
| `corsiPosturaliService.ts` | 143 | Corsi posturali, moduli, lezioni |
| `courseContent.ts` | 126 | Orchestrazione moduli+lezioni per catalogo, costruzione URL HLS |
| `appCacheService.ts` | 22 | `cleanAndRefreshCaches`: pulizia cache senza logout |
| `fitnessService.ts` | 183 | **Non raggiungibile** — API modulo fitness |
| `fitnessCatalogPrefetch.ts` | 94 | **Non raggiungibile** — store fitness |
| `youtubeService.ts` | 450 | **Non raggiungibile** — client YouTube Data API v3 |
| `youtubeTokenService.ts` | 165 | **Non raggiungibile** — cascata token OAuth (contiene credenziali esposte) |
| `firebaseService.ts` | 229 | **Non raggiungibile** — client Cloud Functions proxy YouTube |
| `cloudflareService.ts` | 288 | **Non usato** — API gestione Cloudflare Stream (token esposto) |

### `src/screens/` (radice)

| File | Righe | Responsabilità |
|---|---|---|
| `LoginScreen.tsx` | 471 | Accesso, "ricorda username", modali registrazione e password dimenticata |
| `HomeScreen.tsx` | 273 | Hub con tre scorciatoie e changelog operativo |
| `ProfileScreen.tsx` | 1.238 | Profilo, recensioni Google, pulizia cache, logout, eliminazione account, 6 voci inattive |
| `CourseVideosScreen.tsx` | 433 | Dettaglio corso: moduli a fisarmonica, lezioni, risoluzione durate HLS |
| `VideoPlayerScreen.tsx` | 617 | Player `expo-av` con controlli nativi e overlay custom |
| `FitnessScreen.tsx` | 323 | **Non raggiungibile** — hub fitness |

### `src/screens/corsi/`

| File | Righe | Responsabilità |
|---|---|---|
| `CorsiCatalogView.tsx` | 450 | Vista catalogo condivisa, parametrizzata da `CorsiCatalogCopy` |
| `CorsiStack.tsx` | 67 | Stack corsi con montaggio condizionale per ruolo |
| `CorsiAziendaliScreen.tsx` | 35 | Wrapper: `COPY` aziendale + `useCorsiAziendali` |
| `CorsiPosturaliScreen.tsx` | 35 | Wrapper: `COPY` posturale + `useCorsiPosturali` |
| `types.ts` | 12 | `CorsiStackParamList` |

### `src/screens/visite/`

| File | Righe | Responsabilità |
|---|---|---|
| `BookVisitScreen.tsx` | 1.446 | Prenotazione visita: flusso operatore e flusso paziente |
| `GestioneVisiteScreen.tsx` | 886 | Agenda giornaliera operatore oppure storico visite paziente |
| `CreaAcquistoModal.tsx` | 603 | Creazione acquisto dal form visita |
| `PagamentiPazienteScreen.tsx` | 513 | Storico pagamenti con download fattura |
| `visiteFormatting.ts` | 235 | Formattazione date, orari, stati, importi |
| `VisiteMenuScreen.tsx` | 187 | Menu del modulo visite |
| `SelectModal.tsx` | 179 | Componente select generico riutilizzabile |
| `VisiteStack.tsx` | 54 | Stack del modulo visite |
| `types.ts` | 6 | `VisiteStackParamList` |

### `src/screens/sessioni/`

| File | Righe | Responsabilità |
|---|---|---|
| `SessioniCalendarioScreen.tsx` | 740 | Griglia calendario mensile, occorrenze, prenotazione |
| `SessioniPrenotazioniScreen.tsx` | 553 | Prenotazioni attive con annullamento |
| `SessioniHomeScreen.tsx` | 316 | Hub del modulo sessioni |
| `SessioniStack.tsx` | 48 | Stack del modulo |
| `types.ts` | 5 | `SessioniStackParamList` |

### `src/screens/fitness/` — non raggiungibile

| File | Righe |
|---|---|
| `FitnessSessionsCalendarScreen.tsx` | 713 |
| `FitnessBookingsScreen.tsx` | 548 |
| `FitnessStack.tsx` | 49 |
| `types.ts` | 5 |

### `src/components/`

| File | Righe | Responsabilità |
|---|---|---|
| `CourseCard.tsx` | 226 | Card corso con copertina, progresso e stato bloccato |
| `ChapterSection.tsx` | 122 | Sezione modulo a fisarmonica |
| `VideoItem.tsx` | 95 | Riga lezione |
| `SpineIcon.tsx` | 96 | Icona colonna vertebrale disegnata in codice, con profilo responsive |
| `StudioWhatsAppSupportButton.tsx` | 70 | Pulsante di supporto WhatsApp con messaggio precompilato |
| `SplashScreen.tsx` | 529 | **Non usato** — splash animata |
| `Button.tsx` | 55 | **Non usato** — unico componente pulsante |

### `src/utils/`

| File | Righe | Responsabilità |
|---|---|---|
| `apiErrorMessage.ts` | 145 | `getUserFacingApiErrorMessage`: traduttore centrale degli errori |
| `hlsDuration.ts` | 80 | Parser manifest HLS con cache delle durate |
| `mapCorsoToCourse.ts` | 41 | Mapper DTO corso → modello UI, per entrambi i cataloghi |
| `resolveDevBackendUrl.ts` | 41 | Risoluzione URL backend in sviluppo (emulatore, simulatore, dispositivo) |
| `openStudioWhatsApp.ts` | 20 | Apertura link `wa.me` con numero segreteria hardcoded |
| `pickCoverImageUrl.ts` | 9 | Primo URL copertina valido fra più candidati |
| `themeUtils.ts` | 40 | **Non usato** — helper del theme |

### `src/theme/` e `src/types/`

| File | Righe | Responsabilità |
|---|---|---|
| `theme/index.ts` | 87 | Palette, `withOpacity`, definizioni font |
| `types/index.ts` | 93 | Modelli UI (`Course`, `Chapter`, `Video`), tipi di navigazione |

---

## 16.4 Mappa dei file: root e configurazione

| File | Responsabilità |
|---|---|
| `App.tsx` | Bootstrap: `ErrorBoundary`, `QueryClientProvider`, `SafeAreaProvider`, `AuthProvider`, gate di sessione, `Tab.Navigator` con 5 tab |
| `index.ts` | Entry point Expo (`registerRootComponent`) |
| `app.json` | Configurazione Expo: nome, versione, bundle id, schema, splash, permessi |
| `eas.json` | Profili di build EAS |
| `tsconfig.json` | Configurazione TypeScript (estende `expo/tsconfig.base`) |
| `package.json` | Dipendenze e script npm; nome pacchetto `studio-osteopatico-frontend` |
| `.env` / `.env.example` | Variabili `EXPO_PUBLIC_*` |
| `.easignore`, `.gitignore` | Esclusioni |
| `android/`, `ios/` | Progetti nativi (prebuild): manifest, `Info.plist`, `build.gradle` |
| `assets/` | Icone e immagini dell'app |
| `fonts/README.md` | Istruzioni per Montserrat — **mai eseguite** |
| `docs/` | Questa documentazione |

### File legacy nella root

| File | Stato |
|---|---|
| `AppTest.tsx` | Tre schermate placeholder, non referenziato |
| `DOCUMENTAZIONE_COMPLETA_APP.md` | Documentazione precedente, parzialmente obsoleta |
| `YOUTUBE_SETUP.md`, `README_YOUTUBE.md`, `OAUTH_SETUP.md`, `REFRESH_TOKEN_SETUP.md`, `TEST_FIREBASE_PROD.md` | Configurazione dell'integrazione YouTube dismessa |
| `BACKEND_SETUP.md`, `DEPLOYMENT.md`, `TROUBLESHOOTING.md` | Da verificare per attualità |
| `get_refresh_token.py` | Script per refresh token YouTube |
| `scripts/fill-video-durations.js` | Script deprecato: stampa un messaggio ed esce |

---

## 16.5 Indice per compito

"Devo modificare X — dove guardo?"

| Compito | File principali |
|---|---|
| Aggiungere un endpoint | `src/services/<dominio>Service.ts`, poi [04](./04-api-e-servizi.md) |
| Cambiare un colore o uno stile globale | `src/theme/index.ts` |
| Cambiare la tab bar | `App.tsx` (`tabBarColors`, `screenOptions`) |
| Aggiungere una schermata a un modulo | `src/screens/<modulo>/<Modulo>Stack.tsx` + `types.ts` |
| Modificare la logica dei ruoli | `src/services/authApi.ts` (`MOBILE_ONLY_ROLES`, `hasGestionaleRole`) |
| Cambiare il comportamento del login | `src/screens/LoginScreen.tsx`, `src/context/AuthContext.tsx` |
| Modificare la gestione del token | `src/api/index.ts` (interceptor), `src/services/authTokenStorage.ts` |
| Cambiare un messaggio di errore | `src/utils/apiErrorMessage.ts` o il `context` nella schermata |
| Modificare il numero WhatsApp | `src/utils/openStudioWhatsApp.ts` (hardcoded) |
| Cambiare la logica di prenotazione visita | `src/screens/visite/BookVisitScreen.tsx` |
| Cambiare il calendario sessioni | `src/screens/sessioni/SessioniCalendarioScreen.tsx` |
| Modificare il player video | `src/screens/VideoPlayerScreen.tsx` |
| Cambiare i testi di un catalogo corsi | `src/screens/corsi/Corsi{Aziendali,Posturali}Screen.tsx` (oggetto `COPY`) |
| Aggiungere una voce al profilo | `src/screens/ProfileScreen.tsx` |
| Modificare la pulizia cache | `src/services/appCacheService.ts` |
| Cambiare l'URL del backend | `.env` (`EXPO_PUBLIC_*`), `src/api/index.ts`, `src/utils/resolveDevBackendUrl.ts` |
| Aggiungere un permesso nativo | `app.json`, `android/app/src/main/AndroidManifest.xml`, `ios/**/Info.plist` |
| Cambiare versione o build number | `app.json`, `android/app/build.gradle`, `Info.plist` |

---

## 16.6 Indice dei documenti

| # | Documento |
|---|---|
| 01 | [Panoramica e architettura](./01-panoramica-e-architettura.md) |
| 02 | [Configurazione, ambienti e build](./02-configurazione-ambiente-e-build.md) |
| 03 | [Autenticazione, ruoli e sessione](./03-autenticazione-ruoli-e-sessione.md) |
| 04 | [Catalogo API e layer servizi](./04-api-e-servizi.md) |
| 05 | [Modello dati completo](./05-modello-dati.md) |
| 06 | [Navigazione e mappa schermate](./06-navigazione-e-schermate.md) |
| 07 | [Modulo Visite](./07-modulo-visite.md) |
| 08 | [Modulo Sessioni posturali e Fitness](./08-modulo-sessioni-e-fitness.md) |
| 09 | [Modulo Corsi e player video](./09-modulo-corsi-e-video.md) |
| 10 | [Login, Home e Profilo](./10-login-home-profilo.md) |
| 11 | [Design system e UI](./11-design-system-e-ui.md) |
| 12 | [Integrazioni esterne](./12-integrazioni-esterne.md) |
| 13 | [Stato, cache e storage](./13-stato-cache-e-storage.md) |
| 14 | [Errori e messaggistica utente](./14-errori-e-messaggistica.md) |
| 15 | [Debito tecnico e anomalie](./15-debito-tecnico-e-anomalie.md) |
| 16 | Glossario e mappa dei file (questo documento) |
