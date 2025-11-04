# 🔐 Configurazione OAuth 2.0 per YouTube

Per recuperare dinamicamente **tutte le playlist** (incluse quelle "non in elenco"/unlisted) dal tuo canale YouTube, devi configurare l'autenticazione OAuth 2.0.

## Perché OAuth?

L'API YouTube con solo API key può recuperare solo playlist **pubbliche**. Per accedere alle playlist **unlisted** (non in elenco), serve l'autenticazione OAuth 2.0 che ti permette di accedere al tuo account YouTube.

## Configurazione

### 1. Crea OAuth 2.0 Client ID su Google Cloud Console

1. Vai su [Google Cloud Console](https://console.cloud.google.com/)
2. Seleziona il tuo progetto (o creane uno nuovo)
3. Vai su **"APIs & Services" > "Credentials"**
4. Clicca **"Create Credentials" > "OAuth client ID"**
5. Se è la prima volta, configura il **OAuth consent screen**:
   - Tipo: **External** (per uso interno) o **Internal** (solo per organizzazioni Google Workspace)
   - App name: **Mobilitas Academy**
   - User support email: la tua email
   - Scopes: Aggiungi `https://www.googleapis.com/auth/youtube.readonly`
   - Test users: Aggiungi il tuo account email (se External)

6. Crea **OAuth client ID**:
   - Application type: **Web application** (per Expo)
   - Name: **Mobilitas Academy Web Client**
   - Authorized redirect URIs:
     - Per Expo Go: `https://auth.expo.io/@your-username/mobilitas-academy`
     - Per sviluppo: `exp://localhost:8081`
     - Per produzione: `mobilitas-academy://oauth`

7. Copia il **Client ID** generato

### 2. Configura il Client ID nell'app

Aggiungi nel file `.env`:

```bash
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

### 3. Configura app.json (se necessario)

Verifica che `app.json` abbia lo schema corretto:

```json
{
  "expo": {
    "scheme": "mobilitas-academy",
    ...
  }
}
```

### 4. Riavvia il server Expo

```bash
# Stop server (Ctrl+C)
npm start
```

## Come funziona

1. **Senza autenticazione**: L'app recupera solo playlist **pubbliche** usando l'API key
2. **Con autenticazione OAuth**: L'app recupera **TUTTE le playlist** (pubbliche + unlisted) del tuo account YouTube

## Uso nell'app

1. Apri la schermata **"Corsi"**
2. Clicca su **"Login YouTube"** in alto a destra
3. Autorizza l'app ad accedere al tuo account YouTube
4. Le playlist verranno caricate automaticamente, incluse quelle unlisted!

## Sicurezza

- Il token OAuth viene salvato in modo sicuro nell'app
- Puoi fare logout in qualsiasi momento
- Il token ha solo permessi di **lettura** (`youtube.readonly`)
- Non può modificare o eliminare contenuti

## Troubleshooting

### Errore: "Google Client ID non configurato"
- Verifica che `EXPO_PUBLIC_GOOGLE_CLIENT_ID` sia nel file `.env`
- Riavvia il server Expo

### Errore: "redirect_uri_mismatch"
- Verifica che il redirect URI nel Google Cloud Console corrisponda a quello generato dall'app
- Controlla la console per vedere quale redirect URI viene usato

### Autenticazione non funziona
- Verifica che YouTube Data API v3 sia abilitata nel progetto Google Cloud
- Controlla che lo scope `youtube.readonly` sia configurato correttamente
- Se usi "External" app, assicurati di essere nella lista dei test users

