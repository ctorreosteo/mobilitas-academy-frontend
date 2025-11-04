# 🔐 Configurazione Refresh Token per YouTube

Per recuperare **automaticamente tutte le playlist** (incluse quelle "non in elenco"/unlisted) senza che gli utenti debbano fare login, devi configurare un **Refresh Token** nel file `.env`.

## Come funziona

1. Il refresh token viene salvato nel file `.env` (una volta sola)
2. L'app usa automaticamente il refresh token per ottenere access token quando necessario
3. Tutti gli utenti vedono tutte le playlist senza dover autenticarsi
4. Il token viene rinnovato automaticamente quando scade

## Setup (una volta sola)

### 1. Ottieni il Refresh Token

Devi ottenere il refresh token dal proprietario del canale YouTube. Ecco come:

#### Opzione A: Script Python (consigliato)

Crea un file `get_refresh_token.py`:

```python
from google_auth_oauthlib.flow import InstalledAppFlow
import json

SCOPES = ['https://www.googleapis.com/auth/youtube.readonly']

def get_refresh_token():
    flow = InstalledAppFlow.from_client_secrets_file(
        'client_secret.json',  # Scarica da Google Cloud Console
        SCOPES
    )
    creds = flow.run_local_server(port=0)
    
    print("\n✅ Refresh Token ottenuto:")
    print(creds.refresh_token)
    print("\nAggiungi questo al file .env come:")
    print(f"EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN={creds.refresh_token}")

if __name__ == '__main__':
    get_refresh_token()
```

**Passi:**
1. Installa: `pip install google-auth-oauthlib google-auth-httplib2`
2. Scarica `client_secret.json` da Google Cloud Console > Credentials > OAuth 2.0 Client ID > Download JSON
3. Esegui: `python get_refresh_token.py`
4. Autorizza l'app nel browser
5. Copia il refresh token mostrato

#### Opzione B: OAuth 2.0 Playground

1. Vai su https://developers.google.com/oauthplayground/
2. Clicca su "⚙️" (Settings) in alto a destra
3. Seleziona "Use your own OAuth credentials"
4. Inserisci il tuo Client ID e Client Secret
5. Nella lista a sinistra, cerca "YouTube Data API v3" e seleziona `https://www.googleapis.com/auth/youtube.readonly`
6. Clicca "Authorize APIs"
7. Autorizza l'app
8. Clicca "Exchange authorization code for tokens"
9. Copia il **Refresh token** (non l'access token!)

### 2. Configura nel file .env

Aggiungi queste variabili al file `.env`:

```bash
EXPO_PUBLIC_YOUTUBE_API_KEY=your_api_key
EXPO_PUBLIC_YOUTUBE_CHANNEL_ID=your_channel_id
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_client_id
EXPO_PUBLIC_GOOGLE_CLIENT_SECRET=your_client_secret
EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN=your_refresh_token_here
```

**⚠️ IMPORTANTE:**
- Il Client Secret deve essere segreto, ma in Expo è esposto come `EXPO_PUBLIC_*`
- Per sicurezza in produzione, considera di usare un backend proxy
- Per uso interno del team, questo approccio va bene

### 3. Riavvia il server Expo

```bash
# Stop server (Ctrl+C)
npm start
```

## Come funziona

1. **All'avvio**: L'app verifica se c'è un refresh token nel `.env`
2. **Quando necessario**: Se serve un access token, usa il refresh token per ottenerlo
3. **Auto-rinnovamento**: Il token viene cachato e rinnovato automaticamente quando scade
4. **Tutti gli utenti**: Tutti vedono le playlist unlisted senza login!

## Verifica

1. Apri la schermata "Corsi"
2. Dovresti vedere il badge: "✅ Tutte le playlist incluse (incluse unlisted)"
3. Le playlist unlisted dovrebbero apparire insieme a quelle pubbliche

## Troubleshooting

### Errore: "invalid_grant"
- Il refresh token potrebbe essere scaduto o revocato
- Ottieni un nuovo refresh token seguendo i passi sopra

### Errore: "invalid_client"
- Verifica che Client ID e Client Secret siano corretti nel `.env`
- Assicurati che siano nel formato corretto (senza spazi)

### Non vede le playlist unlisted
- Verifica che il refresh token sia configurato: `EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN`
- Controlla i log della console per vedere se il token viene ottenuto correttamente
- Verifica che lo scope `youtube.readonly` sia stato autorizzato

## Sicurezza

- Il refresh token è permanente (fino a quando non viene revocato)
- Non committare il file `.env` nel repository (è già in `.gitignore`)
- Per produzione, considera di usare un backend che gestisce l'autenticazione

