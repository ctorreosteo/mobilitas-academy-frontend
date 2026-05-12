# Mobilitas Academy - Documentazione Completa dell'Applicazione

## 1. Scopo del documento

Questo documento descrive in modo approfondito l'app mobile **Mobilitas Academy**, coprendo:

- visione prodotto;
- architettura tecnica;
- struttura del codice;
- flussi utente principali;
- integrazioni esterne;
- configurazioni runtime e build;
- sicurezza lato client;
- limiti attuali e possibili evoluzioni.

L'obiettivo e fornire una base unica e completa per onboarding, manutenzione, audit tecnico e pianificazione evolutiva.

---

## 2. Panoramica prodotto

Mobilitas Academy e un'app mobile orientata a due macro-domini:

- **Formazione**: fruizione di corsi video (corsi, moduli, lezioni, progressi);
- **Operativita clinico-sportiva**: gestione visite osteopatiche e prenotazioni fitness.

L'app include anche:

- autenticazione utente con sessione persistita;
- area profilo con utility e funzioni di supporto;
- integrazioni esterne per contenuti video (YouTube/Firebase/Cloudflare) in scenari specifici.

### 2.1 Profili utente e comportamento adattivo

La UX cambia in base al ruolo dell'utente autenticato (ad esempio paziente vs osteopata):

- nella gestione visite, l'utente paziente vede il proprio storico prenotazioni;
- l'utente osteopata puo visualizzare agenda giornaliera e prenotare per pazienti selezionati.

I ruoli sono veicolati dal profilo backend (`ruoli`) e consumati nel frontend per abilitare/disabilitare percorsi.

---

## 3. Stack tecnologico

### 3.1 Core

- **Framework mobile**: Expo + React Native
- **Linguaggio**: TypeScript
- **UI Navigation**: React Navigation (Bottom Tabs + Stack nidificati)
- **Server State**: TanStack React Query
- **HTTP Client**: Axios
- **Media playback**: `expo-av`
- **Storage locale**: AsyncStorage

### 3.2 Runtime e toolchain

- avvio via `expo start`;
- build cloud via EAS (`eas build`, `eas submit`);
- progetto prebuildato con cartelle native `ios/` e `android/`.

Riferimenti principali:

- `package.json`
- `app.json`
- `eas.json`
- `tsconfig.json`

---

## 4. Architettura applicativa

## 4.1 Entrypoint e bootstrap

- `index.ts`: registra componente root.
- `App.tsx`: compone l'albero provider e navigator.

Catena principale:

1. `ErrorBoundary` globale;
2. `SafeAreaProvider`;
3. `QueryClientProvider` (React Query);
4. `AuthProvider` (stato sessione e utente);
5. Navigator root condizionale (`Login` vs app autenticata).

### 4.2 Navigazione

La navigazione e organizzata su due livelli:

- **Root Stack**:
  - `Login` (utente non autenticato)
  - `Main` (utente autenticato)
- **Main Tabs**:
  - Home
  - Corsi
  - Visite
  - Fitness
  - Profilo

Alcune tab montano stack interni per drill-down:

- stack Corsi (lista corsi -> contenuti -> player video),
- stack Visite (menu -> gestione -> prenotazione),
- stack Fitness (landing -> calendario -> prenotazioni attive).

File di riferimento:

- `App.tsx`
- `src/screens/visite/VisiteStack.tsx`
- `src/screens/fitness/FitnessStack.tsx`

### 4.3 Stato globale e stato locale

- **Globale auth**: `AuthContext` conserva token, utente, stato `isSignedIn`, loading di bootstrap.
- **Server state**: query/mutation React Query per fetch e mutazioni dati backend.
- **Locale UI**: `useState` per filtri, modali, selezioni, loading di vista.

File chiave:

- `src/context/AuthContext.tsx`
- `src/hooks/useFormazioneCourses.ts`

### 4.4 Layer servizi e API

Il layer servizi separa i domini funzionali:

- `authApi`, `formazioneService`, `visiteService`, `fitnessService`,
- `acquistiService`, `serviziService`, `pazientiService`,
- integrazioni esterne `youtubeService`, `firebaseService`, `cloudflareService`.

Il client HTTP centrale in `src/api/index.ts` gestisce:

- base URL dinamico;
- injection bearer token;
- refresh automatico su HTTP 401;
- retry del request originale dopo refresh.

---

## 5. Struttura del repository

## 5.1 Directory principali

- `src/screens`: schermate applicative (feature-driven)
- `src/services`: accesso dati e normalizzazione DTO
- `src/api`: configurazione axios e interceptor
- `src/context`: stato globale (auth)
- `src/components`: componenti UI riusabili
- `src/hooks`: hook custom per use-case specifici
- `src/utils`: utility (date, mapping, durata HLS, formattazioni)
- `src/theme`: tema visuale e costanti di stile
- `ios`, `android`: sorgenti nativi generati/gestiti per build native

## 5.2 Documentazione operativa presente

Sono presenti vari documenti operativi, tra cui:

- `DEPLOYMENT.md`
- `BACKEND_SETUP.md`
- `YOUTUBE_SETUP.md`
- `TROUBLESHOOTING.md`
- `REFRESH_TOKEN_SETUP.md`

Questi file completano la documentazione del flusso tecnico di rilascio e configurazione.

---

## 6. Schermate e responsabilita funzionali

## 6.1 Accesso e sessione

### `src/screens/LoginScreen.tsx`

Responsabilita:

- login con email/username + password;
- gestione remember username;
- feedback di errore autenticazione;
- apertura modale informativa registrazione.

## 6.2 Home

### `src/screens/HomeScreen.tsx`

Responsabilita:

- dashboard introduttiva;
- entry point rapido verso aree core (visite, corsi, fitness).

## 6.3 Formazione

### `src/screens/CoursesScreen.tsx`

Responsabilita:

- visualizzazione corsi accessibili;
- esposizione stato/progresso;
- refresh dati e gestione stati loading/error.

### `src/screens/CourseVideosScreen.tsx`

Responsabilita:

- caricamento moduli e lezioni del corso;
- composizione gerarchica capitoli/contenuti;
- recupero durata video HLS mancante;
- visualizzazione avanzamento.

### `src/screens/VideoPlayerScreen.tsx`

Responsabilita:

- riproduzione contenuti video;
- controlli playback (play/pause, mute, speed);
- supporto fullscreen e gestione orientamento.

## 6.4 Fitness

### `src/screens/FitnessScreen.tsx`

Responsabilita:

- landing area fitness;
- riepilogo prenotazioni utente;
- navigazione verso calendario e lista prenotazioni.

### `src/screens/fitness/FitnessSessionsCalendarScreen.tsx`

Responsabilita:

- calendario disponibilita sessioni;
- prenotazione sessione;
- gestione conferme/esiti.

### `src/screens/fitness/FitnessBookingsScreen.tsx`

Responsabilita:

- elenco sessioni prenotate dall'utente;
- annullamento prenotazione con conferma.

## 6.5 Visite

### `src/screens/visite/VisiteMenuScreen.tsx`

Responsabilita:

- menu di accesso ai due percorsi visite:
  - gestione storico/agenda;
  - nuova prenotazione.

### `src/screens/visite/GestioneVisiteScreen.tsx`

Responsabilita:

- comportamento adattivo per ruolo;
- paziente: storico visite personali;
- osteopata: vista agenda giornaliera;
- supporto fallback WhatsApp in casi critici.

### `src/screens/visite/BookVisitScreen.tsx`

Responsabilita:

- wizard di prenotazione visita:
  - selezione studio;
  - selezione osteopata;
  - selezione data e slot;
  - selezione paziente (se utente osteopata);
  - selezione/creazione acquisto;
- invio richiesta di prenotazione al backend.

## 6.6 Profilo

### `src/screens/ProfileScreen.tsx`

Responsabilita:

- visualizzazione snapshot profilo;
- sincronizzazione dati utente (`auth/me`);
- utilita (pulizia cache app);
- link recensione Google studio (se disponibile);
- logout.

Alcune funzioni risultano volutamente placeholder/non attive.

---

## 7. Flussi end-to-end dettagliati

## 7.1 Flusso autenticazione

1. Utente inserisce credenziali in `LoginScreen`.
2. Chiamata `signIn` da `AuthContext`.
3. `POST /auth/login` ottiene token/sessione.
4. Persistenza in AsyncStorage di token + profilo base.
5. Chiamata `GET /auth/me` per profilo aggiornato.
6. Root navigator passa a `Main` tab app.

### Restore sessione all'avvio

- bootstrap legge storage locale;
- tenta validazione/refresh sessione;
- in caso di errore non-401, mantiene sessione cache per resilienza offline;
- in caso di 401, forza invalidazione e ritorno a login.

File chiave:

- `src/context/AuthContext.tsx`
- `src/services/authApi.ts`
- `src/services/authTokenStorage.ts`

## 7.2 Flusso corsi e contenuti video

1. `CoursesScreen` richiede corsi accessibili (`/formazione/corsi/accessibili`).
2. Utente apre corso.
3. `CourseVideosScreen` carica moduli (`/formazione/corsi/{id}/moduli`) e lezioni (`/formazione/moduli/{id}/lezioni`).
4. Utility compongono struttura didattica coerente.
5. Se durata video non disponibile e URL HLS, viene stimata leggendo il manifest.
6. Utente apre player per fruizione.

File chiave:

- `src/hooks/useFormazioneCourses.ts`
- `src/services/formazioneService.ts`
- `src/utils/hlsDuration.ts`
- `src/screens/VideoPlayerScreen.tsx`

## 7.3 Flusso visite

### Gestione visite

- Paziente: fetch proprie visite (`/visite/by-paziente/{id}`).
- Osteopata: fetch agenda giornaliera filtrata (`/visite` con data/osteopata).

### Nuova prenotazione

1. Fetch studi (`/studi`).
2. Fetch osteopati per studio (`/osteopati/studio/{id}`).
3. Fetch disponibilita (`/osteopati/disponibilita-effettive`).
4. Selezione slot.
5. Se role osteopata:
   - ricerca paziente (`/pazienti/search/advanced`);
   - selezione acquisto prenotabile (`/acquisti/paziente/{id}`);
   - eventuale creazione acquisto (`POST /acquisti`).
6. Creazione visita (`POST /visite`).

File chiave:

- `src/services/visiteService.ts`
- `src/services/pazientiService.ts`
- `src/services/acquistiService.ts`
- `src/services/serviziService.ts`
- `src/screens/visite/BookVisitScreen.tsx`

## 7.4 Flusso fitness

1. Caricamento calendario sessioni (`/fitness/calendario-sessioni`).
2. Caricamento prenotazioni utente (`/fitness/partecipanti-sessioni`).
3. Prenotazione nuova sessione (`POST /fitness/partecipanti-sessioni`).
4. Eventuale annullamento (`DELETE /fitness/partecipanti-sessioni/{id}`).

File chiave:

- `src/services/fitnessService.ts`
- `src/screens/fitness/FitnessSessionsCalendarScreen.tsx`
- `src/screens/fitness/FitnessBookingsScreen.tsx`

---

## 8. Contratti API e integrazione backend

## 8.1 Pattern generale risposta backend

I servizi frontend tengono conto di envelope API del tipo:

- `success`
- `message`
- `error`
- `data` (payload)

Le funzioni di servizio normalizzano shape eterogenee in modelli frontend stabili, riducendo coupling tra UI e DTO backend.

## 8.2 Domini API principali usati dal frontend

- `auth/*`
- `formazione/*`
- `visite/*`
- `fitness/*`
- `studi/*`
- `osteopati/*`
- `pazienti/*`
- `acquisti/*`
- `servizi/*`

## 8.3 Strategia token e refresh

- token bearer in header `Authorization`;
- refresh flow automatico su 401 con endpoint `/auth/refresh`;
- ripetizione request originale dopo rinnovo token.

Meccanismo centralizzato in:

- `src/api/index.ts`

---

## 9. Integrazioni esterne

## 9.1 YouTube Data API

Supporti presenti:

- fetch video playlist e metadati;
- gestione contenuti non in elenco in base a configurazione;
- token management via API key/OAuth a seconda setup.

File:

- `src/services/youtubeService.ts`
- `src/hooks/useYouTubeAuth.ts`

## 9.2 Firebase Functions

In alcuni scenari viene usata come proxy/serverless bridge per:

- ottenimento token YouTube;
- recupero playlist e dettagli media.

File:

- `src/services/firebaseService.ts`

## 9.3 Cloudflare Stream

Presente integrazione per recupero contenuti video e mapping a entita corso/modulo/video.

File:

- `src/services/cloudflareService.ts`

## 9.4 Storage locale

Uso principale di AsyncStorage per:

- token auth;
- profilo utente;
- preferenze login;
- eventuali token/flag di integrazioni media.

File:

- `src/services/authTokenStorage.ts`

---

## 10. Configurazioni runtime, native e deploy

## 10.1 Config app Expo

`app.json` definisce:

- nome/slug;
- bundle/application identifiers;
- scheme deep link (`mobilitas-academy`);
- plugin (`expo-av`);
- orientamenti e permessi iOS.

## 10.2 EAS build pipeline

`eas.json` include profili:

- development
- preview
- production

con variabili ambiente e impostazioni submit.

## 10.3 Variabili ambiente

`.env.example` documenta variabili necessarie e segnala esplicitamente che:

- le variabili `EXPO_PUBLIC_*` sono pubbliche nel bundle client;
- non vanno usate per segreti sensibili.

## 10.4 Android

Configurazioni salienti:

- deep link scheme in manifest;
- permessi rete/audio/storage;
- settaggi package/namespace nel gradle app.

File:

- `android/app/src/main/AndroidManifest.xml`
- `android/app/build.gradle`

## 10.5 iOS

`ios/Mobilitas/Info.plist` include:

- URL schemes;
- orientamenti supportati;
- permessi microfono;
- ATS locale e flag encryption declaration.

---

## 11. UX tecnica: loading, errori, resilienza

## 11.1 Loading e feedback

Le schermate data-driven adottano:

- indicatori di caricamento espliciti;
- pull-to-refresh dove appropriato;
- messaggi di stato per assenza dati.

## 11.2 Error handling

Approccio tipico:

- try/catch nei servizi;
- mapping errori HTTP/axios in messaggi usabili in UI;
- fallback funzionali in caso di shape payload inattese.

Globalmente:

- `ErrorBoundary` protegge da crash React non gestiti.

## 11.3 Edge case gestiti

- restore sessione offline permissivo;
- date picker con logica differenziata iOS/Android;
- normalizzazioni per backend non sempre uniforme.

---

## 12. Sicurezza lato client: stato attuale

## 12.1 Punti positivi

- consapevolezza esplicita sul rischio `EXPO_PUBLIC_*` nei file di setup/documentazione;
- uso token bearer standard e refresh centralizzato.

## 12.2 Rischi rilevati

- alcune integrazioni mostrano supporto a secret in variabili pubbliche lato client (rischio elevato);
- presenza di riferimenti/documentazione con chiavi API reali di esempio puo causare leakage;
- logging dettagliato in servizi sensibili potrebbe esporre metadati in ambienti non controllati.

## 12.3 Raccomandazioni prioritarie

1. Spostare completamente token/secret su backend trusted.
2. Usare proxy server-side per provider terzi (YouTube/Cloudflare).
3. Ruotare chiavi eventualmente gia esposte.
4. Ridurre log sensibili in release build.

---

## 13. Qualita, test e tooling

## 13.1 Stato attuale

- TypeScript strict presente;
- non emerge una suite test automatizzata (unit/integration/e2e) attiva;
- assenza di script lint/format standard in `package.json`.

## 13.2 Impatto pratico

- alta dipendenza da QA manuale;
- rischio regressioni maggiore su refactor cross-feature;
- difficolta a garantire stabilita in release frequenti.

## 13.3 Priorita miglioramento

1. introdurre linting e formatting automatizzati;
2. aggiungere test unitari su servizi e parser DTO;
3. aggiungere smoke test su flussi core (login, prenotazioni, corsi).

---

## 14. Debito tecnico e incongruenze osservabili

- possibile disallineamento tra identificativi app in config Expo e progetto Android nativo;
- presenza di file/artefatti non centrali o legacy (esempi test/manuali);
- feature profilo parzialmente placeholder;
- permessi Android potenzialmente piu ampi del necessario.

Questi elementi non bloccano il funzionamento base, ma incidono su robustezza, sicurezza e manutenibilita a medio termine.

---

## 15. Glossario dominio

- **Visita**: appuntamento clinico paziente-osteopata.
- **Studio**: sede fisica in cui opera l'osteopata.
- **Osteopata**: professionista sanitario coinvolto in agenda/prenotazioni.
- **Paziente**: utente destinatario della visita.
- **Acquisto**: pacchetto/servizio associato al paziente, usabile per prenotazioni.
- **Servizio**: definizione commerciale/clinica di una prestazione.
- **Disponibilita/Slot**: finestre temporali prenotabili.
- **Corso/Modulo/Lezione**: gerarchia contenuti didattici.
- **Sessione fitness**: evento sportivo prenotabile a calendario.

---

## 16. Mappa file chiave (indice rapido)

- Bootstrap e app shell:
  - `index.ts`
  - `App.tsx`
- Contesto auth:
  - `src/context/AuthContext.tsx`
  - `src/services/authApi.ts`
  - `src/services/authTokenStorage.ts`
- Networking/API:
  - `src/api/index.ts`
- Formazione:
  - `src/screens/CoursesScreen.tsx`
  - `src/screens/CourseVideosScreen.tsx`
  - `src/screens/VideoPlayerScreen.tsx`
  - `src/services/formazioneService.ts`
- Visite:
  - `src/screens/visite/VisiteMenuScreen.tsx`
  - `src/screens/visite/GestioneVisiteScreen.tsx`
  - `src/screens/visite/BookVisitScreen.tsx`
  - `src/services/visiteService.ts`
- Fitness:
  - `src/screens/FitnessScreen.tsx`
  - `src/screens/fitness/FitnessSessionsCalendarScreen.tsx`
  - `src/screens/fitness/FitnessBookingsScreen.tsx`
  - `src/services/fitnessService.ts`
- Profilo:
  - `src/screens/ProfileScreen.tsx`
- Integr. esterne:
  - `src/services/youtubeService.ts`
  - `src/services/firebaseService.ts`
  - `src/services/cloudflareService.ts`
- Config/build:
  - `app.json`
  - `eas.json`
  - `.env.example`
  - `android/app/src/main/AndroidManifest.xml`
  - `ios/Mobilitas/Info.plist`

---

## 17. Piano evolutivo consigliato (90 giorni)

## 17.1 Fase 1 (settimane 1-3) - sicurezza e baseline qualita

- migrazione secret fuori dal client;
- hardening logging e gestione errori;
- introduzione lint + typecheck in CI.

## 17.2 Fase 2 (settimane 4-8) - affidabilita funzionale

- test unitari su servizi critici (auth, visite, fitness, formazione);
- test smoke dei percorsi principali;
- allineamento config Expo/Android/iOS.

## 17.3 Fase 3 (settimane 9-12) - UX e performance

- ottimizzazione fetch/caching video e liste lunghe;
- rifinitura stati vuoti/errori con UX consistente;
- completamento aree profilo placeholder.

---

## 18. Conclusione

L'app Mobilitas Academy presenta una base solida e gia funzionale su domini chiave (autenticazione, formazione video, visite, fitness), con una struttura frontend abbastanza chiara e modulare. Le principali priorita strategiche non sono tanto nella feature coverage, quanto nel consolidamento di:

- sicurezza delle integrazioni terze;
- automazione qualita (test/lint/CI);
- coerenza di configurazione multi-piattaforma.

Intervenendo su questi tre assi, il progetto puo passare rapidamente da una buona base operativa a una piattaforma robusta, scalabile e pronta per cicli di rilascio piu rapidi e affidabili.
