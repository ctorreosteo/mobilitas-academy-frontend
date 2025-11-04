# 🔧 Troubleshooting - Errori Comuni

## ❌ Network Error con Firebase Locale

### Problema
Vedi errori come:
```
ERROR  Errore nel recupero playlist canale da Firebase: [AxiosError: Network Error]
```

### Causa
Su **dispositivi reali** (iPhone/Android fisici), `localhost` non funziona perché si riferisce al dispositivo stesso, non al computer.

### Soluzione

#### 1. Trova il tuo IP locale

Quando avvii Expo, vedi nel terminale:
```
› Opening exp://192.168.1.54:8081 on iPhone Air
```

L'IP è `192.168.1.54` (il tuo sarà diverso).

#### 2. Aggiungi l'IP nel `.env`

Aggiungi questa riga al file `.env`:

```bash
EXPO_PUBLIC_FIREBASE_LOCAL_IP=192.168.1.54
```

(Sostituisci con il tuo IP!)

#### 3. Riavvia l'app

```bash
# Ferma l'app (Ctrl+C)
npm start
```

### Alternative

#### Opzione A: Usa il Simulatore iOS
Il simulatore iOS può usare `localhost` direttamente:
```bash
npx expo start --ios
```

#### Opzione B: Usa Firebase Produzione
Se vuoi testare le funzioni deployate, aggiungi:
```bash
EXPO_PUBLIC_FIREBASE_USE_PRODUCTION=true
```

## 📱 Dispositivi Reali vs Simulatori

| Ambiente | localhost funziona? | Cosa usare |
|----------|---------------------|------------|
| iOS Simulator | ✅ Sì | `localhost` va bene |
| Android Emulator | ✅ Sì | `localhost` va bene (o `10.0.2.2`) |
| Dispositivo Reale | ❌ No | Usa IP locale (es: `192.168.1.54`) |
| Web Browser | ✅ Sì | `localhost` va bene |

## 🔍 Come Verificare

1. Controlla i log: vedi `🔥 Firebase Functions URL: ...`
2. Se vedi `Network Error`, probabilmente serve l'IP locale
3. Se vedi `404` o `500`, il problema è diverso (configurazione Firebase)

## 💡 Tips

- **Per sviluppo rapido**: Usa il simulatore iOS/Android
- **Per test reali**: Usa l'IP locale o Firebase produzione
- **Per produzione**: Usa sempre `EXPO_PUBLIC_FIREBASE_FUNCTIONS_URL` (senza LOCAL)

