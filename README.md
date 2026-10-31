# mobilitas-mobile-app

App mobile iOS e Android di Studio Mobilitas. I pazienti prenotano visite e sessioni posturali, consultano pagamenti e fatture e guardano i corsi. Il personale dello studio gestisce agenda e prenotazioni e segue la formazione interna.

**Stack:** Expo SDK 54, React Native 0.81, React 19, TypeScript, React Navigation, TanStack Query. Il backend è un servizio Spring esterno a questo repository.

## Avvio rapido

```bash
npm install            # applica anche le patch in patches/
cp .env.example .env   # poi compila i valori
npm run ios            # oppure: npm run android
```

Con Android Studio, o se Gradle non trova Node, indica il percorso di Node in `android/local.properties`:

```properties
node.executable=/percorso/di/node
```

## Comandi

| Comando | Cosa fa |
|---|---|
| `npm start` | Avvia il server Expo |
| `npm run ios` / `npm run android` | Compila ed esegue l'app sul dispositivo o simulatore |
| `npm run ios:pod` | Installa i pod iOS |
| `npm run android:clean` | Pulisce la build Android |
| `npm run prebuild` | Rigenera `ios/` e `android/` da `app.json` |
| `npm run build:ios:preview` | Build iOS di prova con EAS |
| `npm run build:ios:production` / `npm run build:android:production` | Build di produzione con EAS |
| `npm run submit:ios` / `npm run submit:android` | Invia l'ultima build agli store |
| `npx tsc --noEmit` | Controllo dei tipi |

Il progetto non ha test automatici né lint.

## Struttura

```
App.tsx      Provider, navigazione radice e tab bar
src/         api, components, context, hooks, navigation, screens, services, theme, types, utils
modules/     Moduli nativi locali (autofill-commit)
patches/     Patch alle dipendenze, applicate da patch-package
ios/         Progetto nativo iOS
android/     Progetto nativo Android
scripts/     Script di manutenzione
docs/        Documentazione tecnica
```

## Documentazione

Si parte da [docs/README.md](docs/README.md), che contiene indice e sintesi. Le novità più recenti sono in [docs/17-aggiornamenti-post-agosto-2026.md](docs/17-aggiornamenti-post-agosto-2026.md).

Guide operative:

- [DEPLOYMENT.md](DEPLOYMENT.md): pubblicazione sugli store
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md): problemi comuni

## Identificativi da non rinominare

Il nome del progetto è `mobilitas-mobile-app`, ma questi valori restano `academy` di proposito. Cambiarli creerebbe un'app diversa sugli store o romperebbe i link già inviati.

| Valore | Dove |
|---|---|
| `com.mobilitas.academy` | Bundle ID iOS e package Android |
| `mobilitas-academy` | Slug Expo e scheme dei deep link |
| `MobilitasAcademy` | Target e progetto Xcode |
