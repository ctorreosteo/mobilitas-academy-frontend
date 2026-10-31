# 17 — Aggiornamenti dopo agosto 2026

Copre le modifiche dal commit `22db5e9` (19/08/2026) a `36cec9c` (12/10/2026), versione app `2.0.4`.
Dove contrasta con i capitoli 01–16, vale questo capitolo.

## Identità del progetto

| Elemento | Valore | Modificabile? |
|---|---|---|
| Nome progetto (`package.json`) | `mobilitas-mobile-app` | Sì |
| Nome visibile dell'app | `Mobilitas` | Sì |
| Bundle ID iOS e package Android | `com.mobilitas.academy` | No: identifica l'app sugli store |
| Slug Expo e scheme | `mobilitas-academy` | No: lo scheme è un prefisso dei deep link |
| Progetto e target Xcode | `MobilitasAcademy` | Solo con una rinomina nativa dedicata |
| ID App Store | `6768769344` | No |

## Avvio e navigazione

Gerarchia in `App.tsx`:

```
ErrorBoundary > SafeAreaProvider > QueryClientProvider > ForceUpdateGate > AuthProvider > RootNavigator
```

| Stack radice | Quando è disponibile |
|---|---|
| `Login`, `PasswordDimenticata` | Utente non autenticato |
| `Main` | Utente autenticato |
| `ImpostaPassword` | Sempre, per aprire i link anche con una sessione attiva |

Il tab `Profile` ora monta `ProfiloStack` (`ProfiloHome`, `CambioPassword`). I tipi delle route sono centralizzati in `src/navigation/types.ts`.
`navigationRef` consente di navigare da fuori dalle schermate.

## Aggiornamento obbligatorio

[ForceUpdateGate.tsx](../src/components/ForceUpdateGate.tsx) e [appUpdateService.ts](../src/services/appUpdateService.ts) bloccano l'app se è disponibile una versione più recente sullo store. Il controllo parte all'avvio e a ogni ritorno in primo piano.

- **iOS:** confronta la versione installata con quella dell'iTunes Lookup API.
- **Android:** usa Play In-App Updates tramite `expo-in-app-updates`, escluso dall'autolinking iOS in `package.json`.
- **Se il controllo fallisce:** l'app si apre comunque. Vale per errori di rete, build di sviluppo e web.

Ogni nuova versione pubblicata blocca quindi tutti gli utenti con la versione precedente, finché non aggiornano.

## Deep link

Configurazione in [linking.ts](../src/navigation/linking.ts).

| Elemento | Valore |
|---|---|
| Prefissi | `mobilitas-academy://`, `https://app.studiomobilitas.it` |
| Path | `login`, `password-dimenticata`, `imposta-password?token=…` |
| Android App Links (`app.json`) | Solo `/imposta-password` |
| iOS Associated Domains (`app.json`) | `applinks` e `webcredentials` su `app.studiomobilitas.it` |

L'app ignora ogni link che non riguarda questi path. Il token arriva già decodificato e va inoltrato al backend senza codificarlo di nuovo.
La verifica dei link universali richiede anche i file di associazione sul dominio, che non sono in questo repository.

## Password

Lunghezza minima: 8 caratteri (`MIN_PASSWORD_LENGTH`).

| Flusso | Schermata | Endpoint |
|---|---|---|
| Richiesta di reset | `PasswordDimenticataScreen` | `POST /auth/reset-password/richiedi` |
| Reset da link | `ImpostaPasswordScreen` | `GET /auth/reset-password/verifica`, `POST /auth/reset-password` |
| Primo accesso da invito | `ImpostaPasswordScreen` | `GET /auth/applicazione/verifica`, `POST /auth/applicazione/imposta-password` |
| Cambio da profilo | `CambioPasswordScreen` | `POST /auth/change-password`, poi `POST /auth/refresh` |

**Riconoscimento del link.** `ImpostaPasswordScreen` prova prima il token come reset. Se il risultato è `NON_TROVATO`, lo prova come invito. Se la rete non risponde mostra comunque il modulo, e l'esito si vede all'invio.

**Accesso automatico.** Se la verifica ha restituito l'email, dopo il salvataggio l'app esegue subito il login. Altrimenti mostra una conferma e rimanda all'accesso manuale.

**Errori.** Il cambio password usa i codici in `error` dell'envelope (`PASSWORD_ATTUALE_ERRATA`, `PASSWORD_NON_COINCIDONO`, `PASSWORD_TROPPO_CORTA`, `PASSWORD_UGUALE_ALLA_PRECEDENTE`, `NUOVA_PASSWORD_OBBLIGATORIA`) e con questi evidenzia il campo giusto. I flussi pubblici si basano sullo status HTTP: `400` non valido, `409` già usato, `410` scaduto.

**Limiti lato app** ([useCooldown.ts](../src/hooks/useCooldown.ts)), introdotti perché il backend non ha rate limiting su questi endpoint:

| Azione | Limite |
|---|---|
| Login | Blocco di 60 s dopo 5 tentativi falliti |
| Cambio password | Blocco di 60 s dopo 5 tentativi falliti |
| Richiesta di reset | 60 s tra una richiesta e l'altra |

### Password scaduta

Riguarda solo gli account misti con un ruolo gestionale. Per i pazienti puri non scatta mai.

1. Il login segnala il cambio obbligatorio in `cambioPassword`, oppure un'API risponde `403` con `error: PASSWORD_SCADUTA`.
2. L'interceptor chiama `notifyPasswordExpired()` e `AuthContext` imposta `passwordExpired`. Non c'è alcun logout.
3. `RootNavigator` porta l'utente su `CambioPassword`, dove indietro e gesture sono disattivati.
4. Dopo il cambio, `clearPasswordExpired()` ripristina il normale funzionamento.

Durante il logout, `beginAuthTeardown()` impedisce all'interceptor di reintrodurre stato. Gli endpoint pubblici di autenticazione non ricevono l'header `Authorization`, così un token vecchio non causa un rifiuto.

## Visite

**Prenotazione.** Toccando "Prenota" su uno slot si apre `SlotConfirmModal`, poi `AddToCalendarModal`. `BookVisit` accetta `osteopataId` e `studioId` per precompilare il modulo.

**Disdetta.** In `GestioneVisiteScreen`, con `PUT /visite/{id}/disdetta`:

- Serve un preavviso di almeno 24 ore, senza contare le domeniche. Da sabato 18:00 a lunedì 18:00 sono 24 ore utili.
- Sotto le 24 ore, l'app invita a scrivere allo studio su WhatsApp.
- Dopo la disdetta propone "Riprenota visita" con osteopata e studio precompilati.
- La Home mostra la stessa politica: oltre il limite la visita viene contabilizzata come effettuata.

**Aggiunta al calendario** ([calendarEventService.ts](../src/services/calendarEventService.ts)): calendario del telefono con `expo-calendar`, Google Calendar via link web, oppure file `.ics` condiviso per le altre app. Senza `oraFine` dal backend, l'evento dura un'ora.

**Promemoria** ([visitRemindersService.ts](../src/services/visitRemindersService.ts), [useVisitReminders.ts](../src/hooks/useVisitReminders.ts)):

- Sono notifiche locali, programmate sul telefono 2 ore prima di ogni visita `PRENOTATA`. Non ci sono push dal backend.
- Si riallineano quando cambia l'elenco visite e l'app ricarica i dati a ogni ritorno in primo piano.
- Sono attive solo per i pazienti, non per gli osteopati, e al massimo per 50 visite.
- Il permesso viene chiesto solo se c'è almeno un promemoria da programmare.
- Il logout li cancella tutti.

## Gestione errori API

[apiEnvelope.ts](../src/utils/apiEnvelope.ts) legge l'envelope `{ success, message, data, error }`, anche quando il corpo arriva come stringa.
I rifiuti della catena di sicurezza non usano l'envelope: un `403` senza envelope significa sessione non valida, non permessi mancanti. Il markup HTML delle pagine d'errore non viene mai mostrato all'utente.

## Moduli nativi e build

**Moduli opzionali.** [optionalNativeModule.ts](../src/utils/optionalNativeModule.ts) carica un pacchetto solo se il suo modulo nativo è presente nella build. Serve a non far crashare build precedenti all'aggiunta del modulo. Vale per calendario, notifiche e aggiornamenti.

**`modules/autofill-commit`.** Modulo Expo locale, solo Android. Chiude la sessione di Autofill così il sistema propone di salvare la password. Su iOS non fa nulla.

**Patch.** `patches/` modifica `expo-constants`, `expo-modules-autolinking` ed `expo-modules-core` per trovare Node quando il daemon Gradle non ha il PATH di nvm o Homebrew. Il percorso viene letto da `NODE_BINARY` o da `node.executable` in `android/local.properties`. Se aggiorni queste dipendenze, rigenera le patch: i nomi dei file includono la versione.

**Nuove dipendenze:** `expo-application`, `expo-calendar`, `expo-in-app-updates`, `expo-notifications`, `patch-package`. Quelle con codice nativo richiedono una nuova build.

## Altre modifiche

- `VisitaMinimaleDto` ha nuovi campi: `oraFine`, `studioId`, `studioNome`, `studioIndirizzo`, `studioCitta`.
- Il login aggiunge il link di recupero password e il contatto WhatsApp per la registrazione.
- Il pulsante "Segna come completato" del player è nascosto da `SHOW_COMPLETION_BUTTON = false`.
- `AppDialog` è il pop-up in stile app per sostituire `Alert`. Oggi lo usa solo `GestioneVisiteScreen`.

## Debito tecnico aggiunto

| Problema | Dove |
|---|---|
| File generati versionati nonostante `.gitignore` | `modules/autofill-commit/android/build/` (102 file), `.expo/`, `.artifacts/`, `local.properties`, `android/gradle.properties`, `.DS_Store` |
| Credenziali di invio App Store ancora segnaposto | `eas.json` → `submit.production.ios` |
| Percorso `ios/Mobilitas.xcodeproj` superato da `ios/MobilitasAcademy.xcodeproj` | `DEPLOYMENT.md` |
| Versione `1.0.0` diversa dalla versione app `2.0.4` | `package.json` |
| `looksLikeMarkup` duplicata | `apiEnvelope.ts`, `apiErrorMessage.ts` |
| Limiti ai tentativi solo lato client | Vedi [Password](#password) |
