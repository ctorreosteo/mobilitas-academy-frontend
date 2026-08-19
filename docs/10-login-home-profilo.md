# 10 — Login, Home e Profilo

Le tre schermate trasversali: la porta d'ingresso, la dashboard e l'area personale.

| File | Righe | Ruolo |
|---|---|---|
| `src/screens/LoginScreen.tsx` | 472 | Autenticazione |
| `src/screens/HomeScreen.tsx` | 274 | Dashboard / hub di navigazione |
| `src/screens/ProfileScreen.tsx` | 1239 | Account, sessione, cache, recensioni |
| `src/components/StudioWhatsAppSupportButton.tsx` | 71 | Pulsante di supporto riutilizzabile |
| `src/components/SplashScreen.tsx` | 529 | **Non raggiungibile** |

---

## 10.1 `LoginScreen`

Renderizzata da `App.tsx` quando `!isAuthenticated`, al di fuori del navigator: non ha accesso a
`useNavigation` e non ne ha bisogno.

### Stato

| Variabile | Tipo | Iniziale | Note |
|---|---|---|---|
| `username` | `string` | `''` | Precompilato dall'effect se la preferenza è attiva |
| `password` | `string` | `''` | Mai persistito |
| `rememberUsername` | `boolean` | `true` | Default opt-in |
| `submitting` | `boolean` | `false` | Blocca input e pulsante |
| `error` | `string \| null` | `null` | Messaggio inline |
| `showRegisterModal` | `boolean` | `false` | |

### Effect di precompilazione (deps `[]`)

```typescript
const [pref, saved] = await Promise.all([
  getRememberUsernamePreference(),
  getRememberedLoginUsername(),
]);
if (!active) return;
setRememberUsername(pref);
if (pref && saved) setUsername(saved);
```

Guardia `active` per evitare set di stato dopo lo smontaggio. `getRememberUsernamePreference()`
restituisce `true` quando la chiave non è mai stata scritta, quindi al primo avvio la checkbox è
spuntata.

### Submit

```typescript
const onSubmit = async () => {
  setError(null);
  if (!username.trim() || !password) {
    setError('Inserisci username o email e password.');
    return;
  }
  setSubmitting(true);
  try {
    await signIn(username.trim(), password, { rememberUsername });
  } catch (e) {
    setError(e instanceof Error ? e.message : 'Accesso non riuscito');
  } finally {
    setSubmitting(false);
  }
};
```

Validazione minima: solo campi non vuoti. Nessun controllo di formato email (corretto, dato che il
campo accetta anche username), nessun controllo di lunghezza password. `username` viene inviato con
`trim()`, `password` **senza** trim (giusto: gli spazi possono essere parte della password).

In caso di successo non c'è navigazione esplicita: `AuthContext` aggiorna `isAuthenticated` e
`App.tsx` sostituisce l'albero. Il `setSubmitting(false)` nel `finally` viene eseguito su un
componente che sta per essere smontato — innocuo in React 18, ma potenzialmente causa di un warning.

### Layout

`SafeAreaView` (`edges: ['top', 'bottom']`) → `StatusBar style="light"` →
`KeyboardAvoidingView` (`behavior: 'padding'` solo su iOS, `undefined` su Android) →
`ScrollView` (`keyboardShouldPersistTaps="handled"`, `showsVerticalScrollIndicator={false}`,
`contentContainerStyle`: `flexGrow: 1`, `paddingHorizontal: 28`, `paddingTop: 24`,
`paddingBottom: 32`).

Il contenuto è racchiuso in `formBlock` (`flexGrow: 1`, `justifyContent: 'center'`), quindi il form è
centrato verticalmente. Un commento nel codice (riga 246) parla di *"pittogramma in basso"*: il
pittogramma è stato rimosso ma lo stile e il commento sono rimasti.

### Elementi dell'interfaccia

| Elemento | Contenuto / stile |
|---|---|
| Titolo | `'Benvenuto in Mobilitas'` — `fontSize: 26`, `fontWeight: '700'`, colore `secondary`, centrato |
| Sottotitolo | `'Accedi al tuo account Mobilitas HQ'` — `fontSize: 15`, `text.secondary` al 72% |
| Badge | icona `lock-closed-outline` 14 + `'Area accesso'` — pillola `borderRadius: 999` |
| Divider | due linee + cerchio con `log-in-outline` 15 |
| Campo username | label `'Username'`, placeholder `'Email o username'` |
| Campo password | label `'Password'`, placeholder `'••••••••'` |
| Link password | `'Password dimenticata?'` con `hitSlop={12}` |
| Checkbox | icona `checkbox` / `square-outline` 24 |
| Pulsante | `'Accedi'` o `ActivityIndicator` |
| Footer | `'Non hai un account? '` + `'Registrati'` |
| Legale | `'Cliccando su Accedi, accetti i nostri Termini d'uso.'` |

**Campo username**: `autoCapitalize="none"`, `autoCorrect={false}`,
`keyboardType="email-address"`, `textContentType="username"`, `editable={!submitting}`.

**Campo password**: `secureTextEntry`, `textContentType="password"`, `editable={!submitting}`.
`textContentType` abilita il riempimento dal keychain iOS. **Non c'è un toggle di visibilità della
password.**

**Testo della checkbox**: `'Salva email o username per i prossimi accessi. La password non viene mai
memorizzata sul dispositivo.'` — con `accessibilityRole="checkbox"` e
`accessibilityState={{ checked: rememberUsername }}`. È l'unico esempio nell'app di stato di
accessibilità dichiarato correttamente su un controllo custom.

### Password dimenticata

`Alert.alert` nativo:
- Titolo: `'Password dimenticata?'`
- Messaggio: `'Contatta l'amministratore di Mobilitas HQ per reimpostare l'accesso.'`

Nessun flusso di reset: la password si recupera solo per via umana.

### Modale di registrazione

`Modal` `transparent`, `animationType="fade"`. Icona `person-add-outline` 20, titolo
`'Registrazione'`, testo `'La registrazione deve essere effettuata presso la segreteria dello studio o
chiamando.'`, pulsante `'Ho capito'`.

**L'app non ha registrazione self-service**: gli account sono creati dal gestionale.

### Link legale

```typescript
Linking.openURL('https://www.studiomobilitas.it/privacy-policy-applicazione')
```

L'etichetta dice *"Termini d'uso"* ma l'URL punta alla **privacy policy**. È l'unico link legale
dell'app e nella schermata non compare un riferimento separato ai termini di servizio.

---

## 10.2 `HomeScreen`

Prima tab, sempre montata per tutti i ruoli. È la schermata più semplice dell'app: nessuno stato
locale, nessuna query, nessuna chiamata di rete.

### Dati derivati

```typescript
const firstName = userProfile?.nome?.trim() || 'Professionista';
const isGestionale = hasGestionaleRole(userProfile?.ruoli);
const coursesLabel = isGestionale ? 'corsi aziendali' : 'corsi posturali';
```

Il fallback `'Professionista'` compare quando `nome` è assente — cioè per gli utenti il cui profilo
non è stato arricchito da `fetchCurrentUser` (vedi [03](./03-autenticazione-ruoli-e-sessione.md)).
Per un paziente il termine risulta impreciso.

### Hero

- Overline: `'Mobilitas Academy'` (`fontSize: 11`, `fontWeight: '700'`, `textTransform: 'uppercase'`,
  `letterSpacing: 1.2`, `opacity: 0.9`)
- Titolo: `'Ciao {firstName}'` (`fontSize: 28`, `fontWeight: '800'`, colore `secondary`)
- Sottotitolo: `'Questa pagina ti guida tra tutte le azioni disponibili: {coursesLabel}, visite,
  sessioni, profilo e gestione acquisti.'`

Il sottotitolo elenca *"gestione acquisti"*, disponibile solo agli operatori: per un paziente
mobile-only la frase promette una funzione inaccessibile.

- Badge: `grid-outline` 14 + `'Panoramica'`
- Divider: `sparkles-outline` 15

### Azioni rapide

Tre `Pressable` in una griglia, sotto il titolo `'Azioni rapide'`:

| Titolo | Icona | Hint | Destinazione |
|---|---|---|---|
| `'Visite'` | `calendar-outline` 24 | `'Agenda, slot giornalieri e acquisti collegati.'` | `StudioVisits` |
| `'Corsi'` | `library-outline` 24 | dipende dal ruolo (vedi sotto) | `Courses` |
| `'Sessioni'` | `SpineIcon` 22 | `'Calendario posturali e prenotazioni attive.'` | `Sessioni` |

Hint della card Corsi:
- Gestionale: `'Riprendi la formazione interna e guarda i video.'`
- Mobile-only: `'Riprendi i corsi posturali e guarda i video.'`

Entrambi usano il verbo *"Riprendi"*, che implica un progresso salvato inesistente
(vedi [09 §9.11](./09-modulo-corsi-e-video.md)).

Navigazione: `navigation.navigate('Courses' as never)`. Il cast `as never` è un workaround per la
mancanza di tipizzazione del `Tab` navigator: `useNavigation()` è invocato senza parametro generico,
quindi TypeScript non conosce i nomi delle route. Vedi
[15 — Debito tecnico](./15-debito-tecnico-e-anomalie.md).

Stile card: `quickCardPressed` applicato tramite la funzione di stile di `Pressable`,
`quickIconWrap` come contenitore circolare dell'icona.

### Novità operative

Titolo con `marginTop: 48`, seguito da una card con cinque righe, ciascuna con icona
`checkmark-circle` 18:

1. `'Prenotazione su giorno singolo con disponibilità chiare.'`
2. `'Acquisti paziente: selezione prenotabili e creazione rapida dal form visita.'`
3. `'Nuovo acquisto con servizio attivo, metodo pagamento, sconto e note.'`
4. `'Menu a tendina ottimizzati con riquadri per migliorare leggibilità.'`
5. `'Sezione Sessioni: calendario posturali in presenza, prenotazione rapida e gestione prenotazioni.'`

**Questa sezione è un changelog hardcoded**, non filtrato per ruolo: un paziente vede annunci su
acquisti e form visita che non può usare. I punti 2, 3 e 4 descrivono funzioni esclusivamente
operatore.

### Footer

Icona `information-circle-outline` 18 + `'Vai su Visite e Sessioni per usare subito prenotazioni
studio, sessioni posturali e gestione acquisti.'`

### Layout

`ScrollView` con `contentContainerStyle`: `flexGrow: 1`, `paddingHorizontal: 20`, `paddingTop: 24`,
`gap: 14`, `paddingBottom: 28 + tabBarPad`.

---

## 10.3 `ProfileScreen`

La schermata più lunga dell'app per numero di righe (1239), quasi tutte dedicate a sei modali e a un
foglio di stili molto esteso.

### Stato — 13 variabili

| Variabile | Tipo | Scopo |
|---|---|---|
| `profile` | `StoredUserProfile \| null` | Dati mostrati |
| `syncing` | `boolean` | Spinner accanto al nome |
| `cleaning` | `boolean` | Pulizia cache in corso |
| `confirmLogoutVisible` | `boolean` | Modale logout |
| `isSigningOut` | `boolean` | Logout in corso |
| `confirmCleanVisible` | `boolean` | Modale conferma pulizia |
| `reviewModalVisible` | `boolean` | Modale recensioni |
| `reviewStudioListVisible` | `boolean` | Dropdown studi |
| `selectedReviewStudioId` | `number \| null` | Studio scelto |
| `reviewActionError` | `string \| null` | Errore apertura link |
| `openingReviewLink` | `boolean` | Apertura link in corso |
| `inactiveFeatureName` | `string \| null` | Nome della voce non attiva toccata |
| `cleanResultModal` | `{ title, message, isError } \| null` | Esito pulizia |
| `deleteAccountModalVisible` | `boolean` | Modale eliminazione account |

### Caricamento del profilo — pattern local-then-remote

```typescript
const loadProfile = useCallback(async () => {
  const local = await getStoredUserProfile();
  setProfile(local);
  setSyncing(true);
  try {
    const fresh = await fetchCurrentUser();
    setProfile(fresh);
  } catch {
    // token assente / rete: resta snapshot locale
  } finally {
    setSyncing(false);
  }
}, []);

useFocusEffect(useCallback(() => { loadProfile(); }, [loadProfile]));
```

Mostra immediatamente lo snapshot da `AsyncStorage`, poi tenta l'aggiornamento da
`GET /api/auth/me`. Se la rete manca, l'utente continua a vedere i dati locali senza alcun errore.
`fetchCurrentUser` riscrive anche lo snapshot persistito.

`useFocusEffect` fa ripartire il ciclo ad ogni focus della tab.

Nota: `ProfileScreen` legge il profilo con il proprio stato locale invece di usare
`userProfile` dall'`AuthContext`, che contiene già lo stesso dato. Il risultato è che dopo un refresh
qui il context può restare disallineato fino al prossimo avvio.

### Dati visualizzati

**Iniziali dell'avatar** (`initialsFromProfile`):
1. Se `nome` e `cognome` sono entrambi presenti: prima lettera di ciascuno, maiuscole.
2. Altrimenti, dalla parte locale dell'email: rimuove i caratteri non alfanumerici
   (`/[^a-z0-9]/gi`) e prende i primi 2 caratteri; se ne restano meno di 2, prende i primi 2 della
   parte locale grezza.
3. Fallback finale: `'?'`.

**Nome visualizzato**: `nome cognome` → `username` → parte locale dell'email → `'Utente'`.

**Email**: `profile?.email || '—'`.

**Ruoli**: `profile.ruoli.map(r => r.replace(/^ROLE_/, '')).join(', ')` o `'—'`. Il prefisso
`ROLE_` viene rimosso per la sola visualizzazione, con la stringa mostrata così com'è (es.
`'PAZIENTE, MOBILE_ONLY'`) — senza normalizzazione degli underscore.

### Statistiche — valori inventati

```117:120:src/screens/ProfileScreen.tsx
  const stats = [
    { key: 'completed', value: '2', label: 'Corsi completati', icon: 'checkmark-done-circle-outline' as const },
    { key: 'ongoing', value: '6', label: 'In corso', icon: 'play-circle-outline' as const },
    { key: 'progress', value: '53%', label: 'Progresso', icon: 'trending-up-outline' as const },
  ];
```

**`2`, `6` e `53%` sono stringhe letterali hardcoded**, identiche per ogni utente e non collegate ad
alcun dato. Ogni utente vede "2 corsi completati" e "53% di progresso" indipendentemente da quanto ha
guardato. È il caso più visibile di dato fittizio mostrato in produzione, e va rimosso o collegato a
un vero tracciamento del progresso.

### Sezioni del menu

**`Impostazioni`** — quattro voci, tutte inattive:
`'Modifica Profilo'` (`person-circle-outline`), `'Notifiche'` (`notifications-outline`),
`'Privacy'` (`shield-checkmark-outline`), `'Aiuto e Supporto'` (`help-buoy-outline`).

**`Recensioni`** — una voce attiva: `'Scrivi una recensione'` (`star-outline` 22, colore `accent`)
con sottotitolo `'Lascia una recensione Google per lo studio che preferisci.'`

**`Sessione e dati`** — tre voci attive:
- `'Pulisci cache e aggiorna'` (`refresh-circle-outline`) — `'Risolve piccoli problemi e ricarica i
  contenuti dell'app.'`
- `'Logout'` (`log-out-outline`, colore `error`) — `'Disconnetti e torna alla schermata di accesso'`
- `'Elimina account'` (`trash-outline`, colore `error`) — `'Richiedi la cancellazione definitiva
  tramite la segreteria.'`

**`Account`** — due voci, entrambe inattive: `'Cambia Password'` (`key-outline`),
`'Esporta Dati'` (`download-outline`).

Totale: **sei voci su undici non fanno nulla** oltre ad aprire la modale "non disponibile". Tutte
mostrano un chevron identico a quello delle voci funzionanti, senza distinzione visiva.

### Modale "funzionalità non attiva"

Aperta da `setInactiveFeatureName(nome)`. Titolo dinamico: `'{inactiveFeatureName} non disponibile'`.
Testo: `'Al momento questa funzionalita non e attiva in app. Per assistenza, contatta la segreteria.'`
— **senza accenti** su "funzionalità" e "è". Pulsante `'Ho capito'`.

### Flusso recensioni Google

Il flusso più elaborato della schermata: prova a preselezionare lo studio in cui lavora l'osteopata
di riferimento del paziente.

**Query (entrambe con `enabled` legato all'apertura della modale)**:

| Query key | Funzione | `enabled` |
|---|---|---|
| `['profile-review-studi']` | `fetchStudiAttivi` | `reviewModalVisible` |
| `['profile-review-osteopata-riferimento', pazienteId]` | `fetchOsteopataRiferimentoPaziente(pazienteId!)` | `reviewModalVisible && typeof pazienteId === 'number' && pazienteId > 0` |

Entrambe con `staleTime: 60_000`. Il caricamento lazy evita richieste inutili per gli utenti che non
aprono mai la modale.

**Effect di preselezione** (righe 169-200):

1. Esce se la modale è chiusa, se una selezione esiste già o se non ci sono studi.
2. Se `osteopataRiferimentoQuery.data?.id` non è un numero positivo → seleziona il primo studio.
3. Altrimenti, itera **sequenzialmente** sugli studi chiamando `fetchOsteopatiPerStudio(studio.id)`
   e si ferma al primo studio che contiene l'osteopata di riferimento.
4. Se nessuno corrisponde → primo studio.
5. Errori per singolo studio ignorati (`catch` vuoto, commento `'continua con gli altri studi
   disponibili'`); cleanup con flag `cancelled`.

Il loop è sequenziale con `await` dentro un `for`: con N studi può richiedere N round-trip. Con un
numero ridotto di studi è accettabile, ma `Promise.all` sarebbe stato più rapido.

**Apertura del link** (`handleOpenReviewLink`):

```typescript
const reviewLink = selectedReviewStudio.googleReviewLink?.trim() ?? '';
if (!reviewLink) throw new Error('Recensione non disponibile per questo studio');
if (!/^https?:\/\//i.test(reviewLink)) throw new Error('Link recensione non valido');
const canOpen = await Linking.canOpenURL(reviewLink);
if (!canOpen) throw new Error('Impossibile aprire il link recensione');
await Linking.openURL(reviewLink);
setReviewModalVisible(false);
```

Tre validazioni in cascata: presenza, schema `http(s)` (protegge da `javascript:` e schemi
arbitrari provenienti dal backend) e capacità del sistema di aprire l'URL. Gli errori finiscono in
`reviewActionError`, mostrato inline nella modale.

**UI della modale**: icona `star-outline` 20 in `accent`, titolo `'Scrivi una recensione'`, testo
`'Seleziona lo studio per cui vuoi lasciare una recensione Google.'`, un select custom
(`'Caricamento studi...'` / nome studio / `'Seleziona studio'`) con chevron che si inverte, la lista
delle opzioni con evidenziazione della selezione, e i pulsanti `'Annulla'` / `'Scrivi recensione'`
(disabilitato se nessuno studio è selezionato).

Un `useFocusEffect` con solo funzione di cleanup chiude modale e dropdown quando la schermata perde
il focus (righe 160-167): evita di ritrovare una modale aperta rientrando nella tab.

### Pulizia cache

Conferma → `cleanAndRefreshCaches(queryClient)` → `loadProfile()` → modale di esito.

Testo della conferma: `'Verranno svuotate la cache dei dati, il token YouTube locale e la cache delle
durate video. La sessione Mobilitas resta attiva.'`

Il riferimento al *"token YouTube locale"* è un residuo dell'integrazione YouTube legacy: la chiave
viene effettivamente rimossa da `cleanAndRefreshCaches`, ma non è più prodotta da nessuna parte.

Esito positivo: titolo `'Cache pulita'`, messaggio `'Riapri una sezione per ricaricare i contenuti.'`
Esito negativo: titolo `'Errore'` con il messaggio dell'eccezione. La modale di esito cambia icona e
colore in base a `isError` (`alert-circle-outline` / `checkmark-circle-outline`).

Dettagli in [13 — Stato, cache e storage](./13-stato-cache-e-storage.md).

### Logout

Conferma con titolo `'Conferma logout'` e testo `'Vuoi uscire e terminare la sessione su questo
dispositivo?'`, pulsanti `'Annulla'` / `'Esci'` (variante `modalDangerBtn`).

```typescript
const confirmLogout = async () => {
  setIsSigningOut(true);
  try {
    await signOut();
    setProfile(null);
    setConfirmLogoutVisible(false);
  } finally {
    setIsSigningOut(false);
  }
};
```

`signOut()` non ha `catch`: `AuthContext.signOut` non rilancia mai (vedi
[03](./03-autenticazione-ruoli-e-sessione.md)), quindi il `try/finally` senza `catch` è coerente.

### Eliminazione account

Modale con icona `trash-outline` 20 in `error`, titolo `'Eliminazione definitiva account'` e testo:

> Per motivi di sicurezza e privacy, la cancellazione definitiva dell'account non può essere
> completata dall'app. Contatta la segreteria su WhatsApp: ti guideranno nella procedura.

Contiene uno `StudioWhatsAppSupportButton` con messaggio precompilato:

```typescript
const DELETE_ACCOUNT_WHATSAPP_PREFILL =
  'Buongiorno, vorrei richiedere la cancellazione definitiva del mio account Mobilitas Academy.';
```

La presenza di questo percorso è un requisito degli store (App Store e Google Play richiedono un
meccanismo di cancellazione account per le app con login). Delegare a WhatsApp è la soluzione minima
accettabile.

### Layout e stili

`ScrollView` con `contentContainerStyle`: `flexGrow: 1`, `paddingBottom: 36 + tabBarPad`.
Header con `paddingHorizontal: 20`, `paddingTop: 42`, `paddingBottom: 20`, titolo `'Profilo'` e
sottotitolo `'Gestisci il tuo account e le impostazioni'`, badge `sparkles-outline` +
`'Area personale'`.

Il divider di questa schermata usa una variante a tre elementi (`dividerLineLeft`,
`dividerLineRight`, `dividerIconWrap` con `dividerIconInner`), diversa dalla struttura a due linee
usata in Login, Home e Corsi. Stessa intenzione visiva, tre implementazioni distinte.

Tutte le sei modali condividono `modalBackdrop` / `modalCard` / `modalTitle` / `modalText` /
`modalPrimaryBtn` / `modalSecondaryBtn` / `modalDangerBtn` / `modalBtnPressed`, con varianti di
`modalIconWrap` (`Accent`, `Success`, `Error`). È un pattern coerente, ma reimplementato in ogni
schermata dell'app anziché estratto in un componente condiviso.

---

## 10.4 `StudioWhatsAppSupportButton`

Componente riutilizzato in tutta l'app per i percorsi di supporto.

```typescript
type Props = {
  prefilledMessage: string;
  style?: StyleProp<ViewStyle>;
};
```

Stato `busy: boolean`, che disabilita il pulsante e ne cambia l'etichetta durante l'apertura.

```typescript
const onPress = useCallback(async () => {
  setBusy(true);
  try {
    await openStudioWhatsApp({ message: prefilledMessage });
  } finally {
    setBusy(false);
  }
}, [prefilledMessage]);
```

`openStudioWhatsApp` non rilancia (gestisce internamente il fallback), quindi non serve un `catch`.

UI: `Pressable` con `minHeight: 44` (rispetta la dimensione minima di tocco raccomandata),
`borderRadius: 12`, `backgroundColor: '#25D366'` (verde ufficiale WhatsApp), icona `logo-whatsapp` 18
e testo `'Contatta la segreteria su WhatsApp'` / `'Apertura WhatsApp…'`.

Accessibilità: `accessibilityRole="button"` e
`accessibilityLabel="Apri WhatsApp per contattare la segreteria dello studio"`.

Usato in: `CorsiCatalogView`, `SessioniHomeScreen`, `SessioniCalendarioScreen`,
`SessioniPrenotazioniScreen`, `ProfileScreen`, e i corrispettivi del modulo Fitness.
Dettagli sull'utility in [12 — Integrazioni](./12-integrazioni-esterne.md).

---

## 10.5 `SplashScreen` — non raggiungibile

`src/components/SplashScreen.tsx` (529 righe) è una schermata di avvio animata molto elaborata:
gradiente `expo-linear-gradient`, cerchi concentrici che si espandono, logo in fade-in, tre puntini
verdi che compaiono in `Animated.stagger(150, ...)` e tre puntini di caricamento pulsanti in basso.
Usa 12 `Animated.Value` gestiti con `useRef` e una lunga `Animated.sequence`, con
`useNativeDriver: false` su tutte le animazioni (commentato come scelta per evitare conflitti tra
trasformazioni e opacità su immagini e testo).

Accetta una sola prop, `onFinish: () => void`, chiamata al termine della sequenza.

**Non è importata da nessun file.** L'avvio dell'app usa invece il gate in `App.tsx`, che durante
`isLoading` mostra un `ActivityIndicator` centrato, più la splash nativa configurata in `app.json`
(`expo-splash-screen`).

È il singolo blocco di codice morto più grande dell'app dopo il modulo Fitness: 529 righe di
animazioni mai eseguite. Va rimosso, oppure collegato al gate di `App.tsx` al posto dello spinner
nudo — che è l'opzione migliore dal punto di vista dell'esperienza d'uso, dato che il lavoro di
implementazione è già fatto.

---

## 10.6 Riepilogo delle criticità

| Punto | Impatto | File |
|---|---|---|
| Statistiche profilo hardcoded (`2`, `6`, `53%`) | Alto — dati falsi in produzione | `ProfileScreen.tsx:117-120` |
| Sei voci di menu non funzionanti | Medio — aspettative disattese | `ProfileScreen.tsx` |
| Link "Termini d'uso" punta alla privacy policy | Medio — conformità | `LoginScreen.tsx:191` |
| "Novità operative" non filtrate per ruolo | Medio — pazienti vedono funzioni operatore | `HomeScreen.tsx:88-118` |
| Fallback nome `'Professionista'` per i pazienti | Basso | `HomeScreen.tsx:18` |
| Testo modale senza accenti | Basso | `ProfileScreen.tsx:740-741` |
| Riferimento al "token YouTube" nel testo utente | Basso — residuo legacy | `ProfileScreen.tsx:596` |
| `ProfileScreen` non aggiorna `AuthContext` | Basso — possibile disallineamento | `ProfileScreen.tsx:70-82` |
| `SplashScreen` mai usata (529 righe) | Basso — codice morto | `components/SplashScreen.tsx` |
| Nessun toggle visibilità password | Basso — usabilità | `LoginScreen.tsx:131-140` |
