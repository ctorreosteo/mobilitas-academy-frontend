# 🔒 Setup Backend per App Pubblica

## Problema

Attualmente, le credenziali sensibili (Refresh Token e Client Secret) sono esposte nel bundle JavaScript dell'app perché usiamo `EXPO_PUBLIC_*` variabili.

**Per un'app pubblica**, questo è un rischio di sicurezza perché chiunque può decompilare l'app e vedere questi valori.

## Soluzione: Backend Server

Creiamo un backend server che:
- Gestisce il Refresh Token e Client Secret in modo sicuro (sul server)
- Espone un endpoint `/api/youtube/token` che restituisce un access token
- L'app chiama questo endpoint invece di gestire il refresh token direttamente

## Implementazione

### Opzione 1: Backend Node.js/Express (Consigliato)

Crea un nuovo progetto backend:

```bash
mkdir mobilitas-academy-backend
cd mobilitas-academy-backend
npm init -y
npm install express cors dotenv axios
```

**File: `server.js`**
```javascript
const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = process.env.YOUTUBE_REFRESH_TOKEN;

let cachedAccessToken = null;
let tokenExpiryTime = 0;

// Endpoint per ottenere access token
app.get('/api/youtube/token', async (req, res) => {
  try {
    // Se abbiamo un token valido in cache, usalo
    if (cachedAccessToken && Date.now() < tokenExpiryTime) {
      return res.json({ access_token: cachedAccessToken });
    }

    // Ottieni nuovo token dal refresh token
    const response = await axios.post('https://oauth2.googleapis.com/token', 
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const tokenData = response.data;
    
    if (tokenData.access_token) {
      // Cache il token (scade 5 minuti prima della scadenza reale)
      cachedAccessToken = tokenData.access_token;
      tokenExpiryTime = Date.now() + (tokenData.expires_in - 300) * 1000;
      
      res.json({ access_token: cachedAccessToken });
    } else {
      res.status(500).json({ error: 'Errore nell\'ottenere access token' });
    }
  } catch (error) {
    console.error('Errore refresh token:', error.response?.data || error.message);
    res.status(500).json({ 
      error: 'Errore nel refresh token',
      details: error.response?.data 
    });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend server running on port ${PORT}`);
});
```

**File: `.env`** (sul server, NON nel frontend!)
```bash
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here
YOUTUBE_REFRESH_TOKEN=your_refresh_token_here
PORT=3000
```

**File: `package.json`**
```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  }
}
```

### Opzione 2: Backend con Vercel/Netlify Functions

Se preferisci una soluzione serverless, puoi usare Vercel o Netlify Functions.

## Modifiche al Frontend

Modifica `src/services/youtubeTokenService.ts`:

```typescript
import axios from 'axios';

// URL del backend server (per produzione, usa la URL del tuo server)
const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'http://localhost:3000';

let cachedAccessToken: string | null = null;
let tokenExpiryTime: number = 0;

/**
 * Ottiene un access token dal backend server
 */
export async function getYouTubeAccessToken(): Promise<string | null> {
  // Se abbiamo un token valido in cache, usalo
  if (cachedAccessToken && Date.now() < tokenExpiryTime) {
    return cachedAccessToken;
  }

  try {
    const response = await axios.get(`${BACKEND_URL}/api/youtube/token`);
    
    if (response.data.access_token) {
      // Cache il token (scade 5 minuti prima della scadenza reale)
      cachedAccessToken = response.data.access_token;
      tokenExpiryTime = Date.now() + (3600 - 300) * 1000; // 1 ora - 5 min
      
      return cachedAccessToken;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Errore nel recupero access token dal backend:', error);
    return null;
  }
}
```

**File: `.env` (frontend)**
```bash
# Rimuovi queste variabili (non più necessarie):
# EXPO_PUBLIC_GOOGLE_CLIENT_ID
# EXPO_PUBLIC_GOOGLE_CLIENT_SECRET
# EXPO_PUBLIC_YOUTUBE_REFRESH_TOKEN

# Mantieni solo:
EXPO_PUBLIC_YOUTUBE_API_KEY=your_api_key
EXPO_PUBLIC_YOUTUBE_CHANNEL_ID=your_channel_id
EXPO_PUBLIC_BACKEND_URL=https://your-backend-url.com
```

## Deploy

### Backend su Heroku/Railway/Render:

1. Crea un account su una piattaforma di hosting
2. Collega il repository del backend
3. Aggiungi le variabili d'ambiente nel dashboard
4. Il backend sarà disponibile su `https://your-app.herokuapp.com`

### Frontend:

1. Rimuovi le variabili sensibili dal `.env`
2. Aggiungi `EXPO_PUBLIC_BACKEND_URL` con la URL del tuo backend
3. Pubblica l'app normalmente

## Sicurezza Aggiuntiva

Per maggiore sicurezza, puoi:
- Aggiungere autenticazione API key al backend
- Limitare le richieste per IP
- Usare rate limiting
- Aggiungere logging e monitoring

## Per App Interna del Team

Se l'app è **solo per uso interno del team** e non sarà pubblica, l'approccio attuale va bene (anche se non è best practice). Le credenziali saranno esposte, ma solo i membri del team avranno accesso all'app.


