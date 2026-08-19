# Mobilitas Academy — Documentazione tecnica completa

Documentazione di riferimento dell'app mobile **Mobilitas Academy** (React Native + Expo).
Ogni affermazione in questi documenti è derivata dal codice sorgente presente nel repository e riporta,
dove utile, il riferimento `file:riga`.

- **Nome commerciale**: Mobilitas Academy
- **Nome pacchetto npm**: `studio-osteopatico-frontend` (`package.json:2`) — disallineato rispetto al brand
- **Bundle identifier**: `com.mobilitas.academy` (iOS e Android)
- **Versione applicativa**: `1.0.0` (`app.json`), `versionCode` Android `2`, `CFBundleVersion` iOS `2`
- **Lingua UI**: italiano (nessun sistema di i18n: tutte le stringhe sono hardcoded nei componenti)
- **Righe di codice sorgente**: 17.164 su 74 file in `src/`, di cui **4.111 non raggiungibili**
  (moduli e integrazioni dismesse, vedi [15](./15-debito-tecnico-e-anomalie.md))

---

## Indice dei documenti

| # | Documento | Contenuto |
|---|---|---|
| 01 | [Panoramica e architettura](./01-panoramica-e-architettura.md) | Cos'è l'app, domini funzionali, stack, architettura a livelli, struttura cartelle, bootstrap applicativo |
| 02 | [Configurazione, ambienti e build](./02-configurazione-ambiente-e-build.md) | Tutte le variabili `EXPO_PUBLIC_*`, risoluzione del backend per piattaforma, `app.json`, `eas.json`, config nativa iOS/Android, script npm |
| 03 | [Autenticazione, ruoli e sessione](./03-autenticazione-ruoli-e-sessione.md) | Login, JWT, refresh automatico, persistenza, `AuthContext`, matrice ruoli → funzionalità |
| 04 | [Catalogo API e layer servizi](./04-api-e-servizi.md) | Ogni endpoint chiamato dall'app: metodo, path, parametri, risposta, servizio chiamante |
| 05 | [Modello dati completo](./05-modello-dati.md) | Tutti i DTO e i tipi TypeScript, campo per campo |
| 06 | [Navigazione e mappa schermate](./06-navigazione-e-schermate.md) | Root stack, tab bar, 4 stack annidati, tutte le route e i parametri |
| 07 | [Modulo Visite](./07-modulo-visite.md) | Menu visite, prenotazione, agenda/storico, pagamenti e fatture, creazione acquisti |
| 08 | [Modulo Sessioni posturali e Fitness](./08-modulo-sessioni-e-fitness.md) | Calendario mensile, prenotazione, annullamento, differenze tra i due moduli |
| 09 | [Modulo Corsi e player video](./09-modulo-corsi-e-video.md) | Cataloghi formazione/posturale, moduli e lezioni, HLS Cloudflare, player `expo-av` |
| 10 | [Login, Home e Profilo](./10-login-home-profilo.md) | Schermata di accesso, hub iniziale, area personale con tutte le voci di menu |
| 11 | [Design system e UI](./11-design-system-e-ui.md) | Palette, tipografia, componenti riutilizzabili, pattern visivi ricorrenti |
| 12 | [Integrazioni esterne](./12-integrazioni-esterne.md) | YouTube Data API, Firebase Cloud Functions, Cloudflare Stream, WhatsApp, Fatture in Cloud |
| 13 | [Stato, cache e storage](./13-stato-cache-e-storage.md) | React Query, chiavi AsyncStorage, cache in-memory, prefetch, TTL |
| 14 | [Errori e messaggistica utente](./14-errori-e-messaggistica.md) | `getUserFacingApiErrorMessage`, tutti i messaggi utente, template WhatsApp |
| 15 | [Debito tecnico e anomalie](./15-debito-tecnico-e-anomalie.md) | Codice morto, funzionalità incomplete, rischi di sicurezza, incongruenze, piano di intervento in 5 fasi |
| 16 | [Glossario e mappa dei file](./16-glossario-e-mappa-file.md) | Terminologia di dominio, corrispondenze italiano/inglese, indice file → responsabilità, indice per compito |

### Da dove iniziare

- **Primo giorno sul progetto**: 01 → 16 (glossario e mappa file) → 06 (navigazione)
- **Devo mettere in piedi l'ambiente**: 02
- **Devo lavorare su una feature**: il documento del modulo (07, 08, 09 o 10) più 04 per gli endpoint
- **Devo capire un bug su dati che non si aggiornano**: 13
- **Devo fare pulizia o valutare priorità tecniche**: 15

---

## Sintesi in una pagina

**Mobilitas Academy** è l'app mobile di uno studio osteopatico di Torino. Serve due tipologie di
utenti dallo stesso binario di codice, differenziandosi a runtime in base ai ruoli restituiti da
`GET /api/auth/me`:

- **Pazienti / abbonati** (`ROLE_PAZIENTE`, `ROLE_UTENTE_MOBILE_APP`, `ROLE_ABBONATO_MOBILE_APP`):
  prenotano visite, si iscrivono alle sessioni posturali di gruppo, consultano lo storico dei propri
  pagamenti con download fattura, guardano i corsi posturali.
- **Personale dello studio** (qualunque altro ruolo, es. osteopati): consultano l'agenda giornaliera
  con visite/eventi/assenze, prenotano visite a nome di un paziente creando o collegando un acquisto,
  accedono al catalogo di formazione interna.

L'app è un client puro: **nessuna logica di business persistita lato dispositivo**, nessun database
locale. Tutto passa da un backend Spring su Cloud Run
(`https://mobilitas-backend-990845221858.europe-west8.run.app/api`) che risponde con un envelope
uniforme `{ success, message, data, error }`.

I video dei corsi sono ospitati su **Cloudflare Stream** e riprodotti via manifest HLS
(`https://<subdomain>/<uid>/manifest/video.m3u8`) con `expo-av`. Esiste anche un'integrazione
YouTube (Data API v3 + OAuth PKCE + Firebase Cloud Functions come proxy token) che al momento
**non è raggiungibile da nessuna schermata montata**: è codice legacy conservato nel repository.

### Le cinque schede della tab bar

| Tab | Label | Contenuto |
|---|---|---|
| `Home` | Home | Hub con scorciatoie e changelog operativo |
| `Courses` | Corsi | `CorsiStack` → catalogo aziendale **oppure** posturale in base al ruolo |
| `StudioVisits` | Visite | `VisiteStack` → menu, prenotazione, agenda/storico, pagamenti |
| `Sessioni` | Sessioni | `SessioniStack` → hub, prenotazioni attive, calendario |
| `Profile` | Profilo | Area personale, recensioni Google, pulizia cache, logout, eliminazione account |

---

## Note sulla lettura

- **Convenzione riferimenti**: `src/services/authApi.ts:75` indica file e riga.
- **Stringhe UI**: sono riportate tra apici e verbatim dal codice, comprese eventuali imprecisioni
  ortografiche presenti nei sorgenti (segnalate quando rilevanti).
- **Numeri**: timeout, TTL e dimensioni sono riportati con il valore esatto presente nel codice.
- Il file storico `DOCUMENTAZIONE_COMPLETA_APP.md` nella root del repository precede questa
  documentazione ed è parzialmente obsoleto (descrive il modulo Fitness come attivo in tab bar,
  situazione superata dal modulo Sessioni posturali). Questa cartella `docs/` è il riferimento
  autorevole.
