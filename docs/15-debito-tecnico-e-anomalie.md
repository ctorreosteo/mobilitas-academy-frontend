# 15 — Debito tecnico e anomalie

Inventario completo di codice morto, funzionalità incomplete, rischi di sicurezza e incongruenze
rilevati nel codice. Ogni voce riporta il file e, dove utile, la riga.

Questo documento non è una lista di lamentele: è la mappa di cosa si può rimuovere, cosa si deve
sistemare e in quale ordine.

---

## 15.1 Sintesi quantitativa

| Categoria | Entità |
|---|---|
| Righe totali in `src/` | 17.164 su 74 file |
| Codice non raggiungibile in `src/` | 4.111 righe (**24%**) |
| Credenziali potenzialmente esposte nel bundle | 5 variabili |
| Funzionalità con UI presente ma logica assente | 8 |
| File di documentazione legacy nella root | 8 |

---

## 15.2 Rischi di sicurezza

### R1 — Token API Cloudflare in variabile pubblica (alto)

`EXPO_PUBLIC_CLOUDFLARE_STREAM_TOKEN` è un token di gestione dell'account Cloudflare Stream.
Tutte le variabili `EXPO_PUBLIC_*` vengono **inlineate nel bundle JavaScript** in fase di build, quindi
sono estraibili da qualunque APK o IPA distribuito.

- Usato solo da `src/services/cloudflareService.ts`, che **non è importato da alcun file**.
- Il file logga anche i primi 10 caratteri del token in console (`cloudflareService.ts:41`).

**Azione**: eliminare `cloudflareService.ts`, rimuovere la variabile da `.env`, `.env.example` e
`eas.json`, e **ruotare il token su Cloudflare** se è mai stato incluso in una build distribuita.

### R2 — Client secret e refresh token Google in variabili pubbliche (alto)

`EXPO_PUBLIC_GOOGLE_CLIENT_SECRET` e `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN` sono letti da
`src/services/youtubeTokenService.ts` (righe 21-23) e usati per uno scambio diretto su
`https://oauth2.googleapis.com/token`. Un client secret più un refresh token a lunga vita, estraibili
dal bundle, sono credenziali di valore reale.

I commenti nel file le etichettano come "modalità sviluppo", ma **il codice compilato è identico in
produzione**.

Il file logga i primi 20 caratteri di Client ID e refresh token (righe 105-107).

**Azione**: eliminare `youtubeTokenService.ts`, rimuovere le variabili, **revocare le credenziali su
Google Cloud Console**.

### R3 — API key YouTube nel bundle (medio)

`EXPO_PUBLIC_YOUTUBE_API_KEY` viene passata come parametro `key` nelle richieste a
`googleapis.com/youtube/v3` da `youtubeService.ts`. Rischio contenuto se la chiave ha restrizioni di
API e di quota; altrimenti sfruttabile da terzi a spese del progetto.

**Azione**: rimuovere insieme a `youtubeService.ts`.

### R4 — JWT in `AsyncStorage` non cifrato (medio)

`@mobilitas_jwt` è salvato in chiaro. `AsyncStorage` non è cifrato: su dispositivi con root/jailbreak,
o tramite backup non cifrati, il token è leggibile. Lo stesso vale per
`@mobilitas_user_profile`, che contiene dati personali del paziente (nome, cognome, email, telefono,
codice fiscale, data di nascita) — dati sensibili sotto GDPR.

**Azione**: migrare a `expo-secure-store` (Keychain su iOS, Keystore su Android) almeno per il token.

### R5 — Nessun crash reporting (medio)

`ErrorBoundary` logga solo in console. In produzione i crash sono **completamente invisibili**: non c'è
modo di sapere se e quanto l'app si rompe per gli utenti reali.

**Azione**: integrare Sentry o Firebase Crashlytics.

### R6 — Log in produzione non condizionati (basso)

Le chiamate a `console.log` / `warn` / `error` non sono racchiuse in `if (__DEV__)`. Oltre al costo
marginale, alcune stampano frammenti di credenziali (vedi R1, R2).

**Azione**: rimuovere i log di credenziali, condizionare il resto.

---

## 15.3 Codice non raggiungibile

### Il modulo Fitness — 1.915 righe

| File | Righe |
|---|---|
| `src/screens/fitness/FitnessSessionsCalendarScreen.tsx` | 713 |
| `src/screens/fitness/FitnessBookingsScreen.tsx` | 548 |
| `src/screens/FitnessScreen.tsx` | 323 |
| `src/services/fitnessService.ts` | 183 |
| `src/services/fitnessCatalogPrefetch.ts` | 94 |
| `src/screens/fitness/FitnessStack.tsx` | 49 |
| `src/screens/fitness/types.ts` | 5 |

Modulo completo e funzionante, **non montato nella tab bar**: `App.tsx` monta `SessioniStack` al suo
posto. Duplica quasi integralmente la logica del modulo Sessioni posturali. Vedi
[08](./08-modulo-sessioni-e-fitness.md).

**Decisione da prendere**: se il fitness non tornerà, rimuoverlo. Se tornerà, unificare i due moduli in
uno parametrizzato per tipologia, come già fatto per i due cataloghi corsi con `CorsiCatalogView`.

### L'integrazione YouTube / Firebase / OAuth — 1.535 righe

| File | Righe | Importato da |
|---|---|---|
| `src/services/youtubeService.ts` | 450 | solo i due hook orfani |
| `src/services/cloudflareService.ts` | 288 | nessuno |
| `src/services/firebaseService.ts` | 229 | `youtubeService`, `youtubeTokenService` |
| `src/hooks/useYouTubeAuth.ts` | 179 | nessuno |
| `src/services/youtubeTokenService.ts` | 165 | `youtubeService` |
| `src/hooks/useYouTubeChannelPlaylists.ts` | 135 | nessuno |
| `src/hooks/useYouTubePlaylist.ts` | 89 | nessuno |

Nessuna schermata monta questi hook: l'intera catena è orfana. Vedi
[12](./12-integrazioni-esterne.md).

### Componenti e utility non usati — 661 righe

| File | Righe | Nota |
|---|---|---|
| `src/components/SplashScreen.tsx` | 529 | Splash animata elaborata, mai renderizzata |
| `src/components/Button.tsx` | 55 | L'unico componente pulsante, non importato da nessuno |
| `src/utils/themeUtils.ts` | 40 | Helper del theme, non importati; contiene un parametro non usato |
| `src/hooks/useApi.ts` | 37 | Scaffolding "di esempio", chiama `/courses` (endpoint inesistente) |

### File nella root

| File | Stato |
|---|---|
| `AppTest.tsx` | 77 righe: tre schermate placeholder con testo `'Home Screen'`, `'Courses Screen'`, `'Profile Screen'`. Non referenziato da `index.ts` |
| `scripts/fill-video-durations.js` | Script deprecato: stampa un messaggio ed esce |
| `get_refresh_token.py` | Script Python per ottenere un refresh token YouTube |
| `YOUTUBE_SETUP.md`, `README_YOUTUBE.md`, `OAUTH_SETUP.md`, `REFRESH_TOKEN_SETUP.md`, `TEST_FIREBASE_PROD.md` | Documentazione dell'integrazione YouTube dismessa |
| `DOCUMENTAZIONE_COMPLETA_APP.md` | Documentazione precedente, parzialmente obsoleta (descrive Fitness come attivo) |
| `fonts/README.md` | Istruzioni per installare Montserrat, mai eseguite |

### Dipendenze npm non utilizzate

| Pacchetto | Versione | Nota |
|---|---|---|
| `react-native-youtube-iframe` | `^2.4.1` | Nessun import in `src/` |
| `react-native-webview` | `13.15.0` | Nessun import diretto; è peer dependency di youtube-iframe |
| `expo-auth-session` | `~7.0.8` | Usato solo da `useYouTubeAuth` (orfano) |
| `expo-linear-gradient` | `~15.0.7` | Usato solo da `SplashScreen.tsx` (orfano) |

Rimuovendole si riduce la dimensione del bundle e la superficie di aggiornamento.

### Tipi non utilizzati

`src/types/index.ts` contiene tipi mai referenziati. Elenco in [05](./05-modello-dati.md).

---

## 15.4 Funzionalità con interfaccia presente e logica assente

Sono i punti in cui l'utente vede qualcosa che promette un comportamento inesistente. Il debito più
dannoso, perché visibile.

### F1 — Tracciamento del progresso dei corsi (alto)

L'interfaccia è completa; la logica non esiste in nessun punto.

| Elemento UI | Valore reale |
|---|---|
| Barra progresso in `CourseCard` | sempre 0% |
| `'Progresso Corso'` in `CourseVideosScreen` | sempre 0% |
| `'0 di N video completati'` | sempre 0 |
| Statistiche `'Completati'` e `'Media'` | sempre 0 e 0% |
| Contatore `'N video • 0/N completati'` in `ChapterSection` | sempre 0 |
| Pulsante `'Segna come completato'` | **nessun `onPress`** (`VideoPlayerScreen.tsx:348-356`) |
| Etichetta `'Rivedi'` vs `'Continua'` | sempre `'Continua'` |

`courseContent.ts` imposta `isCompleted: false` in modo hardcoded; i mapper impostano
`completionPercentage: 0`. Nessun endpoint di progresso esiste.

Peggiora la situazione il fatto che i testi promettano esplicitamente la funzione: il sottotitolo dei
corsi posturali dice *"con progresso e ripresa rapida"* e le card della home dicono *"Riprendi la
formazione"*.

### F2 — Statistiche del profilo inventate (alto)

```117:120:src/screens/ProfileScreen.tsx
  const stats = [
    { key: 'completed', value: '2', label: 'Corsi completati', icon: 'checkmark-done-circle-outline' as const },
    { key: 'ongoing', value: '6', label: 'In corso', icon: 'play-circle-outline' as const },
    { key: 'progress', value: '53%', label: 'Progresso', icon: 'trending-up-outline' as const },
  ];
```

Stringhe letterali: ogni utente vede "2 corsi completati" e "53% di progresso". **Dato falso mostrato
in produzione.** Va rimosso subito, indipendentemente da F1.

### F3 — Sei voci di menu non funzionanti (medio)

In `ProfileScreen`: `'Modifica Profilo'`, `'Notifiche'`, `'Privacy'`, `'Aiuto e Supporto'`,
`'Cambia Password'`, `'Esporta Dati'`. Tutte aprono la modale *"non disponibile"*, e tutte hanno il
chevron identico alle voci funzionanti: nulla le distingue prima del tap.

Nota: `'Privacy'` ed `'Esporta Dati'` sono voci con implicazioni GDPR (informativa e diritto di
portabilità). Averle presenti ma inattive è peggio che non averle.

### F4 — Fullscreen custom del player non collegato (medio)

`enterFullscreen` (`VideoPlayerScreen.tsx:106-121`) non ha alcun riferimento `onPress` nel file:
`exitFullscreen` compare come `onRequestClose` del modal e sul pulsante di chiusura, ma non esiste un
modo di **entrare** in fullscreen custom. Il modal, i suoi controlli e la gestione dell'orientamento
sono quindi codice non raggiungibile. In pratica l'utente usa il fullscreen dei controlli nativi di
`expo-av`, che non passa da queste funzioni e non blocca l'orientamento.

### F5 — Registrazione e reset password (informativa)

Entrambe rimandano al contatto umano: la registrazione tramite modale, il reset via `Alert`. È una
scelta deliberata (gli account nascono nel gestionale), non un difetto — ma va documentata come tale.

### F6 — Campi mappati e mai mostrati (basso)

`Course.instructor` (sempre `'Mobilitas'`), `Course.category`, `Course.difficulty` (sempre
`'Principiante'`) vengono calcolati dai mapper, passati come props a `CourseCard` e non renderizzati.

### F7 — `Video.richiedeToken` ignorato (basso)

Il player non legge il campo: un video che richiede URL firmato riceverebbe un `403` da Cloudflare e
mostrerebbe solo il pulsante play ripristinato dall'`onError`, senza spiegazione.

### F8 — `Course.ruoloRichiestoTipo` / `ruoloRichiestoId` ignorati (basso)

Il solo controllo lato client è `isLocked={item.formazioneAttivo === false}`. Il filtro per ruolo è
interamente lato backend — corretto come architettura, ma i campi trasportati e non usati confondono
chi legge il codice.

---

## 15.5 Incongruenze e imprecisioni

### Testi

| Problema | Dove |
|---|---|
| `"non iesco"` invece di `"non riesco"` | messaggio WhatsApp in `SessioniHomeScreen` |
| `'Al momento questa funzionalita non e attiva in app.'` — accenti mancanti | `ProfileScreen.tsx:740-741` |
| Link etichettato `'Termini d'uso'` che punta alla privacy policy | `LoginScreen.tsx:191` |
| Testo `"token YouTube locale"` mostrato all'utente | `ProfileScreen.tsx:596` |
| `'Controlla la console per i dettagli'` mostrato all'utente | `App.tsx` (ErrorBoundary) |
| `"con progresso e ripresa rapida"` — funzione inesistente | `CorsiPosturaliScreen.tsx` |
| `"Riprendi la formazione"` — nessuna ripresa | `HomeScreen.tsx:70-71` |
| Fallback nome `'Professionista'` mostrato anche ai pazienti | `HomeScreen.tsx:18` |
| "Novità operative" con voci solo-operatore mostrate ai pazienti | `HomeScreen.tsx:88-118` |

### Naming e identità

| Problema | Dove |
|---|---|
| Nome pacchetto `studio-osteopatico-frontend` vs brand "Mobilitas Academy" | `package.json:2` |
| Terminologia mista italiano/inglese nel modello dati (`Corso`/`Course`, `Lezione`/`Video`) | `src/types`, mapper |
| `Course.duration` in **minuti**, `Video.duration` in **secondi** | modello dati |
| Convenzioni di query key non uniformi | vedi [13](./13-stato-cache-e-storage.md) |
| Cast `as never` sulle chiamate di navigazione | `HomeScreen.tsx:51`, `62`, `77` |

### Colori e stili

| Problema | Dove |
|---|---|
| `#07284A` vs `#07294A`: differiscono di una cifra, probabile typo | `CorsiCatalogView` vs `App.tsx` |
| `#001831` e `#D7FFE2` scritti a mano pur esistendo come token | `CorsiCatalogView` |
| `#25D366` duplicato in due file | `StudioWhatsAppSupportButton`, `GestioneVisiteScreen` |
| Quattro verdi chiari percettivamente identici | modulo Corsi |
| Divider decorativo con tre implementazioni diverse | Login, Home/Corsi, Profilo |
| `activeOpacity` variabile senza criterio (0.7 / 0.75 / 0.8 / 0.85) | tutta l'app |
| Addendo `paddingBottom` variabile (24 / 28 / 32 / 36) | tutte le liste |

### Tipografia

`fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary` è ripetuto **139 volte** in 15
file, e non produce alcun effetto: Montserrat non è installato (nessun `.ttf`, `expo-font` assente dalle
dipendenze). Su Android il sistema ricade su Roboto silenziosamente. Alcune schermate non impostano
`fontFamily` affatto. Vedi [11](./11-design-system-e-ui.md).

### Codice

| Problema | Dove |
|---|---|
| `setDisplayCourse(course)` chiamato due volte di fila | `CourseVideosScreen.tsx:42-43` |
| Filtro dei video ridondante (già fatto dal parent) | `ChapterSection.tsx` |
| `queryClient.clear()` seguito da `invalidateQueries()` — superfluo | `appCacheService.ts` |
| `hasRefreshToken()` restituisce sempre `true` (`USE_BACKEND = !USE_FIREBASE`) | `youtubeTokenService.ts:163` |
| `getFontFamily(weight)` ignora il parametro; `Platform.select` interno irraggiungibile | `themeUtils.ts:14-23` |
| `logout` dichiarato `() => void` ma implementato `async` | `useYouTubeAuth.ts` |
| `ProfileScreen` non aggiorna `AuthContext` dopo il refresh del profilo | `ProfileScreen.tsx:70-82` |
| `clearSessioniPosturaliCatalogCache` non chiamata da `cleanAndRefreshCaches` | `appCacheService.ts` |
| Refresh token su 401 replicato a mano fuori dagli interceptor | `pagamentiService.ts:198-206` |
| `expo-file-system/legacy` invece della nuova API SDK 54 | `pagamentiService.ts:1` |
| Commento su "pittogramma in basso" per un pittogramma rimosso | `LoginScreen.tsx:246` |
| Le tre statistiche di `ProfileScreen` sono `as const` ma valori finti | `ProfileScreen.tsx:117-120` |

### Configurazione di React Query

| Problema | Impatto |
|---|---|
| `new QueryClient()` senza `defaultOptions` | `retry: 3` anche sui `4xx`: attesa inutile prima di mostrare un `403` |
| `staleTime` assente in 7 query su 16 | Refetch ad ogni mount di dati che cambiano raramente |
| NetInfo assente | `refetchOnReconnect` inefficace; impossibile distinguere offline da errore server |
| Nessuna persistenza della cache | Avvio a freddo sempre da zero |
| Query key duplicate per lo stesso dato | `visite-studi` / `profile-review-studi` e coppia osteopata |

### Accessibilità

Solo due elementi in tutta l'app dichiarano attributi di accessibilità (la checkbox del login e il
pulsante WhatsApp). Mancano `accessibilityLabel` sui controlli con sola icona, annunci sugli stati di
caricamento, supporto per `fontScale`, e il contrasto delle label inattive della tab bar è sotto la
soglia WCAG AA. Dettagli in [11 §11.8](./11-design-system-e-ui.md).

---

## 15.6 Architettura: complessità concentrata

| File | Righe | Problema |
|---|---|---|
| `BookVisitScreen.tsx` | 1.446 | Due flussi completi (operatore e paziente) in un unico componente, con oltre 20 variabili di stato e 8 query |
| `ProfileScreen.tsx` | 1.238 | Sei modali inline, 13 variabili di stato, foglio di stili molto esteso |
| `GestioneVisiteScreen.tsx` | 886 | Agenda operatore e storico paziente nello stesso componente |
| `SessioniCalendarioScreen.tsx` | 740 | Calcolo del calendario, prenotazione e rendering insieme |

Il pattern ricorrente è **un componente che serve due utenti diversi** tramite rami condizionali.
Funziona, ma rende ogni modifica rischiosa: cambiare il flusso operatore richiede di verificare di non
aver rotto quello paziente.

Il modulo Corsi mostra la soluzione già adottata con successo nello stesso repository:
`CorsiCatalogView` è una vista parametrizzata da un oggetto `COPY`, con due wrapper di 35 righe
ciascuno. Lo stesso approccio si applica bene a `BookVisitScreen` e `GestioneVisiteScreen`.

### Duplicazione della modale di conferma

Il pattern `Modal` + `modalBackdrop` + `modalCard` + azioni è riscritto **più di dieci volte** con la
stessa anatomia. Un componente `ConfirmModal` eliminerebbe diverse centinaia di righe.

### Due paradigmi di data fetching

Il modulo Visite e i cataloghi corsi usano React Query; i moduli Sessioni, Fitness e il dettaglio
corso usano `useState` + `useEffect`. Il secondo gruppo ha dovuto reimplementare a mano
deduplicazione (`inflight`), cache (i file `*CatalogPrefetch.ts`) e gestione del refresh — cose che
React Query fornisce già.

---

## 15.7 Cosa manca del tutto

| Assenza | Impatto |
|---|---|
| Test automatici | Nessun file di test, nessuna configurazione Jest. Ogni modifica va verificata a mano |
| Crash reporting | I crash in produzione sono invisibili |
| Notifiche push | La voce di menu esiste ma non c'è `expo-notifications` |
| Supporto offline | Nessuna persistenza della cache, nessun rilevamento di connettività |
| Internazionalizzazione | Stringhe hardcoded: aggiungere una lingua richiederebbe di toccare ogni file |
| Analytics | Nessun tracciamento di utilizzo |
| Deep linking funzionale | Lo schema `mobilitas-academy` è dichiarato ma non gestito da alcuna route |
| Linting/formatting configurato | Nessun `.eslintrc`, nessun `.prettierrc` |
| CI | Nessun workflow di build o verifica |

---

## 15.8 Piano di intervento consigliato

### Fase 1 — Sicurezza e dati falsi (immediata)

1. Ruotare il token Cloudflare e revocare le credenziali Google (R1, R2).
2. Rimuovere le variabili `EXPO_PUBLIC_*` sensibili da `.env`, `.env.example`, `eas.json`.
3. Eliminare `cloudflareService.ts`, `youtubeTokenService.ts` e i `console.log` di credenziali.
4. Rimuovere le statistiche finte da `ProfileScreen` (F2).
5. Rendere presentabile l'`ErrorBoundary` e integrare crash reporting (R5).

### Fase 2 — Pulizia (bassa rischiosità, alto beneficio di leggibilità)

6. Decidere il destino del modulo Fitness: rimuoverlo o unificarlo con Sessioni.
7. Eliminare `youtubeService.ts`, `firebaseService.ts`, i tre hook YouTube, `useApi.ts`,
   `themeUtils.ts`, `AppTest.tsx`, `scripts/fill-video-durations.js`, `get_refresh_token.py` e i
   cinque `.md` legacy sulla configurazione YouTube.
8. Rimuovere le dipendenze npm non usate.
9. Decidere su `components/Button.tsx` (adottarlo o rimuoverlo) e su `components/SplashScreen.tsx`
   (collegarlo al gate di `App.tsx` o rimuoverlo).
10. Risolvere la tipografia: installare Montserrat con `expo-font` oppure rimuovere le 139
    dichiarazioni `fontFamily`.

### Fase 3 — Coerenza (rischio medio)

11. Estrarre `ConfirmModal` e sostituire le oltre dieci implementazioni.
12. Migrare i moduli Sessioni e il dettaglio corso a React Query, eliminando le cache in-memory
    scritte a mano.
13. Configurare `defaultOptions` sul `QueryClient` (`retry` selettivo, `staleTime` di base).
14. Integrare NetInfo con `onlineManager` e `focusManager`.
15. Consolidare i colori hardcoded nel theme e uniformare divider, `activeOpacity` e `paddingBottom`.
16. Tipizzare la navigazione ed eliminare i cast `as never`.
17. Correggere i testi elencati in §15.5.

### Fase 4 — Funzionalità (richiede lavoro backend)

18. Implementare il tracciamento del progresso: endpoint, servizio, mutation, collegamento
    dell'`onPress` (F1).
19. Popolare `durataSecondi` lato backend, eliminando il parsing HLS lato client.
20. Implementare o rimuovere le sei voci di menu del profilo (F3), con priorità a `'Privacy'` ed
    `'Esporta Dati'` per gli obblighi GDPR.
21. Collegare o rimuovere il fullscreen custom del player (F4).
22. Migrare il JWT su `expo-secure-store` (R4).
23. Concordare codici di errore stabili con il backend, sostituendo i match su stringhe italiane.

### Fase 5 — Infrastruttura

24. Configurare ESLint e Prettier.
25. Introdurre test almeno sulla logica pura (`visiteFormatting`, `apiErrorMessage`, `hlsDuration`,
    i mapper): sono funzioni senza dipendenze, facili da coprire e ad alto valore.
26. Impostare una CI che esegua type-check, lint e test.
