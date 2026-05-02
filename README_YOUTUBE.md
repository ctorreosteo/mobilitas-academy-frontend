# 🔧 Troubleshooting YouTube Integration

## Problema: Video non vengono caricati

### 1. Verifica API Key

**Crea file `.env` nella root del progetto:**
```bash
EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSyAjwyOg90C7ULFMM_DwiT1dL7dGTdf48Ok
```

**Riavvia il server Expo:**
```bash
# Stop server (Ctrl+C)
npm start
```

### 2. Verifica API Key valida

- Vai su https://console.cloud.google.com/
- Verifica che la chiave sia attiva
- Verifica che "YouTube Data API v3" sia abilitata
- Controlla la quota giornaliera (10,000 unità/giorno)

### 3. Verifica ID Playlist

I capitoli (`Chapter`) e gli ID playlist YouTube arrivano dai dati caricati in app (es. API formazione / Cloudflare), tramite il campo `youtubePlaylistId` quando previsto dal flusso.

### 4. Controlla i log della console

Apri la console del browser/device e cerca:
- `🔄 Caricamento playlist YouTube:` - Playlist in caricamento
- `✅ Recuperati X video` - Video caricati con successo
- `❌ Errore` - Errore durante il caricamento

### 5. Errori comuni

**Errore 403 (Forbidden):**
- API key non valida
- Quota giornaliera superata
- YouTube Data API v3 non abilitata

**Errore 404 (Not Found):**
- ID playlist errato
- Playlist non esiste o privata

**Nessun video trovato:**
- Playlist vuota
- Video privati/non accessibili
- API key senza permessi

### 6. Test rapido

Apri la console del browser e esegui:
```javascript
console.log('API Key:', process.env.EXPO_PUBLIC_YOUTUBE_API_KEY);
```

Se è `undefined`, la variabile d'ambiente non è caricata correttamente.

### 7. Includere playlist "non in elenco" (unlisted)

Le playlist unlisted non vengono recuperate automaticamente dall'API. Per includerle, aggiungi gli ID delle playlist nel file `.env`:

```bash
EXPO_PUBLIC_YOUTUBE_UNLISTED_PLAYLISTS=PLxxxxx1,PLxxxxx2,PLxxxxx3
```

**Come trovare l'ID di una playlist unlisted:**
- Apri la playlist su YouTube
- L'URL è: `https://www.youtube.com/playlist?list=PLxxxxx`
- L'ID è la parte dopo `list=` (es. `PLxxxxx`)

**Esempio completo nel file `.env`:**
```bash
EXPO_PUBLIC_YOUTUBE_API_KEY=AIzaSy...
EXPO_PUBLIC_YOUTUBE_CHANNEL_ID=UC...
EXPO_PUBLIC_YOUTUBE_UNLISTED_PLAYLISTS=PLOdEzl1B0okFAZSC00pvqFgYk-ieRnDYc,PLxxxxx2
```

### 8. Soluzione rapida

Se continui ad avere problemi, verifica:
1. ✅ File `.env` esiste nella root
2. ✅ Variabile `EXPO_PUBLIC_YOUTUBE_API_KEY` è presente
3. ✅ Server Expo riavviato dopo creazione `.env`
4. ✅ API key è valida su Google Cloud Console
5. ✅ YouTube Data API v3 è abilitata

