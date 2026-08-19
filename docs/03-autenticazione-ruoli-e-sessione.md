# 03 — Autenticazione, ruoli e sessione

## 3.1 Panoramica

L'autenticazione è basata su **JWT bearer token** emesso dal backend Mobilitas. Non esistono
provider social attivi: il commit `9a41f4e "Login - eliminati altri metodi"` documenta la rimozione
di metodi alternativi. Non esiste registrazione in-app (viene rimandata alla segreteria).

Componenti coinvolti:

| File | Responsabilità |
|---|---|
| `src/services/authTokenStorage.ts` | Lettura/scrittura su AsyncStorage di token, profilo e preferenze |
| `src/services/authApi.ts` | Chiamate `/auth/*`, mapping DTO → profilo, predicati di ruolo |
| `src/api/index.ts` | Interceptor axios: iniezione bearer, refresh automatico su 401 |
| `src/context/AuthContext.tsx` | Stato di sessione React, idratazione, `signIn` / `signOut` |
| `src/screens/LoginScreen.tsx` | Form di accesso |
| `App.tsx` (`RootNavigator`) | Gate: boot spinner / Login / Main |

## 3.2 Persistenza su AsyncStorage

`src/services/authTokenStorage.ts:3-6` definisce quattro chiavi:

| Costante | Chiave letterale | Contenuto |
|---|---|---|
| `STORAGE_KEY` | `'@mobilitas_jwt'` | Il JWT in chiaro |
| `PROFILE_KEY` | `'@mobilitas_user_profile'` | `JSON.stringify(StoredUserProfile)` |
| `REMEMBER_USERNAME_KEY` | `'@mobilitas_remember_username_enabled'` | `'1'` oppure `'0'` |
| `LAST_USERNAME_KEY` | `'@mobilitas_last_login_username'` | Username/email trimmato |

**Nessun TTL**: i dati persistono fino a una `clear` esplicita.

**La password non viene mai persistita**, in nessuna forma. Il testo della checkbox in
`LoginScreen` lo dichiara all'utente:
`"Salva email o username per i prossimi accessi. La password non viene mai memorizzata sul dispositivo."`

### Nota di sicurezza

`AsyncStorage` su iOS è implementato su file nel container dell'app, su Android su
`SharedPreferences`. **Non è un keystore cifrato**: su device rootati o con jailbreak, o via backup
non cifrato, il JWT è estraibile in chiaro. Per un'app che tratta dati sanitari e di pagamento,
`expo-secure-store` (Keychain / EncryptedSharedPreferences) sarebbe l'archivio appropriato per il
token.

### API esportate

| Funzione | Firma | Comportamento |
|---|---|---|
| `getAuthToken` | `(): Promise<string \| null>` | `catch` → `null` |
| `setAuthToken` | `(token: string): Promise<void>` | |
| `clearAuthToken` | `(): Promise<void>` | |
| `setStoredUserProfile` | `(profile: StoredUserProfile): Promise<void>` | |
| `getStoredUserProfile` | `(): Promise<StoredUserProfile \| null>` | Parse fallito → `null` |
| `clearStoredUserProfile` | `(): Promise<void>` | |
| `clearAllAuth` | `(): Promise<void>` | Rimuove token **e** profilo |
| `setRememberUsernamePreference` | `(enabled: boolean, username?: string): Promise<void>` | Se `enabled && username?.trim()` salva `'1'` + username; altrimenti salva `'0'` e rimuove `LAST_USERNAME_KEY` |
| `getRememberUsernamePreference` | `(): Promise<boolean>` | Chiave assente → **`true`** (default opt-in) |
| `getRememberedLoginUsername` | `(): Promise<string \| null>` | |

Nota: `clearAllAuth` **non** cancella le preferenze di remember-username, per design: dopo il logout
l'username resta precompilato al successivo login.

## 3.3 Flusso di login

### Endpoint

`POST /api/auth/login` con body `{ username, password }`.

Il campo si chiama `username` ma accetta anche l'email: il placeholder del form è
`"Email o username"`.

Risposta: `ApiResponseDto<LoginResponseData>` dove

```typescript
interface LoginResponseData {
  token: string;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  pazienteId?: number | null;
}
```

`loginMobilitas` (`src/services/authApi.ts`) valida `data.success && data.data?.token`; in caso
contrario lancia `new Error(data.message || data.error || 'Login fallito')`. Su errore Axios con body
oggetto, propaga `body.message` o `body.error`.

### Sequenza completa in `AuthContext.signIn`

```95:125:src/context/AuthContext.tsx
  const signIn = useCallback(
    async (username: string, password: string, options?: SignInOptions) => {
      const session = await loginMobilitas(username.trim(), password);
      await persistLoginSession(session);
      setToken(session.token);
      try {
        const profile = await fetchCurrentUser();
        setUserProfile(profile);
      } catch (e) {
        if (isAxiosError(e) && e.response?.status === 401) {
          await logoutMobilitas();
          setToken(null);
          setUserProfile(null);
          const msg = /* ... e.response.data.message se stringa ... */ 'Sessione non valida';
          throw new Error(msg);
        }
        const fallback = await getStoredUserProfile();
        setUserProfile(fallback);
      }
      await setRememberUsernamePreference(!!options?.rememberUsername, username.trim());
      queryClient.invalidateQueries();
      prefetchSessioniPosturaliCatalog();
    },
    [queryClient]
  );
```

Passo per passo:

1. `loginMobilitas(username.trim(), password)` → sessione.
2. `persistLoginSession(session)` → scrive `@mobilitas_jwt` e `@mobilitas_user_profile`.
3. `setToken(session.token)` → `isSignedIn` diventa `true`; il `RootNavigator` monta già `Main`.
4. `fetchCurrentUser()` arricchisce il profilo (vedi 3.4).
   - Se questa chiamata fallisce con **401**: logout completo, stato azzerato, viene rilanciata
     un'eccezione con il messaggio del server o `'Sessione non valida'`. La `LoginScreen` la mostra
     inline.
   - Se fallisce con **qualunque altro errore** (es. rete): si accetta il profilo minimale salvato al
     punto 2 e si prosegue. L'utente entra nell'app con un profilo privo di `osteopataId`,
     `utenteId` e del dettaglio paziente.
5. `setRememberUsernamePreference(...)` secondo la checkbox.
6. `queryClient.invalidateQueries()` — invalida **tutte** le query, così i dati dell'utente
   precedente non vengono riutilizzati.
7. `prefetchSessioniPosturaliCatalog()` — fire-and-forget (non `await`), scalda catalogo e immagini
   di copertina.

**Conseguenza del punto 4b da tenere presente**: un errore di rete transitorio durante `/auth/me`
produce una sessione "degradata". Poiché `osteopataId` guida il comportamento di
`GestioneVisiteScreen` e `BookVisitScreen`, un operatore in quella condizione verrebbe trattato come
paziente. Non esiste un meccanismo di retry o di riconciliazione successiva del profilo, tranne il
`useFocusEffect` di `ProfileScreen` che richiama `fetchCurrentUser()`.

## 3.4 Arricchimento del profilo: `fetchCurrentUser`

`fetchCurrentUser()` esegue fino a **tre chiamate HTTP** in sequenza:

1. `GET /api/auth/me` → `UserInfoResponseDto`:

```typescript
interface UserInfoResponseDto {
  id: number;
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  attivo: boolean;
  osteopataId?: number | null;
  pazienteId?: number | null;
}
```

2. Se `me.osteopataId != null` → `GET /api/osteopati/{osteopataId}`.
   In caso di errore: `osteopata: null` (silenzioso, non blocca il login).

3. Se `hasPazienteRole(me.ruoli) && me.id > 0` → `GET /api/pazienti/by-utente/{me.id}`.
   In caso di errore o paziente assente: `pazienteId: null, paziente: null`.

Il risultato è un `StoredUserProfile` completo che viene salvato e messo in `userProfile` del
contesto:

```typescript
interface StoredUserProfile {
  username: string;
  nome: string;
  cognome: string;
  email: string;
  ruoli: string[];
  utenteId?: number;                          // ← me.id
  attivo?: boolean;
  osteopataId?: number | null;
  osteopata?: StoredOsteopataProfile | null;  // ← dettaglio da /osteopati/{id}
  pazienteId?: number | null;
  paziente?: StoredPazienteProfile | null;    // ← dettaglio da /pazienti/by-utente/{id}
}
```

Il dettaglio dei sotto-profili è in [05 — Modello dati](./05-modello-dati.md).

### Perché `utenteId` conta

`utenteId` (l'`id` dell'utente, distinto da `pazienteId` e `osteopataId`) è usato dal modulo Fitness
per filtrare le prenotazioni e per costruire il payload di prenotazione
(`{ utenteId, sessioneId }`). Il modulo Sessioni posturali **non** ne ha bisogno: il backend deriva
l'utente dal token e il payload è solo `{ sessioneId }`.

## 3.5 Iniezione del bearer token

`src/api/index.ts:60-69`: interceptor di request che su **ogni** chiamata legge il token da
AsyncStorage e, se presente, imposta `config.headers.Authorization = 'Bearer ' + token`.

Nota implementativa: la lettura è asincrona e avviene per ogni singola richiesta, quindi ogni
chiamata HTTP comporta un accesso a AsyncStorage. Non c'è cache in memoria del token nel layer axios.

## 3.6 Refresh automatico su 401

`src/api/index.ts:71-137`, interceptor di response. È il meccanismo di resilienza più importante
dell'app.

### Condizioni per tentare il refresh

Tutte devono essere vere:

1. `error.response?.status === 401`
2. `error.config` esiste
3. `error.config.__isRetry !== true` (evita loop infiniti)
4. L'URL della richiesta **non** contiene `'/auth/login'`, `'/auth/register'`, `'/auth/refresh'`

### Sequenza

1. Legge il token corrente. Se assente: `clearAllAuth()` e reject.
2. `POST {API_BASE_URL}/auth/refresh` con body `{}`, header
   `Authorization: Bearer <token attuale>` e `Content-Type: application/json`, `timeout: 15000`.
   **Usa `axios.post` diretto**, non `apiClient`, proprio per non ri-entrare negli interceptor.
3. Se `envelope.success !== true` o manca `data.token` → `throw new Error('refresh failed')`.
4. `setAuthToken(d.token)` — salva il nuovo token.
5. Se il payload di refresh contiene `username` **e** `email` non nulli, aggiorna il profilo salvato
   facendo un **merge conservativo**:

```110:126:src/api/index.ts
      const d = envelope.data;
      await setAuthToken(d.token);
      if (d.username != null && d.email != null) {
        const prev = await getStoredUserProfile();
        await setStoredUserProfile({
          username: d.username,
          nome: d.nome ?? '',
          cognome: d.cognome ?? '',
          email: d.email,
          ruoli: d.ruoli ?? [],
          pazienteId: d.pazienteId !== undefined ? d.pazienteId : prev?.pazienteId,
          utenteId: prev?.utenteId,
          attivo: prev?.attivo,
          osteopataId: prev?.osteopataId,
          osteopata: prev?.osteopata,
        });
      }
```

I campi che `/auth/refresh` non restituisce (`utenteId`, `attivo`, `osteopataId`, `osteopata`, e
`pazienteId` se `undefined`) vengono **preservati** dal profilo precedente. Il campo `paziente`
(dettaglio anagrafico) **non è nella lista** e viene quindi perso ad ogni refresh riuscito.

6. `original.__isRetry = true`, riscrive l'header `Authorization` con il nuovo token e ripete la
   richiesta con `apiClient.request(original)`.
7. Su qualunque eccezione nel blocco: `clearAllAuth()` e reject dell'errore originale.

### Conseguenza sullo stato React

`clearAllAuth()` svuota lo storage ma **non notifica `AuthContext`**: `token` e `userProfile` nello
stato React restano popolati. L'app continua a mostrare l'interfaccia autenticata, ma tutte le
chiamate successive partiranno senza header `Authorization` e falliranno con 401. L'utente vede
schermate in errore senza essere riportato al Login.

Il ritorno effettivo al Login avviene solo:

- al riavvio dell'app (l'idratazione non trova il token), oppure
- premendo `Logout` in `ProfileScreen`.

Un `onSessionExpired` callback che chiamasse `signOut()` dal contesto risolverebbe il problema.

## 3.7 Idratazione all'avvio

`src/context/AuthContext.tsx:52-93`, `useEffect` con dipendenze `[]`.

```
1. Promise.all([getAuthToken(), getStoredUserProfile()])
2. Se esiste storedToken:
     setToken(storedToken)          ← hydration ottimistica immediata
     setUserProfile(storedProfile)
3. Se NON esiste storedToken:
     setToken(null); setUserProfile(null); return
4. await restorePersistedSession()
5a. Se ok → rilegge token e profilo dallo storage, li imposta nello stato,
        e lancia prefetchSessioniPosturaliCatalog()
5b. Se non ok → setToken(null); setUserProfile(null)
6. finally: setHydrated(true)    ← isReady diventa true
```

Il commento nel codice spiega il punto 2:
`"Hydration immediata da storage: evita di mostrare il login a ogni riavvio."`

### `restorePersistedSession`

In `src/services/authApi.ts`:

- Nessun token → `false`.
- Chiama `GET /api/auth/me`. Se riesce, aggiorna il profilo e ritorna `true`.
- Se l'errore è **401** → `clearAllAuth()` e ritorna `false`.
- Se l'errore è **qualsiasi altro** (tipicamente assenza di rete) → ritorna **`true`**.

L'ultimo punto è la scelta progettuale che abilita l'**uso offline**: senza connessione l'utente
resta autenticato con l'ultimo profilo noto, invece di essere buttato fuori. Il costo è che un JWT
revocato lato server continua a essere considerato valido dall'app finché non si ottiene una
risposta 401 esplicita.

Un flag `cancelled` gestisce lo smontaggio del provider durante l'idratazione.

## 3.8 Logout

`src/context/AuthContext.tsx:127-133`:

```typescript
const signOut = useCallback(async () => {
  await logoutMobilitas();
  clearSessioniPosturaliCatalogCache();
  setToken(null);
  setUserProfile(null);
  queryClient.clear();
}, [queryClient]);
```

`logoutMobilitas()` in `src/services/authApi.ts`:

- `POST /api/auth/logout` con body `{}` — l'errore è **ignorato** con un `catch` vuoto.
- `finally { await clearAllAuth(); }` — la pulizia locale avviene **sempre**, anche se il server è
  irraggiungibile.

Cosa viene ripulito complessivamente:

| Elemento | Ripulito da |
|---|---|
| `@mobilitas_jwt` | `clearAllAuth` |
| `@mobilitas_user_profile` | `clearAllAuth` |
| Cache catalogo sessioni posturali (RAM) | `clearSessioniPosturaliCatalogCache` |
| Cache React Query | `queryClient.clear()` |
| Stato React `token` / `userProfile` | `setToken(null)` / `setUserProfile(null)` |

**Non** viene ripulito:

- `@mobilitas_remember_username_enabled` e `@mobilitas_last_login_username` — intenzionale.
- `@youtube_access_token` — resta nello storage. Viene rimosso solo da
  `cleanAndRefreshCaches` (`Profilo → Pulisci cache e aggiorna`).
- Cache catalogo **fitness** (`clearFitnessSessionCatalogCache` non è invocata al logout) — irrilevante
  in pratica, dato che il modulo non è raggiungibile.

Il pulsante di logout è in `ProfileScreen` con doppia conferma via modal
(`"Conferma logout"` / `"Vuoi uscire e terminare la sessione su questo dispositivo?"` /
pulsanti `"Annulla"` e `"Esci"`).

## 3.9 Contratto del contesto

```34:41:src/context/AuthContext.tsx
type AuthContextValue = {
  isReady: boolean;
  isSignedIn: boolean;
  /** Snapshot dopo login / restore / GET /auth/me (+ osteopata se applicabile). */
  userProfile: StoredUserProfile | null;
  signIn: (username: string, password: string, options?: SignInOptions) => Promise<void>;
  signOut: () => Promise<void>;
};
```

- `isReady` ← `hydrated`
- `isSignedIn` ← `!!token`
- `SignInOptions = { rememberUsername?: boolean }`

Il valore è memoizzato con `useMemo` su `[hydrated, token, userProfile, signIn, signOut]`.

`useAuth()` lancia `new Error('useAuth deve essere usato dentro AuthProvider')` se invocato fuori dal
provider.

### Consumatori di `useAuth()`

| File | Cosa usa | Perché |
|---|---|---|
| `App.tsx` (`RootNavigator`) | `isReady`, `isSignedIn` | Gate di navigazione |
| `src/screens/LoginScreen.tsx` | `signIn` | Submit del form |
| `src/screens/HomeScreen.tsx` | `userProfile` | Nome utente e label corsi per ruolo |
| `src/screens/ProfileScreen.tsx` | `signOut` | Logout |
| `src/screens/corsi/CorsiStack.tsx` | `userProfile` | Scelta del catalogo da montare |
| `src/hooks/useCorsiAziendali.ts` | `userProfile` | `enabled` della query |
| `src/screens/visite/VisiteMenuScreen.tsx` | `userProfile` | Visibilità della card pagamenti |
| `src/screens/FitnessScreen.tsx`, `FitnessSessionsCalendarScreen.tsx`, `FitnessBookingsScreen.tsx` | `userProfile.utenteId` | Filtro e payload prenotazioni fitness |

Il modulo **Visite** non usa `userProfile` dal contesto per le schermate operative: preferisce una
query React Query dedicata `['auth-me-profile']` con `queryFn: fetchCurrentUser` e
`staleTime: 60_000`, condivisa fra `BookVisitScreen`, `GestioneVisiteScreen` e
`PagamentiPazienteScreen`. Essendo la stessa chiave, la chiamata è deduplicata: si ottiene un
profilo sempre fresco senza chiamate ridondanti.

## 3.10 Matrice ruoli → funzionalità

Legenda dei discriminanti:

- **P** = `hasPazienteRole(ruoli)` — un ruolo contiene la stringa `PAZIENTE`
- **G** = `hasGestionaleRole(ruoli)` — esiste un ruolo fuori da `{ROLE_PAZIENTE, ROLE_UTENTE_MOBILE_APP, ROLE_ABBONATO_MOBILE_APP}`
- **O** = `profile.osteopataId > 0`

| Funzionalità | Condizione | File di riferimento |
|---|---|---|
| Tab bar completa (5 schede) | sempre | `App.tsx:154-211` |
| Catalogo **corsi aziendali** (`/api/formazione/corsi/accessibili`) | **G** | `src/screens/corsi/CorsiStack.tsx:40-45`, `src/hooks/useCorsiAziendali.ts` |
| Catalogo **corsi posturali** (`/api/corsi-posturali`) | **!G** | `src/screens/corsi/CorsiStack.tsx:46-51` |
| Label Home "corsi aziendali" vs "corsi posturali" | **G** | `src/screens/HomeScreen.tsx:20` |
| Card `"I tuoi pagamenti"` nel menu Visite | **P** | `src/screens/visite/VisiteMenuScreen.tsx:20` |
| Schermata `PagamentiPazienteScreen` accessibile | **P** + `pazienteId > 0` | `src/screens/visite/PagamentiPazienteScreen.tsx` |
| **Agenda giornaliera** (visite + eventi + assenze) | **O** | `src/screens/visite/GestioneVisiteScreen.tsx` |
| **Storico visite personali** | **!O** + `pazienteId > 0` | idem |
| Prenotazione **per un paziente** (ricerca + acquisti) | **O** | `src/screens/visite/BookVisitScreen.tsx` |
| Prenotazione **per sé** (auto-select studio/osteopata) | **!O** | idem |
| Sessioni posturali (calendario e prenotazioni) | sempre | `src/screens/sessioni/**` |
| Recensioni Google | sempre; auto-selezione studio se `pazienteId > 0` | `src/screens/ProfileScreen.tsx:169-200` |

### Casi limite del modello di ruoli

1. **Osteopata che è anche paziente**: `P && G && O` tutti veri. Vede il catalogo aziendale, la card
   pagamenti, l'agenda giornaliera e prenota per conto di pazienti. Il commento nel codice
   (`authApi.ts:90`) conferma l'intento: *"Un osteopata che è anche paziente resta gestionale."*

2. **Utente gestionale senza `osteopataId`** (es. segreteria): `G && !O`. In
   `GestioneVisiteScreen` scatta il controllo `osteopathMissingId` (ruolo con `OSTEOPATA` nel nome
   ma `osteopataId` assente), che mostra:
   `"Il tuo profilo ha ruolo osteopata ma manca osteopataId da GET /auth/me. Contatta l'amministratore."`
   Un messaggio con riferimenti tecnici espliciti mostrato all'utente finale.

3. **Paziente senza `pazienteId`**: `P && !pazienteId`. Non può vedere né visite né pagamenti. Le
   schermate mostrano un empty state con pulsante WhatsApp verso la segreteria e messaggio
   precompilato. È il caso di un utente registrato ma non ancora collegato all'anagrafica paziente.

4. **`hasPazienteRole` è una substring match**: un ipotetico ruolo `ROLE_GESTIONE_PAZIENTI`
   risulterebbe `true`, abilitando erroneamente la sezione pagamenti. Il rischio è mitigato dal fatto
   che le query sono ulteriormente condizionate a `pazienteId > 0`.

5. **`hasGestionaleRole` è a lista di esclusione**: qualunque nuovo ruolo introdotto lato backend
   (es. `ROLE_TRIAL_MOBILE`) sarà considerato **gestionale** per default, esponendo il catalogo di
   formazione interna e generando 403 dal backend. La lista `MOBILE_ONLY_ROLES` va tenuta
   sincronizzata con il backend a ogni nuovo ruolo mobile.

## 3.11 `LoginScreen` in dettaglio

Vedi anche [10 — Login, Home e Profilo](./10-login-home-profilo.md).

### Stato

| Variabile | Tipo | Iniziale |
|---|---|---|
| `username` | `string` | `''` |
| `password` | `string` | `''` |
| `rememberUsername` | `boolean` | `true` |
| `submitting` | `boolean` | `false` |
| `error` | `string \| null` | `null` |
| `showRegisterModal` | `boolean` | `false` |

### Precompilazione al mount

`Promise.all([getRememberUsernamePreference(), getRememberedLoginUsername()])`. Se la preferenza è
attiva e l'username salvato esiste, il campo viene precompilato.

### Validazione

Unica regola, in `onSubmit`:

```typescript
if (!username.trim() || !password) {
  setError('Inserisci username o email e password.');
  return;
}
```

Nessuna validazione di formato email, nessun requisito di lunghezza minima password, nessun
rate limiting o lockout lato client.

### Campi

| Campo | Placeholder | Proprietà |
|---|---|---|
| Username | `"Email o username"` | `autoCapitalize="none"`, `autoCorrect={false}`, `keyboardType="email-address"`, `textContentType="username"` |
| Password | `"••••••••"` | `secureTextEntry`, `textContentType="password"` |

Entrambi con `editable={!submitting}`.

`textContentType` abilita l'autofill del keychain iOS/Android.

### Gestione tastiera

`KeyboardAvoidingView` con `behavior: 'padding'` su iOS e `undefined` su Android (dove basta
`windowSoftInputMode="adjustResize"` del manifest), più `keyboardShouldPersistTaps="handled"` sullo
ScrollView.

### Testi rilevanti

| Elemento | Testo |
|---|---|
| Titolo | `"Benvenuto in Mobilitas"` |
| Sottotitolo | `"Accedi al tuo account Mobilitas HQ"` |
| Badge | `"Area accesso"` |
| Pulsante primario | `"Accedi"` (sostituito da `ActivityIndicator` durante `submitting`) |
| Link password | `"Password dimenticata?"` |
| Alert password | Titolo `"Password dimenticata?"`, messaggio `"Contatta l'amministratore di Mobilitas HQ per reimpostare l'accesso."` |
| Footer | `"Non hai un account? "` + `"Registrati"` |
| Modal registrazione | Titolo `"Registrazione"`, testo `"La registrazione deve essere effettuata presso la segreteria dello studio o chiamando."`, pulsante `"Ho capito"` |
| Testo legale | `"Cliccando su Accedi, accetti i nostri "` + link `"Termini d'uso"` |

Il link "Termini d'uso" apre
`https://www.studiomobilitas.it/privacy-policy-applicazione` — l'etichetta parla di termini d'uso ma
l'URL punta alla privacy policy.

## 3.12 Diagnostica di login

`authApi.ts` contiene logging esteso con prefisso `'[LOGIN]'`, incluse due utility di supporto:

- `maskSecret(value, keep = 4)`: restituisce `'<empty>'` per valori vuoti, `'*'.repeat(len)` se il
  valore è corto, altrimenti `'abcd…wxyz (len=N)'`.
- `headersToPlain(headers)`: normalizza gli header axios in oggetto piatto per il log.

Il logging è **sempre attivo**, non condizionato a `__DEV__`. In una build di produzione questi log
finiscono nella console di sistema (visibile con Console.app o `adb logcat`). Non contengono la
password in chiaro grazie a `maskSecret`, ma espongono username, header e struttura delle risposte.
Sarebbe opportuno racchiuderli in `if (__DEV__)`.
