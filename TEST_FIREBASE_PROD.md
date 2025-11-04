# 🧪 Testare Firebase Produzione in Locale

Per testare le funzioni Firebase deployate in produzione anche quando stai sviluppando in locale, ci sono due modi:

## Metodo 1: Flag Esplicito (Consigliato)

Aggiungi questa riga al file `.env`:

```bash
EXPO_PUBLIC_FIREBASE_USE_PRODUCTION=true
```

Quando questa variabile è `true`, l'app userà **sempre** l'URL di produzione (`EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL`) anche se stai in modalità sviluppo.

Per tornare a usare l'URL locale, rimuovi o commenta questa riga:
```bash
# EXPO_PUBLIC_FIREBASE_USE_PRODUCTION=true
```

## Metodo 2: Commentare URL Locale

Commenta temporaneamente l'URL locale nel `.env`:

```bash
# EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL_LOCAL=http://localhost:5001/mobilitas-academy-firebase/us-central1
EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL=https://us-central1-mobilitas-academy-firebase.cloudfunctions.net
```

Così l'app userà automaticamente l'URL di produzione come fallback.

## Verifica

Quando avvii l'app, nella console vedrai:

**Se usi il flag:**
```
🔥 Firebase Functions URL: https://us-central1-mobilitas-academy-firebase.cloudfunctions.net (PRODUZIONE (forzato))
```

**Se commenti l'URL locale:**
```
🔥 Firebase Functions URL: https://us-central1-mobilitas-academy-firebase.cloudfunctions.net (PRODUZIONE (fallback))
```

**Se usi l'URL locale:**
```
🔥 Firebase Functions URL: http://localhost:5001/mobilitas-academy-firebase/us-central1 (LOCALE)
```

## Quando Usare Cosa

- **URL Locale**: Quando stai sviluppando nuove funzioni o debuggando
- **URL Produzione**: Quando vuoi testare che le funzioni deployate funzionino correttamente

## Importante

- Dopo aver modificato il `.env`, **riavvia l'app Expo** (`npm start`)
- Le modifiche al `.env` non vengono caricate a caldo

