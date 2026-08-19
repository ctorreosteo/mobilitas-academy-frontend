# 09 — Modulo Corsi e player video

Il modulo di formazione video: due cataloghi alternativi in base al ruolo, gerarchia
corso → modulo → lezione, riproduzione HLS da Cloudflare Stream.

| File | Righe | Ruolo |
|---|---|---|
| `src/screens/corsi/CorsiStack.tsx` | 67 | Stack con montaggio condizionale per ruolo |
| `src/screens/corsi/types.ts` | 12 | `CorsiStackParamList` |
| `src/screens/corsi/CorsiCatalogView.tsx` | 432 | Vista catalogo condivisa e parametrizzabile |
| `src/screens/corsi/CorsiAziendaliScreen.tsx` | 35 | Wrapper: `COPY` + `useCorsiAziendali` |
| `src/screens/corsi/CorsiPosturaliScreen.tsx` | 35 | Wrapper: `COPY` + `useCorsiPosturali` |
| `src/screens/CourseVideosScreen.tsx` | 433 | Dettaglio corso: moduli e lezioni |
| `src/screens/VideoPlayerScreen.tsx` | 617 | Player |
| `src/components/CourseCard.tsx` | 226 | Card corso |
| `src/components/ChapterSection.tsx` | 122 | Accordion modulo |
| `src/components/VideoItem.tsx` | 95 | Riga lezione |

---

## 9.1 Terminologia: backend vs UI

Il modulo attraversa due vocabolari. È essenziale conoscere la corrispondenza:

| Backend (italiano) | Modello UI (inglese) | Significato |
|---|---|---|
| `Corso` | `Course` | Il corso |
| `Modulo` | `Chapter` | Raggruppamento di lezioni |
| `Lezione` | `Video` | Singola unità video |
| `titolo` | `title` | |
| `ordine` | `order` | |
| `durataSecondi` | `duration` (secondi in `Video`, **minuti** in `Course`) | |
| `immagineCopertina` | `coverImage` / `thumbnail` | |
| `cloudflareUid` | `cloudflareUid` | UID del video su Cloudflare Stream |
| `attivo` | `formazioneAttivo` | Flag di pubblicazione |

La traduzione avviene in `src/utils/mapCorsoToCourse.ts` (per i corsi) e in
`src/services/courseContent.ts` (per moduli e lezioni).

Attenzione all'unità di misura: `Course.duration` è in **minuti**, `Video.duration` in **secondi**.

---

## 9.2 Due cataloghi mutuamente esclusivi

`CorsiStack` monta una sola delle due liste, in base a `hasGestionaleRole`:

| Ruolo | Route montata | Hook | Endpoint |
|---|---|---|---|
| Gestionale | `CorsiAziendaliList` | `useCorsiAziendali` | `GET /api/formazione/corsi/accessibili` |
| Mobile-only | `CorsiPosturaliList` | `useCorsiPosturali` | `GET /api/corsi-posturali` |

Il commento in `src/screens/corsi/types.ts:3-6` spiega l'architettura: due cataloghi con liste
dedicate e non intercambiabili, che condividono il dettaglio corso (`CourseVideos`) e il player
(`VideoPlayer`).

### Gli hook

```typescript
// src/hooks/useCorsiAziendali.ts
useQuery({
  queryKey: ['corsi', 'aziendali'],
  queryFn: fetchCourses,                              // fetchCorsi() → mapCorsoDtoToCourse
  enabled: hasGestionaleRole(userProfile?.ruoli),      // evita il 403
  staleTime: 60_000,
});

// src/hooks/useCorsiPosturali.ts
useQuery({
  queryKey: ['corsi', 'posturali'],
  queryFn: /* fetchCorsiPosturali() → mapCorsoPosturaleDtoToCourse */,
  staleTime: 60_000,
});
```

Nessuno dei due imposta `gcTime`: vale il default di 5 minuti.

Nessuna mutation esiste in tutto il modulo: è interamente in sola lettura.

---

## 9.3 `CorsiCatalogView` — vista condivisa parametrizzata

Il pattern più interessante del modulo: una singola vista riutilizzata dai due cataloghi,
parametrizzata da un oggetto di stringhe.

### Props

```typescript
interface CorsiCatalogViewProps {
  copy: CorsiCatalogCopy;
  courses: Course[];
  isPending: boolean;
  isError: boolean;
  error: unknown;
  isRefetching: boolean;
  onRefresh: () => void;
}
```

`CorsiCatalogCopy` ha 8 campi di testo (vedi [05 §5.13](./05-modello-dati.md)).

### I due oggetti `COPY`

**Corsi aziendali** (`src/screens/corsi/CorsiAziendaliScreen.tsx:5-15`):

| Campo | Valore |
|---|---|
| `headerTitle` | `'Corsi aziendali'` |
| `headerSubtitle` | `'Formazione interna: i corsi abilitati per il tuo ruolo, modulo per modulo.'` |
| `badge` | `'Formazione interna'` |
| `loadingSubtitle` | `'Sto caricando il catalogo dei corsi aziendali…'` |
| `emptyText` | `'Nessun corso aziendale abilitato per il tuo ruolo'` |
| `errorContext` | `'Impossibile caricare i corsi aziendali'` |
| `errorFallback` | `'Non siamo riusciti a caricare l'elenco dei corsi aziendali. Riprova tra poco.'` |
| `supportWhatsAppMessage` | `"Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi aziendali. Potete aiutarmi? Grazie."` |

**Corsi posturali** (`src/screens/corsi/CorsiPosturaliScreen.tsx:5-15`):

| Campo | Valore |
|---|---|
| `headerTitle` | `'Corsi posturali'` |
| `headerSubtitle` | `'Catalogo dei corsi posturali, con progresso e ripresa rapida.'` |
| `badge` | `'Corsi posturali'` |
| `loadingSubtitle` | `'Sto caricando il catalogo corsi posturali…'` |
| `emptyText` | `'Nessun corso posturale disponibile'` |
| `errorContext` | `'Impossibile caricare i corsi posturali'` |
| `errorFallback` | `'Non siamo riusciti a caricare l'elenco dei corsi posturali. Riprova tra poco.'` |
| `supportWhatsAppMessage` | `"Buongiorno, utilizzo l'app Mobilitas Academy e non riesco a caricare l'elenco dei corsi posturali. Potete aiutarmi? Grazie."` |

Il sottotitolo dei corsi posturali promette *"con progresso e ripresa rapida"*, funzionalità che
**non esistono**: `completionPercentage` è sempre `0` e non c'è alcun meccanismo di ripresa della
riproduzione.

### Struttura UI

Nessun `useState`. Solo `useMemo` per `stats` e `listHeader`, e `useCallback` per `errorMessage` e
`renderCourse`.

**Stato di loading iniziale** (`isPending && courses.length === 0`): header con titolo e
`copy.loadingSubtitle`, `ActivityIndicator size="large"` e testo `'Caricamento corsi…'`.

**Header principale**:
- Titolo (`fontSize: 30`, `fontWeight: '800'`, `letterSpacing: 0.3`, con `textShadow`)
- Sottotitolo (`fontSize: 14`, `lineHeight: 20`)
- Badge con icona `book-outline` 14 (`borderRadius: 999`)
- Divider con icona `library-outline` 15 in un cerchio `28×28`

**Card statistiche** (`backgroundColor: '#07284A'`, `borderRadius: 18`, `elevation: 7`):

| Label | Valore |
|---|---|
| `'Totali'` | `courses.length` |
| `'Completati'` | numero di corsi con `isCompleted` |
| `'Media'` | `{avgProgress}%` — media aritmetica arrotondata di `completionPercentage` |

Con i mapper attuali questi valori sono sempre `N`, `0` e `0%`.

Stile: `statNumber` `fontSize: 24`, `fontWeight: '800'`, colore `#D7FFE2`; `statLabel` `fontSize: 12`,
`textTransform: 'uppercase'`, `letterSpacing: 0.8`.

**Section header della lista**:
- `'Elenco corsi'` (`fontSize: 22`, `lineHeight: 28`, `fontWeight: '700'`)
- Badge conteggio (`minWidth: 34`, `height: 28`, testo `fontSize: 13`, `fontWeight: '800'` con
  `transform: [{ translateY: 1 }]` per il centraggio ottico)
- Hint: `'Scorri per vedere e aprire i contenuti'`

**Banner di errore parziale** (`isError && courses.length > 0`): mostra il messaggio e il pulsante
WhatsApp senza nascondere i dati già caricati. È il comportamento corretto: un refetch fallito non
cancella la lista.

**Empty state della `FlatList`**: `isError ? errorMessage(error) : copy.emptyText`, con pulsante
WhatsApp solo in caso di errore.

**`RefreshControl`**: `refreshing={isRefetching}`, `tintColor: theme.colors.secondary`.

`keyExtractor: item.id`, `contentContainerStyle.paddingBottom: 24 + tabBarPad`.

### Controllo di accesso ai corsi

```typescript
<CourseCard
  /* ... */
  isLocked={item.formazioneAttivo === false}
/>
```

**È l'unico controllo di accesso lato client.** Confronto stretto con `false`: `undefined` non blocca.

I campi `ruoloRichiestoTipo` e `ruoloRichiestoId`, presenti sul `Course` per i corsi di formazione,
**non vengono mai letti**. Il filtro per ruolo è interamente lato backend
(`/formazione/corsi/accessibili` restituisce già solo i corsi accessibili). Per i corsi posturali,
il backend risponde `404` per i contenuti non attivi.

---

## 9.4 `CourseCard`

### Props

```typescript
interface CourseCardProps {
  course: Course;
  title: string;
  instructor: string;
  duration: number;              // minuti
  completionPercentage: number;
  isCompleted: boolean;
  coverImage?: string;
  isLocked?: boolean;
}
```

Le props duplicano campi già contenuti in `course`. La prop `instructor` **non viene renderizzata**.

### Navigazione

```typescript
const handleContinue = () => {
  if (isLocked) return;
  navigation.navigate('CourseVideos', { course });
};
```

### UI

| Elemento | Dettagli |
|---|---|
| Copertina | `height: 190`, `backgroundColor: '#06213D'`; `onError` logga `'Errore caricamento immagine:'` + URL |
| Badge lock | `'Bloccato'` se `isLocked` |
| Titolo | colore `#D8FFE3`, `fontSize: 18` |
| Label progresso | `'Progresso'` |
| Percentuale | colore `#CCFFD9` |
| Barra progresso | `height: 6`, `borderRadius: 3`, larghezza `${completionPercentage}%` |
| Durata | `duration > 0 ? '${duration} min' : '—'` → in pratica sempre `'—'` |
| Pulsante | `'Non disponibile'` se locked, `'Rivedi'` se completato, altrimenti `'Continua'` |

Stile card: `backgroundColor: '#0A2B4D'`, `borderRadius: 16`, `marginBottom: 16`, `elevation: 8`.
Se `isLocked`: `opacity: 0.82` e `activeOpacity: 1` (nessun feedback al tap).

Pulsante: `borderRadius: 20`, `paddingHorizontal: 16`, `paddingVertical: 8`, testo `#D3FFE0`.

---

## 9.5 `CourseVideosScreen` — dettaglio corso

Riceve `{ course: Course }` come parametro di route.

### Stato

| Variabile | Tipo | Iniziale |
|---|---|---|
| `displayCourse` | `Course` | `course` (dal parametro) |
| `courseChapters` | `Chapter[]` | `[]` |
| `sourceVideos` | `Video[]` | `[]` |
| `videosWithDuration` | `Video[]` | `[]` |
| `loading` | `boolean` | `true` |
| `loadError` | `string \| null` | `null` |
| `loadingDurations` | `boolean` | `true` |

Non usa React Query: gestione manuale con due `useEffect` in cascata.

### Effect 1 — caricamento contenuti (deps `[course]`)

1. `setLoading(true)`, `setLoadError(null)`, `setDisplayCourse(course)`.
2. `loadCourseContent(course)` (vedi [04 §4.4](./04-api-e-servizi.md)).
3. Successo: aggiorna `displayCourse` se il servizio ha restituito un corso rinfrescato (caso
   posturale), poi `courseChapters`, `sourceVideos` e `videosWithDuration`.
4. Errore: `setLoadError(e instanceof Error ? e.message : 'Errore nel caricamento del corso')` e array
   vuoti.
5. Cleanup con flag `cancelled`.

Nota: `setDisplayCourse(course)` è chiamato **due volte consecutive** (righe 42-43) — innocuo ma
ridondante.

### Effect 2 — risoluzione durate HLS (deps `[sourceVideos]`)

```typescript
// filtra i video con (duration <= 0 || !duration) && url?.includes('.m3u8')
```

- Se nessuno necessita di risoluzione: copia `sourceVideos` in `videosWithDuration` e
  `setLoadingDurations(false)`.
- Altrimenti `Promise.all` di `getCachedDurationFromHls(video.url)` per ciascuno, poi merge delle
  durate per `id`.
- `.catch(() => setLoadingDurations(false))`.

Il costo è di 1-2 richieste HTTP per video senza durata (master playlist + variant). La cache in
`hlsDuration.ts` evita di ripeterle nella stessa sessione.

### UI

**Loading**: `'Caricamento moduli e lezioni…'`

**Header**:
- Titolo: `displayCourse.title` (`fontSize: 28`, `lineHeight: 36`)
- Autore: `'di {displayCourse.instructor}'` → sempre `"di Mobilitas"`
- Descrizione: `displayCourse.description`
- Badge: `'Dettaglio corso'` con `bookmarks-outline` 14
- Divider: `play-circle-outline` 15

**Banner di errore**: `loadError` (`borderRadius: 12`, `padding: 14`)

**Statistiche** (`borderRadius: 16`, `paddingVertical: 20`, `statValue` `fontSize: 24`,
`minHeight: 32`, divisori `width: 1`, `height: 40`, `marginHorizontal: 16`):

| Label | Valore |
|---|---|
| `'Moduli'` | `courseChapters.length` |
| `'Video'` | `videosWithDuration.length` |
| `'Durata'` | `'...'` durante il calcolo, altrimenti `formatTotalDuration(totalDuration)` |

**Progresso**:
- `'Progresso Corso'`
- `{progressPercentage}%`
- `'{completedVideos} di {videosWithDuration.length} video completati'`
- Barra `height: 8`, `borderRadius: 4`

Poiché `isCompleted` è sempre `false`, questa sezione mostra costantemente `0%` e
`"0 di N video completati"`.

**Empty moduli**: `'Nessun modulo disponibile per questo corso.'`

### Formattazione della durata totale

```typescript
function formatTotalDuration(seconds: number): string {
  // seconds <= 0        → '—'
  // ore e minuti        → `${hours}h ${mins}m`
  // solo ore            → `${hours}h`
  // solo minuti         → `${mins}m`
}
```

### Raggruppamento dei video per modulo

```typescript
videosWithDuration
  .filter((v) => v.chapterId === chapter.id)
  .sort((a, b) => a.order - b.order)
```

L'ordine dei moduli deriva da `courseChapters`, già ordinato per `ordine` in `loadCourseContent`.

`paddingBottom: 32 + tabBarPad`.

---

## 9.6 `ChapterSection` — accordion modulo

### Props

```typescript
interface ChapterSectionProps {
  chapter: Chapter;
  videos: Video[];
  onVideoPress: (video: Video) => void;
}
```

### Stato

`isExpanded: boolean`, iniziale `false`. **Tutti i moduli partono chiusi**: aprendo un corso non si
vede alcuna lezione fino al primo tap.

### UI

- Cerchio numerato `36×36` (`borderRadius: 18`) con `chapter.order`, testo `fontSize: 14`,
  `fontWeight: '700'`
- Titolo: `chapter.title` (`fontSize: 16`)
- Info: `'{chapterVideos.length} video • {completedCount}/{chapterVideos.length} completati'`
  (`fontSize: 13`, `opacity: 0.6`)
- Chevron: `chevron-up` se espanso, `chevron-down` altrimenti (size 20, `opacity: 0.5`)
- Header: `paddingVertical: 16`, `paddingHorizontal: 20`, `borderRadius: 12`
- Container video: `marginTop: 12`, `paddingHorizontal: 20`

Il componente ri-filtra e riordina i video (`videos.filter(v => v.chapterId === chapter.id).sort(...)`)
anche se il parent lo ha già fatto: filtro ridondante ma senza impatto pratico.

`completedCount` è sempre `0`, quindi l'info line mostra `"N video • 0/N completati"`.

---

## 9.7 `VideoItem` — riga lezione

```typescript
interface VideoItemProps {
  video: Video;
  onPress: () => void;
}
```

UI:
- Icona: `checkmark-circle` se `isCompleted`, altrimenti `play-circle-outline` (size 24)
- Titolo: `video.title` con `numberOfLines={2}` (`fontSize: 15`, `lineHeight: 20`)
- Durata: `formatDuration(video.duration)` (`fontSize: 13`, `opacity: 0.6`)
- Chevron forward (size 20)
- `activeOpacity: 0.7`, `marginBottom: 8`, `iconContainer.width: 40`

Formattazione durata:
```typescript
// seconds <= 0 → '—'
// altrimenti  → `${mins}:${secs.toString().padStart(2, '0')}`
```

---

## 9.8 `VideoPlayerScreen` — il player

### Libreria

**`expo-av`**, importato come `Video as ExpoVideo`, con `ResizeMode` e `Audio`.

Le dipendenze `react-native-youtube-iframe` e `react-native-webview` **non sono importate**: sono
residui dell'integrazione YouTube legacy.

### Parametri di route

```typescript
{ video: Video; course?: Course }
```

### Rilevamento HLS

```typescript
const isHLSVideo = video.url && video.url.includes('.m3u8');
```

Se falso, la schermata mostra la thumbnail e un pulsante play che **cambia icona senza riprodurre
nulla**: `handlePlayPause` esce subito se `!isHLSVideo`. Poiché `courseContent.ts` produce sempre URL
`.m3u8`, in pratica il ramo non-HLS non viene raggiunto — ma esiste come percorso morto.

**Nessuna costruzione di URL in questo file**: `video.url` arriva già completo da
`courseContent.ts`.

### Stato

| Variabile | Tipo | Iniziale |
|---|---|---|
| `isPlaying` | `boolean` | `false` |
| `showPlayButton` | `boolean` | `true` |
| `isMuted` | `boolean` | `false` |
| `playbackRate` | `number` | `1` |
| `isFullscreen` | `boolean` | `false` |
| `savedPlaybackStatus` | `{ positionMillis: number; shouldPlay: boolean }` | `{ positionMillis: 0, shouldPlay: false }` |

Ref: `videoRef = useRef<ExpoVideo>(null)`. Hook: `useWindowDimensions()`.

### Configurazione audio

`useEffect` con deps `[]`:

```typescript
Audio.setAudioModeAsync({
  allowsRecordingIOS: false,
  playsInSilentModeIOS: true,        // riproduce anche con l'interruttore silenzioso attivo
  staysActiveInBackground: false,    // si ferma in background
  interruptionModeIOS: 1,            // DoNotMix
  shouldDuckAndroid: true,
  interruptionModeAndroid: 2,        // DuckOthers
  playThroughEarpieceAndroid: false,
})
```

`allowsRecordingIOS: false` conferma che l'app non registra audio, nonostante i permessi microfono
dichiarati nei manifest.

### Controlli di riproduzione

**Controlli nativi**: `useNativeControls={true}` su entrambe le istanze `ExpoVideo`. Seek, timeline,
volume e il fullscreen nativo del componente sono quindi gestiti dal player di sistema.

**Overlay custom** (solo per video HLS):

| Controllo | Posizione | Handler |
|---|---|---|
| Play/pause centrale | centro, `80×80`, `borderRadius: 40`, icona 40 | `handlePlayPause` |
| Mute | `top: 12`, `right: 12`, `44×44`, `borderRadius: 22` | `handleToggleMute` |
| Velocità | `bottom: 12`, `right: 12`, `minWidth: 44`, `height: 36` | `handleCyclePlaybackRate` |
| Badge durata | `bottom: 12`, `left: 12`, `borderRadius: 6` | solo display |

**Velocità di riproduzione**:

```typescript
const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;
```

`handleCyclePlaybackRate` cicla in modo circolare (`(currentIndex + 1) % length`). Il pulsante mostra
`` `${playbackRate}×` ``. Il `Video` ha `shouldCorrectPitch: true`, quindi l'audio non cambia tono al
variare della velocità.

Proprietà del componente: `rate={playbackRate}`, `volume={isMuted ? 0 : 1}`, `isMuted={isMuted}`.

**Non esistono controlli di skip ±N secondi**: il seek è delegato ai controlli nativi.

### Dimensioni del contenitore video

```typescript
width: screenWidth
height: screenWidth * 0.5625     // rapporto 16:9
```

### Fullscreen

Implementato con un `Modal` React Native (`animationType="fade"`, `statusBarTranslucent`), non con il
fullscreen nativo di `expo-av`.

**`enterFullscreen`** (righe 106-121): salva la posizione corrente, chiama
`ScreenOrientation.unlockAsync()` e imposta `isFullscreen(true)`.

**`exitFullscreen`** (righe 123-138): `ScreenOrientation.lockAsync(PORTRAIT)`, salva la posizione,
`setIsFullscreen(false)`.

**`enterFullscreen` non è collegata a nessun elemento dell'interfaccia.** Nel file, `exitFullscreen`
compare come `onRequestClose` del `Modal` (riga 147) e come `onPress` del pulsante di chiusura
(riga 180), mentre `enterFullscreen` non ha alcun riferimento `onPress`. Il fullscreen custom è
quindi **codice non raggiungibile**: in pratica l'utente usa il fullscreen dei controlli nativi di
`expo-av`, che non passa da queste funzioni e non gestisce il lock dell'orientamento.

Controlli in modalità fullscreen (quando raggiungibile):
- Chiusura: icona `contract`, `top: 50` su iOS / `40` su Android, `left: 16`, `48×48`
- Mute: `right: 80`
- Velocità e badge durata: `bottom: 100`

Due istanze di `ExpoVideo` (inline e nel modal) condividono lo stesso `videoRef`, alternate con
rendering condizionale su `!isFullscreen`.

### Sezione informativa

- Titolo: `video.title` (`fontSize: 24`, `lineHeight: 32`)
- Corso: icona `library` 16 + `course.title` (se `course` è definito)
- Durata: icona `time-outline` 16 + `formatDuration(video.duration)`
- Se `video.isCompleted`: icona `checkmark-circle` + testo `'Completato'`

### Descrizione

Solo se `video.description` è non vuota:
- Titolo: `'Descrizione'` (`fontSize: 18`)
- Testo: `video.description`

### Pulsante di completamento — non funzionante

```347:357:src/screens/VideoPlayerScreen.tsx
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryButton]}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.primaryButtonText}>
              {video.isCompleted ? 'Segna come non completato' : 'Segna come completato'}
            </Text>
          </TouchableOpacity>
        </View>
```

Il `TouchableOpacity` **non ha `onPress`**. Il pulsante è visibile, cliccabile (con feedback visivo
`activeOpacity: 0.8`) e non produce nessun effetto. Poiché `isCompleted` è sempre `false`, l'etichetta
mostrata è invariabilmente `'Segna come completato'`.

Stile: `paddingVertical: 16`, `borderRadius: 12`, `gap: 10`.

### Gestione errori

`onError` su entrambe le istanze video: `console.error` e `setShowPlayButton(true)`. Nessun retry
automatico, nessun messaggio all'utente, nessuna UI di buffering custom (si affida agli indicatori dei
controlli nativi).

### `richiedeToken` non gestito

Il campo `Video.richiedeToken` (da `LezioneDto.richiedeToken`) indica che il video richiede un URL
firmato Cloudflare. **Il player non lo legge**: un video con `richiedeToken: true` riceverebbe un
`403` da Cloudflare e non partirebbe, mostrando solo il pulsante play riproposto dall'`onError`.

`paddingBottom: 32 + tabBarPad`.

---

## 9.9 Flusso utente completo

1. **Tab Corsi** → `CorsiStack` monta il catalogo corrispondente al ruolo.
2. La query carica i corsi (`staleTime: 60_000`), la vista mostra statistiche e lista.
3. **Tap su una card** non bloccata → `navigate('CourseVideos', { course })`.
4. `CourseVideosScreen` chiama `loadCourseContent(course)`:
   - determina il catalogo da `course.catalog`
   - carica moduli e, in parallelo, le lezioni di ciascun modulo
   - costruisce gli URL HLS da `cloudflareUid`
5. Secondo effect: per le lezioni senza `durataSecondi`, scarica i manifest HLS e calcola le durate.
6. La schermata mostra moduli come accordion **chiusi**.
7. **Tap su un modulo** → si espande e mostra le lezioni ordinate.
8. **Tap su una lezione** → `navigate('VideoPlayer', { video, course: displayCourse })`.
9. `VideoPlayerScreen` configura l'audio e riproduce il manifest HLS con i controlli nativi.
10. Al termine, nessun progresso viene registrato: tornando indietro tutto risulta ancora da vedere.

---

## 9.10 Componenti del modulo non utilizzati

### `src/components/Button.tsx`

```typescript
interface ButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  disabled?: boolean;
}
```

Stile: `backgroundColor: theme.colors.accent`, `paddingHorizontal: 20`, `paddingVertical: 12`,
`borderRadius: 8`, testo `fontSize: 16`, `fontWeight: '600'`.

**Non è importato da alcun file.** Tutte le schermate usano `TouchableOpacity` o `Pressable` con stili
locali. È l'unico componente "design system" dell'app, e non viene usato.

### `src/components/SpineIcon.tsx`

Usato altrove (tab bar, `HomeScreen`, `SessioniHomeScreen`, `SessioniPrenotazioniScreen`) ma **non**
nel modulo Corsi. Documentato in [11 — Design system](./11-design-system-e-ui.md).

---

## 9.11 Osservazioni sul modulo

### Il tracciamento del progresso non esiste

È il gap funzionale più visibile. L'interfaccia è interamente predisposta:

- `Course.isCompleted`, `Course.completionPercentage`
- `Video.isCompleted`
- Barre di progresso in `CourseCard` e `CourseVideosScreen`
- Contatori `"N/M completati"` in `ChapterSection`
- Statistiche `'Completati'` e `'Media'` in `CorsiCatalogView`
- Pulsante `'Segna come completato'` in `VideoPlayerScreen`
- Etichette `'Rivedi'` vs `'Continua'` in `CourseCard`

Ma nessun pezzo è collegato: `courseContent.ts` imposta `isCompleted: false` in modo hardcoded,
i mapper impostano `completionPercentage: 0`, il pulsante non ha handler e non esiste alcun endpoint
di progresso. L'utente vede quindi sempre `0%`, `"0 di N video completati"`, `'Continua'` su ogni
corso e un pulsante inerte.

Per completare la funzionalità servono: endpoint backend (es.
`POST /api/formazione/lezioni/{id}/completata`), un servizio client, una mutation con invalidazione e
il collegamento dell'`onPress`. Facoltativamente, salvataggio della posizione di riproduzione per una
vera "ripresa rapida".

### Durata dei corsi sempre assente

`mapCorsoDtoToCourse` imposta `duration: 0`, quindi le card mostrano `'—'`. La durata reale è
calcolabile solo dopo aver caricato tutte le lezioni del corso (cosa che avviene solo entrando nel
dettaglio). Il backend potrebbe esporre un campo aggregato `durataTotaleSecondi` sul `CorsoDto`.

### Campi mappati e non mostrati

`instructor` (sempre `'Mobilitas'`), `category` (`'Formazione'` / `'Postura'`) e `difficulty` (sempre
`'Principiante'`) vengono calcolati dai mapper, passati come props a `CourseCard` e **mai
renderizzati**. Sono valori placeholder di uno scaffolding iniziale.

### Costo delle richieste per le durate HLS

Un corso con 30 lezioni senza `durataSecondi` genera 30-60 richieste HTTP parallele all'apertura del
dettaglio. Popolare `durataSecondi` lato backend al momento dell'upload su Cloudflare eliminerebbe
completamente questo carico.

### Colori hardcoded

Il modulo Corsi usa diversi valori esadecimali non presenti nel theme: `#001831` (coincide con
`background.primary`), `#07284A`, `#0A2B4D`, `#06213D`, `#D7FFE2` (coincide con `titlePrimary`),
`#D8FFE3`, `#CCFFD9`, `#D3FFE0`. Sono quattro tonalità di verde chiaro e tre di blu che
andrebbero consolidate nel theme.
