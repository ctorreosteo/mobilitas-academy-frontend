# 11 — Design system e UI

L'app non usa alcuna libreria di componenti: nessun NativeBase, nessun Tamagui, nessun
`react-native-paper`. Tutta l'interfaccia è costruita con le primitive React Native (`View`, `Text`,
`Pressable`, `TouchableOpacity`, `Modal`, `FlatList`) più `StyleSheet.create` locale in ogni file.

Il "design system" consiste in **un solo file di token** (`src/theme/index.ts`) e in un insieme di
pattern visivi replicati a mano schermata per schermata.

---

## 11.1 Il file dei token: `src/theme/index.ts`

### Configurazioni di palette

Il file definisce quattro palette alternative e ne attiva una tramite una costante:

```typescript
export const colorConfigurations = {
  scuro:  { primary: '#002552', secondary: '#72fa93' },   // attiva
  prova:  { primary: '#000035', secondary: '#72fa93' },
  medio:  { primary: '#3B4A64', secondary: '#72fa93' },
  chiaro: { primary: '#3B4A64', secondary: '#B7C3B2' },
} as const;

export const activeColorConfiguration: ColorConfigurationName = 'scuro';
```

Il commento nel file dice `// Cambia questo valore per selezionare la configurazione globale.`
È un meccanismo di theming **a compile-time**: non esiste un theme provider, non c'è modo di cambiare
palette a runtime e non c'è supporto per la modalità chiara del sistema operativo. La palette `chiaro`
non produrrebbe comunque un tema chiaro, perché tutti gli sfondi pagina usano
`background.primary`, che è un valore fisso fuori dalle configurazioni.

`ColorConfigurationName` è esportato come tipo derivato (`keyof typeof colorConfigurations`).

### Palette esportata

```typescript
export const colors = {
  primary: activePalette.primary,       // '#002552' — blu scuro
  secondary: activePalette.secondary,   // '#72fa93' — verde menta, colore identitario
  titlePrimary: '#D7FFE2',              // verde più chiaro per i titoli

  accent: '#0ea5e9',                    // azzurro
  error: '#FF6869',                     // rosso corallo
  black: '#000000',

  text: {
    primary: activePalette.secondary,   // verde
    secondary: '#FFFFFF',               // bianco
    accent: '#0ea5e9',
    error: '#FF6869',
  },

  background: {
    primary: '#001831',                 // blu profondo, sfondo di tutte le pagine
    secondary: '#F4F4F4',               // grigio chiaro, usato per gli input
    white: '#FFFFFF',
  },
  gradients: {
    splash: ['#0A3D62', '#1E88E5', '#42A5F5'] as const,
  },
};
```

Osservazioni sulla struttura:

- `accent` e `text.accent` hanno lo stesso valore (`#0ea5e9`), così come `error` e `text.error`
  (`#FF6869`). Duplicazione con due percorsi di accesso equivalenti.
- `text.primary` è **verde** e `text.secondary` è **bianco**: la nomenclatura è controintuitiva,
  perché il testo di corpo più leggibile è quello "secondary". Nel codice `text.secondary` è
  effettivamente usato più spesso per i paragrafi, e `text.primary` per gli accenti.
- `background.secondary` (`#F4F4F4`) è un grigio chiarissimo su un tema scuro: viene usato solo come
  sfondo dei `TextInput` (`LoginScreen.tsx:28` lo aliasa come `inputBg`).
- `colors.black` non è usato in nessun file.
- `gradients.splash` è usato solo da `components/SplashScreen.tsx`, che non è raggiungibile — quindi
  in pratica non è mai renderizzato.

### `withOpacity`

```58:69:src/theme/index.ts
export const withOpacity = (hexColor: string, opacity: number): string => {
  const hex = hexColor.replace('#', '');
  const normalized = hex.length === 3
    ? hex.split('').map((char) => char + char).join('')
    : hex;

  const red = parseInt(normalized.slice(0, 2), 16);
  const green = parseInt(normalized.slice(2, 4), 16);
  const blue = parseInt(normalized.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${opacity})`;
};
```

Converte un colore esadecimale in `rgba()` con l'opacità richiesta, gestendo la forma a 3 cifre.
È l'utility più usata dell'app: compare in quasi ogni foglio di stile per creare bordi, sfondi
tenui e testi attenuati a partire dai colori base.

Non valida l'input: un valore non esadecimale produce `rgba(NaN, NaN, NaN, x)`, che React Native
ignora silenziosamente. Non è un problema pratico, poiché è sempre invocata con costanti del theme.

Opacità ricorrenti nel codice: `0.12` (sfondo badge), `0.24`/`0.35` (bordi), `0.45`/`0.5` (testo
disabilitato o placeholder), `0.6`/`0.7`/`0.72` (testo secondario), `0.85`/`0.94` (testo quasi pieno).

### Tipografia

```typescript
export const fonts = {
  primary: 'Montserrat',
  fallback: 'System',
  weights: {
    light: '300', regular: '400', medium: '500', semiBold: '600', bold: '700',
  },
};
```

**Montserrat non è installato.** Nel repository:

- Non esiste alcun file `.ttf` o `.otf` (verificato su tutto il repo, esclusi i `node_modules`).
- `expo-font` non è tra le dipendenze di `package.json`.
- `app.json` non dichiara alcun font in `plugins`.
- `fonts/README.md` documenta la procedura di installazione, che non è stata eseguita
  (vedi [02](./02-configurazione-ambiente-e-build.md)).

Di conseguenza, ovunque il codice scriva:

```typescript
fontFamily: Platform.OS === 'ios' ? 'System' : theme.fonts.primary
```

su **iOS** si ottiene correttamente il font di sistema (San Francisco), mentre su **Android** si
richiede `'Montserrat'`, che non esiste: il sistema ricade sul font di default (Roboto) senza
segnalare nulla. Il risultato è che l'app usa i font di sistema su entrambe le piattaforme e la
condizione su `Platform.OS` non produce alcun effetto reale.

Questa esatta espressione ternaria è ripetuta **139 volte** in 15 file (su 141 righe totali che
menzionano `fontFamily`). Le occorrenze per file:

| File | Occorrenze |
|---|---|
| `ProfileScreen.tsx` | 21 |
| `sessioni/SessioniCalendarioScreen.tsx` | 15 |
| `LoginScreen.tsx` | 15 |
| `fitness/FitnessSessionsCalendarScreen.tsx` | 14 |
| `sessioni/SessioniPrenotazioniScreen.tsx` | 13 |
| `fitness/FitnessBookingsScreen.tsx` | 13 |
| `CourseVideosScreen.tsx` | 11 |
| `VideoPlayerScreen.tsx` | 8 |
| `sessioni/SessioniHomeScreen.tsx` | 7 |
| `FitnessScreen.tsx` | 7 |
| `components/CourseCard.tsx` | 6 |
| `visite/PagamentiPazienteScreen.tsx` | 4 |
| `components/ChapterSection.tsx` | 3 |
| `components/VideoItem.tsx` | 2 |
| `visite/GestioneVisiteScreen.tsx` | 1 |
| `utils/themeUtils.ts` | 1 |

Molte schermate (fra cui `HomeScreen`, `VisiteMenuScreen`, `BookVisitScreen`,
`CorsiCatalogView`) **non impostano `fontFamily` affatto**: la tipografia non è quindi nemmeno
applicata in modo uniforme.

`fonts.weights` (le stringhe `'300'`…`'700'`) è usato solo da `themeUtils.ts`, che non è importato da
nessuna schermata. Nel resto del codice i pesi sono scritti direttamente (`fontWeight: '700'`).

`fonts.fallback` non è mai letto: le schermate usano il letterale `'System'`.

### Export finale

```typescript
export const theme = { colors, fonts };
```

Tutte le schermate importano `{ theme, withOpacity } from '../theme'`. Alcune importano anche
`colors` o `fonts` direttamente. Nessuna usa `colorConfigurations` o `activeColorConfiguration`.

---

## 11.2 `src/utils/themeUtils.ts` — non utilizzato

Espone cinque helper: `getTheme()`, `getColors()`, `getFonts()`, `getFontFamily(weight)`,
`createTextStyle(size, weight, color)`, `createContainerStyle(backgroundColor, padding)`.

**Nessuno è importato da alcun file.** Verificabile con una ricerca su `themeUtils` in `src/`.

Il file contiene anche un bug latente in `getFontFamily`:

```14:23:src/utils/themeUtils.ts
export const getFontFamily = (weight: keyof typeof theme.fonts.weights = 'regular') => {
  if (Platform.OS === 'ios') {
    // Su iOS, usa il font di sistema se Montserrat non è disponibile
    return Platform.select({
      ios: 'System',
      android: theme.fonts.primary,
    });
  }
  return theme.fonts.primary;
};
```

Il parametro `weight` è dichiarato ma **mai usato**, e il `Platform.select` interno è ridondante:
il ramo `android` non è raggiungibile, essendo già dentro un `if (Platform.OS === 'ios')`.
Inoltre `createTextStyle` imposta `fontWeight: 'normal'` su Android, azzerando qualunque peso
richiesto.

Il file va rimosso oppure corretto e adottato in modo sistematico; nello stato attuale è codice morto
che suggerisce un'astrazione mai completata.

---

## 11.3 Colori hardcoded fuori dal theme

I valori esadecimali scritti direttamente nei componenti sono complessivamente pochi e concentrati:

| File | Valori | Note |
|---|---|---|
| `App.tsx` | `#07294A`, `rgba(114, 250, 147, 0.24)`, `#001022`, `rgba(114, 250, 147, 0.45)` | Oggetto `tabBarColors` |
| `components/CourseCard.tsx` | `#0A2B4D`, `#06213D`, `#D8FFE3`, `#CCFFD9`, `#D3FFE0` | Card corso |
| `screens/corsi/CorsiCatalogView.tsx` | `#001831`, `#07284A`, `#D7FFE2` | Due coincidono con token del theme |
| `components/StudioWhatsAppSupportButton.tsx` | `#25D366` | Verde ufficiale WhatsApp — legittimo |
| `screens/visite/GestioneVisiteScreen.tsx` | `#25D366` | Verde WhatsApp duplicato |

Punti da correggere:

1. `#001831` in `CorsiCatalogView` e `#D7FFE2` sono **identici** a
   `theme.colors.background.primary` e `theme.colors.titlePrimary`: dovrebbero usare i token.
2. `#07284A` (CorsiCatalogView) e `#07294A` (tab bar) differiscono di **una cifra**: quasi certamente
   uno dei due è un errore di battitura, e sono comunque due tonalità visivamente indistinguibili.
3. `#25D366` è duplicato in due file: va estratto in una costante condivisa (idealmente accanto
   all'utility WhatsApp).
4. Le quattro sfumature di verde chiaro del modulo Corsi (`#D8FFE3`, `#CCFFD9`, `#D3FFE0`,
   `#D7FFE2`) sono percettivamente equivalenti: andrebbero consolidate in uno o due token.
5. Nelle palette di `tabBarColors`, `rgba(114, 250, 147, ...)` è `secondary` con opacità: si può
   ottenere con `withOpacity(theme.colors.secondary, 0.24)` invece del letterale.

---

## 11.4 La tab bar

Definita in `App.tsx` come unico blocco di `screenOptions` sul `Tab.Navigator`.

### Colori

```22:27:App.tsx
const tabBarColors = {
  background: '#07294A',
  border: 'rgba(114, 250, 147, 0.24)',
  shadow: '#001022',
  inactive: 'rgba(114, 250, 147, 0.45)',
};
```

### Stile

| Proprietà | Valore |
|---|---|
| `position` | `'absolute'` (overlay sul contenuto) |
| `left` / `right` / `bottom` | `0` |
| `borderTopLeftRadius` / `borderTopRightRadius` | `24` |
| `backgroundColor` | `#07294A` |
| `borderTopWidth` / `borderTopColor` | `1` / verde al 24% |
| `elevation` | `14` (Android) |
| `shadowColor` | `#001022` |
| `shadowOffset` | `{ width: 0, height: -6 }` (ombra verso l'alto) |
| `shadowOpacity` / `shadowRadius` | `0.35` / `16` |
| `height` | `64 + tabBarBottomPadding` |
| `paddingBottom` | `tabBarBottomPadding` |
| `paddingTop` | `12` |

Il padding inferiore si adatta al notch:

```typescript
const { bottom: bottomInset } = useSafeAreaInsets();
const tabBarBottomPadding = bottomInset > 0 ? bottomInset : 12;
```

Sui dispositivi con home indicator la barra si estende fino al bordo; sugli altri usa un minimo di
12 px. L'altezza totale risulta quindi variabile — motivo per cui esiste l'hook descritto in §11.6.

### Colori attivo/inattivo e label

- `tabBarActiveTintColor: theme.colors.secondary` (`#72fa93` pieno)
- `tabBarInactiveTintColor: 'rgba(114, 250, 147, 0.45)'` (stesso verde al 45%)
- `tabBarLabelStyle`: `fontSize: 12`, `fontWeight: '600'`, `letterSpacing: 0.2`

La distinzione tra attivo e inattivo è affidata **solo** all'opacità del verde, senza differenze di
peso o colore. Il contrasto è modesto.

### Icone

Ogni tab riceve un'icona da 26 px che alterna la variante piena e quella `-outline` in base a
`focused`:

| Tab | Icona attiva | Icona inattiva |
|---|---|---|
| Home | `home` | `home-outline` |
| Corsi | `library` | `library-outline` |
| Visite | `calendar` | `calendar-outline` |
| Sessioni | `SpineIcon` (custom) | `SpineIcon` (identico) |
| Profilo | `person` | `person-outline` |

La tab Sessioni riceve solo `({ color })` e non usa `focused`: la sua icona **non cambia forma**
quando è selezionata, distinguendosi solo per il colore. È una piccola incoerenza rispetto alle
altre quattro.

### Contenuto delle scene

`sceneStyle: { paddingTop: 12 }` applica un margine superiore uniforme a tutte le scene delle tab.

### Header

```typescript
headerStyle: {
  backgroundColor: theme.colors.background.primary,
  elevation: 0,
  shadowOpacity: 0,
},
headerTintColor: theme.colors.secondary,
headerTitleStyle: { fontWeight: '600', color: theme.colors.secondary },
```

Header piatti, senza ombra, con titolo verde su sfondo blu profondo. Tutte e cinque le tab impostano
comunque `headerShown: false`: gli header visibili sono quelli configurati dagli stack annidati
(vedi [06](./06-navigazione-e-schermate.md)).

---

## 11.5 `SpineIcon` — l'icona custom

L'unico asset grafico disegnato in codice: una colonna vertebrale stilizzata, usata come icona
identitaria del modulo Sessioni.

### Props

```typescript
type Props = {
  size?: number;   // default 26
  color: string;
  style?: StyleProp<ViewStyle>;
};
```

### Come è costruita

Non è un SVG e non usa `react-native-svg`: è una pila di `View` con `borderRadius`, ognuna
rappresentante una vertebra, sfalsate orizzontalmente per suggerire la doppia curva della colonna.

Il "profilo" dell'icona è descritto da un tipo dedicato:

```typescript
type Profile = {
  vertebrae: number[];                              // larghezze, frazioni del lato
  tail: { width: number; height: number }[];        // sacro e coccige
  vertebraHeight: number;
  amplitude: number;                                // ampiezza della curva a S
  gap: number;
};
```

### Due profili con breakpoint

```typescript
const FULL: Profile = {
  vertebrae: [0.28, 0.34, 0.4, 0.46, 0.5, 0.46],
  tail: [{ width: 0.26, height: 0.07 }, { width: 0.15, height: 0.055 }],
  vertebraHeight: 0.082,
  amplitude: 0.06,
  gap: 0.038,
};

const COMPACT: Profile = {
  vertebrae: [0.3, 0.4, 0.5, 0.44],
  tail: [{ width: 0.22, height: 0.1 }],
  vertebraHeight: 0.13,
  amplitude: 0.055,
  gap: 0.06,
};

const COMPACT_BREAKPOINT = 18;
```

Il commento nel codice spiega la scelta: *"Sotto i 18px le vertebre sottili collassano in un blocco
unico: servono meno segmenti, più spessi e distanziati."* È un caso di **responsive icon design**
raro e ben eseguito: a dimensioni ridotte il disegno si semplifica invece di diventare illeggibile.

### Calcolo dei segmenti

Dentro un `useMemo` con dipendenza `[size]`:

1. Sceglie il profilo in base a `size < COMPACT_BREAKPOINT`.
2. Calcola il gap con `PixelRatio.roundToNearestPixel`, con minimo `StyleSheet.hairlineWidth`.
3. Per ogni vertebra, l'offset orizzontale segue un coseno:
   `amplitude * Math.cos((2 * Math.PI * index) / (count - 1))` — produce la curva a S.
4. Per i segmenti di coda, l'offset decresce linearmente: `amplitude * (0.6 - index * 0.25)`.
5. Ogni segmento diventa una `View` con `width` e `height` arrotondati al pixel (minimi
   rispettivamente 2 e 1), `borderRadius: height / 2` (capsula perfetta),
   `transform: [{ translateX: size * offset }]` e `marginBottom: gap` (0 per l'ultimo).

L'uso di `PixelRatio.roundToNearestPixel` evita il blur da coordinate frazionarie sugli schermi a
densità elevata.

### Dove è usata

`App.tsx` (tab bar, size 26), `HomeScreen` (22), `SessioniHomeScreen`,
`SessioniPrenotazioniScreen`, e i corrispettivi Fitness. Non è usata nei moduli Corsi e Visite.

---

## 11.6 `useTabBarBottomPadding`

```1:12:src/hooks/useTabBarBottomPadding.ts
import { useBottomTabBarHeight } from '@react-navigation/bottom-tabs';

/** Spazio extra sopra la tab bar flottante così l'ultimo contenuto non resta attaccato. */
const SCROLL_CLEARANCE_ABOVE_TAB = 12;

/**
 * Padding verticale da sommare al fondo di ScrollView / FlatList / SectionList
 * quando la schermata è dentro il Bottom Tab Navigator con tab bar in overlay.
 */
export function useTabBarBottomPadding(): number {
  return useBottomTabBarHeight() + SCROLL_CLEARANCE_ABOVE_TAB;
}
```

È la soluzione al problema creato da `tabBarStyle.position: 'absolute'`: poiché la barra galleggia
sopra il contenuto, ogni lista scrollabile deve riservare spazio in fondo, altrimenti l'ultimo
elemento resta coperto.

Uso canonico, replicato in tutte le schermate delle tab:

```typescript
const tabBarPad = useTabBarBottomPadding();
// ...
contentContainerStyle={[styles.scrollContent, { paddingBottom: 28 + tabBarPad }]}
```

L'addendo fisso varia per schermata (24, 28, 32, 36), senza una regola condivisa. Consolidarlo
migliorerebbe l'uniformità dello spazio in fondo alle pagine.

**Vincolo importante**: `useBottomTabBarHeight()` lancia un'eccezione se chiamato fuori da un
`BottomTabNavigator`. Ogni schermata che usa questo hook deve quindi essere raggiungibile solo dentro
le tab — condizione verificata, dato che tutte le route dell'app vivono in stack annidati nelle tab.

---

## 11.7 Pattern visivi ricorrenti

Questi pattern non esistono come componenti: sono **riscritti a mano** in ogni schermata, con
variazioni minori. Documentarli serve sia a mantenere coerenza nelle modifiche future sia a capire
quali astrazioni valga la pena estrarre.

### Header di pagina

Struttura ricorrente in `LoginScreen`, `HomeScreen`, `ProfileScreen`, `CorsiCatalogView`,
`CourseVideosScreen`, `SessioniHomeScreen` e altre:

1. **Titolo** grande (`fontSize` da 22 a 30, `fontWeight` `'700'`/`'800'`, colore `secondary`)
2. **Sottotitolo** descrittivo (`fontSize` 14-15, `text.secondary` con opacità 0.72-0.94)
3. **Badge pillola**: `borderRadius: 999`, `borderWidth: 1` con `withOpacity(secondary, 0.35)`,
   sfondo `withOpacity(secondary, 0.12)`, `paddingVertical: 6`, `paddingHorizontal: 12`, icona
   Ionicons 14 + testo `fontSize: 12`, `fontWeight: '600'`, `letterSpacing: 0.2`
4. **Divider decorativo**: due linee `flex: 1` con al centro un cerchio contenente un'icona da 15

Il badge è l'elemento più standardizzato dell'app: le proprietà coincidono quasi esattamente in tutte
le schermate. Il divider ha invece **almeno tre implementazioni** diverse (due linee affiancate,
tre elementi con `dividerLineLeft`/`dividerLineRight`, versione senza cerchio).

### Card statistiche

Riga di 3 valori numerici con etichetta, presente in `CorsiCatalogView`, `CourseVideosScreen` e
`ProfileScreen`. Numero grande (`fontSize` 24, `fontWeight` `'800'`, verde chiaro), etichetta piccola
in maiuscoletto (`fontSize` 12, `textTransform: 'uppercase'`, `letterSpacing` 0.8).

In tutte e tre le schermate i valori mostrati sono **placeholder o costanti** (vedi
[09](./09-modulo-corsi-e-video.md) e [10](./10-login-home-profilo.md)).

### Modale di conferma

Il pattern più replicato: presente in `ProfileScreen` (6 volte), `LoginScreen`,
`GestioneVisiteScreen`, `SessioniCalendarioScreen`, `SessioniPrenotazioniScreen`, `BookVisitScreen`,
e nei corrispettivi Fitness.

Anatomia costante:

```
Modal (transparent, animationType="fade", onRequestClose)
└─ View modalBackdrop        (sfondo scuro semitrasparente, centratura)
   └─ View modalCard         (card arrotondata, padding generoso)
      ├─ View modalIconWrap  (cerchio con icona Ionicons 20)
      ├─ Text modalTitle
      ├─ Text modalText
      └─ View modalActions
         ├─ Pressable modalSecondaryBtn  ('Annulla')
         └─ Pressable modalPrimaryBtn / modalDangerBtn
```

Convenzioni condivise:
- `Pressable` con funzione di stile: `({ pressed }) => [styles.btn, pressed && styles.btnPressed]`
- `onRequestClose` che **non chiude** se un'operazione è in corso: `if (!cleaning) setVisible(false)`
- Pulsante di azione che mostra un `ActivityIndicator` al posto del testo durante l'attesa
- Varianti di `modalIconWrap`: `Accent`, `Success`, `Error`

Un componente `ConfirmModal` estratto eliminerebbe diverse centinaia di righe duplicate
(vedi [15](./15-debito-tecnico-e-anomalie.md)).

### Select custom

Implementato due volte con approcci diversi:
- `SelectModal` nel modulo Visite: componente generico e riutilizzabile
  (vedi [07](./07-modulo-visite.md))
- Dropdown inline in `ProfileScreen` per la scelta dello studio recensione: `Pressable` che espande
  una lista sotto di sé, con chevron che si inverte

Entrambi mostrano un placeholder, evidenziano l'opzione selezionata e usano `chevron-down` /
`chevron-up`. Il secondo caso è un buon candidato per essere sostituito da `SelectModal`.

### Banner di errore e stati vuoti

Convenzione condivisa da tutte le schermate con dati remoti:

- **Errore con dati presenti**: banner inline sopra il contenuto, che **non nasconde** i dati già
  caricati
- **Errore senza dati**: messaggio nell'`ListEmptyComponent` con `StudioWhatsAppSupportButton`
- **Nessun dato**: testo neutro senza pulsante di supporto
- **Caricamento iniziale**: `ActivityIndicator size="large"` con un testo tipo `'Caricamento …'`
- **Ricaricamento**: `RefreshControl` con `tintColor: theme.colors.secondary`

Questa gerarchia degli stati è applicata con notevole coerenza in tutta l'app ed è uno dei suoi punti
di forza. Dettagli sui messaggi in [14](./14-errori-e-messaggistica.md).

### Pulsanti

Non esiste un componente pulsante condiviso in uso (`components/Button.tsx` esiste ma non è importato
da nessuno — vedi [09 §9.10](./09-modulo-corsi-e-video.md)). Le varianti ricorrenti, riscritte
localmente:

| Variante | Caratteristiche |
|---|---|
| Primario | sfondo verde `secondary`, testo `background.primary`, `borderRadius` 12 |
| Secondario | trasparente con bordo, testo verde |
| Pericolo | rosso `error` |
| WhatsApp | `#25D366` con icona `logo-whatsapp` |
| Testuale | solo testo, per link e azioni minori |

`activeOpacity` sui `TouchableOpacity` varia tra `0.7`, `0.75`, `0.8` e `0.85` senza criterio; i
`Pressable` usano invece stili condizionali su `pressed`.

---

## 11.8 Accessibilità

Il supporto è **parziale e non sistematico**. Gli unici punti in cui è dichiarato esplicitamente:

| Elemento | Attributi |
|---|---|
| Checkbox "ricorda username" (`LoginScreen`) | `accessibilityRole="checkbox"`, `accessibilityState={{ checked }}` |
| `StudioWhatsAppSupportButton` | `accessibilityRole="button"`, `accessibilityLabel` descrittiva |

Tutto il resto si affida ai ruoli impliciti delle primitive React Native. Mancanze rilevanti:

- Le icone senza testo (chiudi modale, mute, velocità nel player) non hanno `accessibilityLabel`.
- Le celle del calendario in `SessioniCalendarioScreen` non comunicano data né disponibilità.
- Gli stati di caricamento non usano `accessibilityLiveRegion`, quindi non vengono annunciati.
- Nessun controllo del contrasto: il verde `#72fa93` al 45% su `#07294A` (label inattive della tab
  bar) è al di sotto del rapporto 4.5:1 richiesto da WCAG AA per il testo normale.
- Nessuna gestione di `Dimensions`/`fontScale` per le impostazioni di testo grande del sistema: le
  dimensioni sono fisse in punti e un ingrandimento di sistema può causare troncamenti.

Il `minHeight: 44` di `StudioWhatsAppSupportButton` rispetta la dimensione minima di tocco
raccomandata; molti altri controlli (chevron, icone piccole) sono sotto tale soglia, mitigati in
alcuni casi da `hitSlop` (es. `LoginScreen.tsx:126`).

---

## 11.9 Sintesi e priorità

Cosa funziona bene:
- Palette e identità visiva coerenti su tutta l'app (verde menta su blu profondo)
- Gerarchia degli stati (caricamento / errore / vuoto / dati) applicata uniformemente
- `withOpacity` come unica utility di colore, usata correttamente e in modo pervasivo
- `SpineIcon` con profilo responsive: soluzione elegante e ben commentata
- `useTabBarBottomPadding`: astrazione minima che risolve un problema reale in modo definitivo

Cosa conviene affrontare, in ordine di rapporto beneficio/costo:

1. **Rimuovere `fontFamily` o installare Montserrat.** 139 righe di codice non producono alcun
   effetto. Installare `expo-font` più i file del font, o eliminare le dichiarazioni.
2. **Estrarre un `ConfirmModal`.** Il pattern è ripetuto oltre dieci volte con la stessa anatomia.
3. **Adottare o eliminare `components/Button.tsx` e `utils/themeUtils.ts`.** Entrambi sono
   astrazioni mai collegate.
4. **Consolidare i colori hardcoded nel theme**, in particolare i due valori quasi identici
   `#07284A` / `#07294A` e le quattro sfumature di verde chiaro.
5. **Aggiungere `accessibilityLabel` ai controlli con sola icona** — poche righe, impatto concreto per
   gli utenti di screen reader.
6. **Standardizzare l'addendo di `paddingBottom`** nelle liste (oggi 24/28/32/36).
