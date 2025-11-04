# Setup YouTube Integration

## Configurazione API Key YouTube

Per utilizzare il recupero automatico dei video da playlist YouTube, devi configurare una API key.

### Passi:

1. **Vai a Google Cloud Console**
   - Visita: https://console.cloud.google.com/

2. **Crea un nuovo progetto** (o usa uno esistente)

3. **Abilita YouTube Data API v3**
   - Vai su "APIs & Services" > "Library"
   - Cerca "YouTube Data API v3"
   - Clicca su "Enable"

4. **Crea credenziali**
   - Vai su "APIs & Services" > "Credentials"
   - Clicca "Create Credentials" > "API Key"
   - Copia la chiave generata

5. **Configura la chiave nell'app**

   **Opzione A: Variabile d'ambiente (consigliata)**
   
   Crea un file `.env` nella root del progetto:
   ```
   EXPO_PUBLIC_YOUTUBE_API_KEY=your_api_key_here
   ```
   
   **Opzione B: Configurazione diretta**
   
   Modifica `src/services/youtubeService.ts`:
   ```typescript
   const YOUTUBE_API_KEY = 'your_api_key_here';
   ```

### Limiti API

- YouTube Data API v3 ha un limite di **10,000 unità/giorno** (quota gratuita)
- Ogni chiamata costa:
  - `playlistItems.list`: 1 unità
  - `videos.list`: 1 unità
  - `playlists.list`: 1 unità

### Uso

Una volta configurata l'API key, i video verranno recuperati automaticamente quando:
- Un capitolo ha un `youtubePlaylistId` configurato
- L'utente apre la pagina dei video del corso

### Esempio

Nel file `src/data/mockChapters.ts`:

```typescript
{
  id: 'ch9-1',
  title: 'Tunnel Carpale',
  order: 1,
  courseId: '9',
  youtubePlaylistId: 'PLOdEzl1B0okFAZSC00pvqFgYk-ieRnDYc',
}
```

Il sistema recupererà automaticamente tutti i video da questa playlist!

