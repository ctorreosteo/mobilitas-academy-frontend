# Font Configuration for iOS

Per utilizzare il font Montserrat su iOS, segui questi passaggi:

## 1. Scarica i font Montserrat
Scarica i file .ttf o .otf di Montserrat da Google Fonts:
- Montserrat-Light.ttf
- Montserrat-Regular.ttf  
- Montserrat-Medium.ttf
- Montserrat-SemiBold.ttf
- Montserrat-Bold.ttf

## 2. Aggiungi i font al progetto
1. Crea una cartella `assets/fonts/` nella root del progetto
2. Copia tutti i file .ttf nella cartella `assets/fonts/`

## 3. Configura app.json
Aggiungi questa configurazione al file `app.json`:

```json
{
  "expo": {
    "fonts": [
      "assets/fonts/Montserrat-Light.ttf",
      "assets/fonts/Montserrat-Regular.ttf",
      "assets/fonts/Montserrat-Medium.ttf", 
      "assets/fonts/Montserrat-SemiBold.ttf",
      "assets/fonts/Montserrat-Bold.ttf"
    ]
  }
}
```

## 4. Riavvia l'app
Dopo aver aggiunto i font, riavvia completamente l'app Expo.

## Nota
Attualmente l'app usa il font di sistema su iOS come fallback. Una volta configurati i font personalizzati, potrai rimuovere il fallback e usare direttamente Montserrat.
