# 07 — Modulo Visite

Il modulo più esteso dell'app: 4 schermate, 2 modal riutilizzabili, 1 file di utility di formattazione
per un totale di circa **3400 righe**. È anche l'unico modulo che usa React Query in modo sistematico.

File coinvolti:

| File | Righe | Ruolo |
|---|---|---|
| `src/screens/visite/VisiteStack.tsx` | 54 | Stack navigator |
| `src/screens/visite/types.ts` | 6 | `VisiteStackParamList` |
| `src/screens/visite/VisiteMenuScreen.tsx` | 187 | Hub del modulo |
| `src/screens/visite/BookVisitScreen.tsx` | 1446 | Prenotazione visita |
| `src/screens/visite/GestioneVisiteScreen.tsx` | 886 | Agenda operatore / storico paziente |
| `src/screens/visite/PagamentiPazienteScreen.tsx` | 513 | Storico pagamenti e fatture |
| `src/screens/visite/CreaAcquistoModal.tsx` | 603 | Creazione acquisto |
| `src/screens/visite/SelectModal.tsx` | 179 | Picker generico riutilizzabile |
| `src/screens/visite/visiteFormatting.ts` | 235 | 21 funzioni di formattazione e utility date |

---

## 7.1 `VisiteMenuScreen` — l'hub

### Stato

Nessuno. La schermata è puramente derivata:

```typescript
const tabBarPad = useTabBarBottomPadding();
const navigation = useNavigation<Nav>();
const { userProfile } = useAuth();
const showPagamenti = hasPazienteRole(userProfile?.ruoli);
```

### UI

`SafeAreaView` con `edges={['top','bottom','left','right']}`, `paddingBottom: 20 + tabBarPad`.

**Hero**:
- Titolo: `"Visite"` (`fontSize: 30`, `fontWeight: '800'`)
- Sottotitolo condizionale:
  - con `showPagamenti`: `"Consulta le visite, prenota un appuntamento o rivedi i pagamenti del tuo profilo."`
  - senza: `"Consulta le visite registrate oppure prenota un nuovo appuntamento in pochi passaggi."`
- Badge: `medkit-outline` + `"Area visite"`
- Divider: `calendar-outline`

**Tre card** (`borderRadius: 16`, `opacity: 0.88` quando premute):

| # | Icona | Titolo | Hint | Condizione |
|---|---|---|---|---|
| 1 | `list-outline` | `"Gestisci le tue visite"` | `"Agenda del giorno con visite, eventi e assenze, oppure lo storico delle tue visite."` | sempre |
| 2 | `calendar-outline` | `"Prenota una nuova visita"` | `"Scegli studio, osteopata e fascia oraria tra le disponibilità."` | sempre |
| 3 | `wallet-outline` | `"I tuoi pagamenti"` | `"Importo, stato, data e ora di ogni pagamento."` | `showPagamenti` |

Nessuno stato di loading o errore: la schermata non effettua chiamate HTTP.

---

## 7.2 `visiteFormatting.ts` — utility condivise

21 funzioni esportate. Sono la base di tutta la gestione temporale del modulo, quindi vale la pena
conoscerle in dettaglio.

### Costanti

```typescript
const HOUR_MS = 60 * 60 * 1000;   // 3600000
```

Locale usato in tutte le formattazioni: `'it-IT'`.

### Funzioni di data

| Funzione | Comportamento |
|---|---|
| `toYmd(iso)` | `iso.slice(0, 10)` — **usa la data UTC**, non locale |
| `toLocalYmd(date)` | `YYYY-MM-DD` costruito da `getFullYear/getMonth/getDate` — data **locale** |
| `addDays(date, n)` | Somma giorni |
| `addMonths(date, n)` | Somma mesi |

La coesistenza di `toYmd` (UTC) e `toLocalYmd` (locale) è una potenziale fonte di off-by-one:
per una data italiana in ora legale, un istante come `2026-08-18T23:30:00+02:00` ha
`toYmd() === '2026-08-18'` sull'ISO UTC `2026-08-18T21:30:00Z`, ma per uno slot che cade dopo la
mezzanotte UTC i due risultati divergono. Nel flusso attuale l'impatto è limitato perché gli slot
sono in orario di studio.

### `expandSlotToHourlyChunks(slot)` e `expandSlotsToHourly(slots)`

Suddivide uno slot di disponibilità in **segmenti di massimo un'ora**.

- Se le date non sono finite o `endMs <= startMs`, restituisce `[slot]` invariato.
- Se lo slot è più corto di un'ora, restituisce un solo segmento.
- Altrimenti genera N segmenti da 60 minuti (l'ultimo può essere più corto).

Serve a trasformare una fascia di disponibilità continua (es. 09:00–13:00) in slot prenotabili
discreti (09:00–10:00, 10:00–11:00, ...). **La durata di una visita è quindi implicitamente fissata a
un'ora dal client**, non negoziata con il backend.

### `groupSlotsByDay(slots)`

Ordina per `inizio` crescente e raggruppa per chiave `toISOString().slice(0,10)` (giorno UTC).
Alimenta le `sections` della `SectionList`.

### Formattazione orari

| Funzione | Output |
|---|---|
| `formatSlotLabel(inizio, fine)` | `"HH:mm – HH:mm"` (locale `it-IT`, `hour: '2-digit'`, `minute: '2-digit'`) |
| `formatDayTitle(isoDay)` | Parse con `isoDay + 'T12:00:00'`, poi weekday long + giorno + mese long + anno. Il `T12:00:00` è un trucco per evitare che il fuso orario sposti il giorno |
| `formatWeekdayLongIt(date)` | Giorno della settimana con prima lettera maiuscola |
| `formatWeekdayShortIt` | Alias di `formatWeekdayLongIt` — il nome è ingannevole |
| `formatOraDisplay(ora)` | Primi 5 caratteri se `length >= 5` (`"09:00:00"` → `"09:00"`) |
| `formatLocalDateTimeTime(v)` | Estrae l'orario da un `LocalDateTime` senza passare da `Date` |
| `formatLocalDateTimeDisplay(v)` | `"giorno · HH:mm"` |
| `formatTimelineFascia(item)` | Preferisce `oraInizio`/`oraFine`; per item multi-giorno include le date abbreviate |

Il pattern di `formatLocalDateTime*` — parsing manuale della stringa invece di `new Date()` — evita
la conversione di fuso: il backend invia `LocalDateTime` senza offset (es.
`"2026-08-18T09:00:00"`) e interpretarli come UTC sposterebbe l'orario di due ore in estate.

### Etichette

| Funzione | Comportamento |
|---|---|
| `osteopataLabel(o)` | Nome e cognome |
| `studioLabel(s)` | `"nome — indirizzo, citta, cap"` se i campi esistono, altrimenti solo `nome` |
| `tipoEventoLabel(t)` | Lookup in `TIPO_EVENTO_LABELS`; fallback `'Evento'` se nullo, altrimenti valore raw |
| `visitaStatusLabel(s)` | `NO_SHOW_NON_CONTA` → `'DISDETTA'`, `NO_SHOW_CONTA` → `'EFFETTUATA'`, altrimenti invariato |
| `formatPrezzoEUR(n)` | `toLocaleString('it-IT', { style: 'currency', currency: 'EUR' })` |

### `isOsteopataExcludedFromVisitBooking(o)`

```typescript
// esclude se nome o cognome (trim, lowercase) contiene 'ricciardi'
```

**Regola di business hardcoded su un cognome specifico.** Un osteopata con cognome contenente
"ricciardi" viene escluso dall'elenco dei prenotabili in `BookVisitScreen`, con un'eccezione: se è
l'osteopata attualmente loggato, resta selezionabile (può prenotare per sé).

È un caso di business rule non configurabile: un cambio di policy richiede una nuova release. La
soluzione naturale sarebbe un flag `prenotabileDaApp` sul `OsteopataDto`.

### `slotIsoToVisitaFields(inizioIso, fineIso)`

Converte due istanti ISO nei tre campi richiesti da `CreateVisitaRequestDto`:

```typescript
{ dataVisita: 'YYYY-MM-DD', oraInizio: 'HH:mm:ss', oraFine: 'HH:mm:ss' }
```

La conversione avviene nel **fuso orario locale del dispositivo**. Un dispositivo con fuso errato o
in viaggio produrrebbe una prenotazione all'ora sbagliata.

---

## 7.3 `SelectModal` — picker generico

L'unico componente generico dell'app:

```typescript
export function SelectModal<T extends { id: number }>(props: SelectModalProps<T>)
```

Props complete in [05 §5.13](./05-modello-dati.md).

Comportamento:

- `Modal` con `animationType="slide"` e `transparent`.
- Backdrop `withOpacity(theme.colors.black, 0.55)`; tap sul backdrop → `onClose`.
- Sheet con `maxHeight: '72%'`; `FlatList` con `maxHeight: 360`.
- Riga selezionata: stile `modalRowSelected`.
- Riga disabilitata (`isItemDisabled(item)` vero): `opacity: 0.48` e hint testuale
  `disabledItemHint` (default `'Non prenotabile'`); il tap non fa nulla.
- Empty state: `listEmptyText ?? 'Nessun elemento disponibile.'`
- Pulsante di chiusura: `"Chiudi"`.
- `keyExtractor`: `` `opt-${item.id}-${index}` ``

Al tap su una riga abilitata: `onSelect(item)` seguito da `onClose()`.

---

## 7.4 `BookVisitScreen` — prenotazione visita

La schermata più complessa dell'app (1446 righe). Serve **due flussi diversi** nello stesso
componente.

### Il discriminante

```typescript
const profileOsteopataId = profileQuery.data?.osteopataId;
const isOsteopathBooking = typeof profileOsteopataId === 'number' && profileOsteopataId > 0;
```

- `isOsteopathBooking === true` → **flusso operatore**: cerca il paziente, gestisce l'acquisto di
  riferimento, si assegna automaticamente come osteopata.
- `isOsteopathBooking === false` → **flusso paziente**: il paziente è sé stesso, studio e osteopata
  vengono preselezionati dall'osteopata di riferimento.

### Stato completo (14 variabili)

| Variabile | Tipo | Valore iniziale |
|---|---|---|
| `dataVisitaYmd` | `string` | `initialVisitYmdTomorrow()` → **domani** in data locale |
| `studioId` | `number \| null` | `null` |
| `osteopataId` | `number \| null` | `null` |
| `slotSelezionato` | `SlotDisponibilitaDto \| null` | `null` |
| `modalOsteopata` | `boolean` | `false` |
| `modalStudio` | `boolean` | `false` |
| `datePickerOpen` | `boolean` | `false` |
| `iosPickerDate` | `Date` | `new Date(initialVisitYmdTomorrow() + 'T12:00:00')` |
| `pazienteSearchInput` | `string` | `''` |
| `pazienteSearchDebounced` | `string` | `''` |
| `selectedPaziente` | `PazienteDto \| null` | `null` |
| `modalAcquisto` | `boolean` | `false` |
| `modalCreaAcquisto` | `boolean` | `false` |
| `selectedAcquistoId` | `number \| null` | `null` |

Il default a **domani** anziché oggi è una scelta di prodotto: evita di proporre slot già passati
nella giornata corrente.

### Valori derivati (`useMemo`)

| Valore | Calcolo |
|---|---|
| `range` | `{ dataInizio: dataVisitaYmd, dataFine: dataVisitaYmd }` — sempre un solo giorno |
| `startOfToday` | Mezzanotte locale odierna |
| `maxSelectableDate` | `addMonths(startOfToday, 3)` — **finestra di prenotazione: 3 mesi** |
| `profileOsteopataId`, `isOsteopathBooking` | vedi sopra |
| `effectivePazienteId` | operatore → `selectedPaziente?.id`; paziente → `profileQuery.data?.pazienteId` |
| `osteopatiForSelect` | Osteopati dello studio, filtrati per esclusione "ricciardi" |
| `pazienteNomeCompleto` | Etichetta del paziente selezionato |
| `acquistiAll`, `acquistiPrenotabili` | Lista completa e sottoinsieme prenotabile |
| `needsAcquistoChoice` | `acquistiPrenotabili.length > 0` |
| `acquistoOk` | Nessun prenotabile **oppure** selezione valida |
| `acquistoSelezionato`, `showAcquistoField` | |
| `defaultPrenotabileAcquistoId` | `leastRecentPrenotabileAcquistoId(acquistiPrenotabili)` |
| `slotsEspansi` | `expandSlotsToHourly(slots)` |
| `daySections` | `groupSlotsByDay(slotsEspansi)` |
| `refreshing` | Aggregato degli stati di refetch |

### Le sette query React Query

| Query | `queryKey` | `enabled` | `staleTime` | `queryFn` |
|---|---|---|---|---|
| `profileQuery` | `['auth-me-profile']` | sempre | `60_000` | `fetchCurrentUser()` |
| `studiQuery` | `['visite-studi']` | sempre | default | `fetchStudiAttivi()` |
| `osteopatiQuery` | `['visite-osteopati', studioId]` | `studioId != null` | default | `fetchOsteopatiPerStudio(studioId!)` |
| `pazientiSearchQuery` | `['pazienti-advanced-search', pazienteSearchDebounced]` | operatore && nessun paziente selezionato && `debounced.length >= 2` | `15_000` | `searchPazientiAdvanced({ query, size: 50 })` |
| `acquistiQuery` | `['acquisti-paziente', effectivePazienteId]` | operatore && `pazienteId > 0` | default | `fetchAcquistiByPaziente(id, { sortDir: 'DESC' })` |
| `osteopataRiferimentoQuery` | `['paziente-osteopata-riferimento', effectivePazienteId]` | **non** operatore && `pazienteId > 0` | `60_000` | `fetchOsteopataRiferimentoPaziente(id)` |
| `disponibilitaQuery` | `['visite-disponibilita', osteopataId, studioId, dataInizio, dataFine]` | `osteopataId && studioId` | default | `fetchDisponibilitaVisite({...})` |

La `queryKey` di `disponibilitaQuery` include tutti i parametri, quindi cambiare studio, osteopata o
data produce automaticamente una nuova fetch con cache separata.

`pazientiSearchQuery` ha `staleTime: 15_000`: i risultati di ricerca sono validi per 15 secondi.

### Ricerca paziente (solo flusso operatore)

Debounce di **400 ms** fra `pazienteSearchInput` e `pazienteSearchDebounced`. La query parte solo
quando la stringa raggiunge `PAZIENTI_SEARCH_MIN_QUERY_LEN` (= 2), e anche a livello di servizio
`searchPazientiAdvanced` evita la chiamata HTTP sotto quella soglia (doppia protezione).

UI:

- `TextInput` placeholder: `"Nome, cognome o entrambi…"`
- Hint: `"Almeno {PAZIENTI_SEARCH_MIN_QUERY_LEN} caratteri; ricerca in pausa mentre scrivi (circa 400 ms)."`
  — nota: il valore viene interpolato dinamicamente dalla costante del servizio
- Loading: `"Ricerca in corso…"`
- Empty: `"Nessun paziente trovato."`
- Ogni risultato mostra `pazienteLabel(p)`, email ed età

Dopo la selezione, il campo di ricerca viene sostituito da una card con nome, email e cellulare del
paziente più un pulsante `"Cambia"` (`accessibilityLabel="Cambia paziente"`).

### Preselezione automatica (solo flusso paziente)

Due `useEffect` in sequenza:

**1. Auto-select dello studio** (righe ~327-353): se `studioId == null`, itera sugli studi attivi
chiamando `fetchOsteopatiPerStudio(studio.id)` per ciascuno, finché non trova quello che contiene
l'osteopata di riferimento del paziente.

Costo: fino a N chiamate HTTP sequenziali dove N è il numero di studi attivi. Non è memoizzato tra
i mount della schermata (le chiamate imperative non passano da React Query).

**2. Auto-select dell'osteopata** (righe ~355-373): se l'osteopata di riferimento non è escluso
(regola "ricciardi") ed è presente in `osteopatiForSelect`, viene selezionato.

Risultato: il paziente apre la schermata e trova già impostati studio, osteopata e data (domani);
deve solo scegliere lo slot.

### Gestione dell'acquisto (solo flusso operatore)

Il campo compare se `showAcquistoField`. Logica:

1. `acquistiQuery` carica tutti gli acquisti del paziente (`sortDir: 'DESC'`).
2. `acquistiPrenotabili` = quelli con `isAcquistoPrenotabile(a)` vero.
3. Se ce n'è almeno uno (`needsAcquistoChoice`), la selezione diventa **obbligatoria**.
4. Auto-selezione di `defaultPrenotabileAcquistoId` = l'acquisto prenotabile **meno recente**
   (consumo FIFO dei pacchetti).
5. `selectedAcquistoId` viene resettato se il paziente cambia o se l'acquisto selezionato non è più
   prenotabile.

UI:

- Header `"Acquisto di riferimento"` con pulsante `"+"` (`accessibilityLabel="Nuovo acquisto"`) che
  apre `CreaAcquistoModal`
- Loading: `"Caricamento acquisti del paziente…"`
- Placeholder select: `"Seleziona acquisto…"` oppure `"Caricamento…"`
- `SelectModal` con titolo `"Acquisto di riferimento"`, empty
  `"Nessun acquisto trovato per questo paziente."`, hint sui disabilitati `"Non prenotabile"`

### Campi comuni

| Campo | Placeholder / stati |
|---|---|
| `"Studio"` | `"Seleziona studio…"` |
| `"Osteopata"` | `"Prima scegli uno studio…"` se `studioId == null`, altrimenti `"Seleziona osteopata…"` |
| — | Loading osteopati: `"Caricamento osteopati per questo studio…"` |
| — | Empty osteopati: `"Nessun osteopata associato a questo studio (disponibilità o visite future). Prova un altro polo."` |
| `"Giorno della visita"` | Hint: `"Puoi scegliere una data fino a tre mesi da oggi."` |

Cambiando studio, `osteopataId` e `slotSelezionato` vengono resettati. Cambiando data, si resetta
`slotSelezionato`.

Nel flusso operatore, la selezione dello studio imposta automaticamente `osteopataId` all'ID
dell'operatore loggato.

### Date picker

Modal con toolbar `"Annulla"` / `"OK"` e visualizzazione del giorno della settimana. Su iOS il
`DateTimePicker` usa `themeVariant: 'dark'` e `textColor: theme.colors.secondary`.

Range: da `startOfToday` a `addMonths(startOfToday, 3)`.

### Sezione disponibilità

Compare quando sono selezionati studio e osteopata:

- Label: `"DISPONIBILITÀ"` (maiuscolo)
- Sottotitolo: `"Ecco le disponibilità per il giorno selezionato 👇🏼"`
- Loading: `"Caricamento disponibilità…"`
- Empty: `"Nessuno slot disponibile in questa data per questa combinazione studio / osteopata."`

Ogni riga slot mostra:

- Orario via `formatSlotLabel(inizio, fine)`
- Meta: `"{osteopata} - {studio.nome}"`
- Pulsante `"PRENOTA"` (maiuscolo via CSS)

### Footer di conferma

Visibile se: `osteopataId && studioId && !disponibilitaQuery.isLoading && !disponibilitaError && daySections.length > 0`.

Contenuto:

- Banner `"Slot selezionato"` con i dettagli
- Hint contestuali:
  - operatore senza paziente: `"Seleziona un paziente in alto per abilitare la conferma."`
  - acquisti in caricamento: `"In attesa del caricamento degli acquisti…"`
  - acquisto obbligatorio non scelto: `"Seleziona un acquisto di riferimento per il paziente."`
- Pulsante `"Conferma prenotazione"` (spinner durante la mutation)

Il pulsante è disabilitato se: nessuno slot selezionato, mutation in corso, operatore senza paziente,
acquisti in caricamento, oppure `needsAcquistoChoice && !acquistoOk`.

### La mutation di prenotazione

```265:302:src/screens/visite/BookVisitScreen.tsx
  const prenotaMutation = useMutation({
    mutationFn: (vars: {
      slot: SlotDisponibilitaDto;
      osteopataId: number;
      studioId: number;
      pazienteId: number | null | undefined;
      acquistoId?: number;
    }) => {
      const { dataVisita, oraInizio, oraFine } = slotIsoToVisitaFields(vars.slot.inizio, vars.slot.fine);
      return createVisita({
        dataVisita,
        oraInizio,
        oraFine,
        osteopata: { id: vars.osteopataId },
        studio: { id: vars.studioId },
        ...(vars.slot.stanza?.id != null ? { stanza: { id: vars.slot.stanza.id } } : {}),
        ...(typeof vars.pazienteId === 'number' && vars.pazienteId > 0
          ? { paziente: { id: vars.pazienteId } }
          : {}),
        ...(typeof vars.acquistoId === 'number' && vars.acquistoId > 0
          ? { acquistoId: vars.acquistoId }
          : {}),
      });
    },
    onSuccess: () => {
      setSlotSelezionato(null);
      queryClient.invalidateQueries({ queryKey: ['visite-by-paziente'] });
      queryClient.invalidateQueries({ queryKey: ['calendario-completo'] });
      queryClient.invalidateQueries({ queryKey: ['visite-disponibilita'] });
      queryClient.invalidateQueries({ queryKey: ['acquisti-paziente'] });
      navigation.popToTop();
      Alert.alert('Prenotazione registrata', 'Riceverai conferma secondo le procedure dello studio.');
    },
    onError: (e: unknown) => {
      Alert.alert('Errore', getUserFacingApiErrorMessage(e, { /* ... */ }));
    },
  });
```

Punti notevoli:

- Il body è costruito con **spread condizionali**: i campi opzionali (`stanza`, `paziente`,
  `acquistoId`) vengono omessi anziché inviati come `null`.
- `prezzoVisita`, `servizio`, `note`, `richiestaRecensione` non vengono mai inviati: sono valorizzati
  dal backend.
- `onSuccess` invalida **quattro** chiavi con match per prefisso, quindi tutte le varianti (per
  paziente, per giorno, per combinazione) vengono rinfrescate.
- Messaggio di errore fallback: `'Impossibile completare la prenotazione. Riprova più tardi.'`

### Alert del flusso

| Situazione | Titolo | Messaggio |
|---|---|---|
| Operatore senza paziente | `'Paziente mancante'` | `'Seleziona un paziente dall'elenco prima di confermare.'` |
| Acquisto obbligatorio non scelto | `'Acquisto mancante'` | `'Seleziona un acquisto di riferimento tra quelli prenotabili per questo paziente.'` |
| Conferma | `'Confermi la prenotazione?'` | data e ora; pulsanti `'Annulla'` e `'Conferma'` |
| Successo | `'Prenotazione registrata'` | `'Riceverai conferma secondo le procedure dello studio.'` |
| Errore | `'Errore'` | messaggio da `getUserFacingApiErrorMessage` |

### Gestione errore studi

Se `studiQuery` fallisce, viene mostrato il messaggio API più questo hint tecnico:

> `"Gli studi sono esposti su GET /api/studi (richiede JWT). Verifica sessione e URL del backend."`

È un messaggio di debug esposto all'utente finale.

### Flusso completo — PAZIENTE

1. `VisiteMenu` → `"Prenota una nuova visita"`.
2. Caricamento studi attivi.
3. Caricamento dell'osteopata di riferimento del paziente.
4. Loop asincrono sugli studi per individuare quello dell'osteopata di riferimento → auto-select.
5. Auto-select dell'osteopata di riferimento (se non escluso).
6. Data preimpostata a domani; l'utente può cambiarla fino a +3 mesi.
7. Caricamento disponibilità per il giorno.
8. Espansione degli slot in segmenti da un'ora e raggruppamento per giorno.
9. Tap su uno slot → selezione; tap su `"Conferma prenotazione"`.
10. Alert di conferma con data e ora.
11. `POST /visite` con `pazienteId` dal profilo (nessun campo acquisto).
12. Successo → invalidazione cache → `popToTop()` → Alert `'Prenotazione registrata'`.

### Flusso completo — OPERATORE

1. `VisiteMenu` → `"Prenota una nuova visita"`.
2. Ricerca paziente (minimo 2 caratteri, debounce 400 ms).
3. Selezione del paziente dai risultati.
4. Caricamento degli acquisti del paziente. Se esistono prenotabili, uno viene preselezionato (il più
   vecchio). Opzionalmente si crea un nuovo acquisto con `"+"`.
5. Selezione dello studio → `osteopataId` viene impostato automaticamente a sé stesso.
6. Selezione della data.
7. Selezione dello slot → conferma, con validazione di paziente e acquisto.
8. `POST /visite` con `paziente` e `acquistoId`.

---

## 7.5 `CreaAcquistoModal` — creazione acquisto

Modal invocata solo dal flusso operatore di `BookVisitScreen`.

### Props

```typescript
type Props = {
  visible: boolean;
  pazienteId: number;
  pazienteNomeCompleto?: string | null;
  onClose: () => void;
  onCreated: (acquisto: AcquistoDto) => void;
};
```

### Stato (6 variabili, tutte resettate ad ogni apertura)

| Variabile | Tipo | Iniziale |
|---|---|---|
| `pickerServizioOpen` | `boolean` | `false` |
| `servizioSelezionato` | `ServizioDto \| null` | `null` |
| `metodo` | `MetodoPagamentoAcquisto` | `'VOLTA_PER_VOLTA'` |
| `tipoSconto` | `'NONE' \| 'PERCENTUALE' \| 'FISSO'` | `'NONE'` |
| `scontoInput` | `string` | `''` |
| `note` | `string` | `''` |

Un `useEffect` su `visible` resetta l'intero form ad ogni apertura: nessuna bozza persistente.

### Query e mutation

| | `queryKey` | `enabled` | `staleTime` |
|---|---|---|---|
| `serviziQuery` | `['servizi-attivi']` | `visible && pazienteId > 0` | `60_000` |

`createMutation`:
- `mutationFn: createAcquisto`
- `onSuccess`: `onCreated(acquisto)` poi `onClose()`
- `onError`: Alert `'Creazione non riuscita'` con fallback `'Riprova più tardi.'`

### Payload

```typescript
{
  pazienteId,
  servizioId: servizioSelezionato.id,
  metodoPagamento: metodo,
  ...(tipoSconto !== 'NONE' ? { tipoSconto, sconto } : {}),
  ...(noteTrim.length > 0 ? { note: noteTrim } : {}),
}
```

### UI — vista principale

- Titolo: `"Nuovo acquisto"`
- Sottotitolo:
  - con nome: `"{nome} (ID {pazienteId}). Verrà creato un acquisto collegato a questo profilo."`
  - senza nome: `"Paziente #{pazienteId}. Verrà creato un acquisto collegato a questo profilo."`
- Campo `"Servizio"`: loading `"Caricamento servizi attivi..."`, placeholder `"Seleziona servizio..."`
- **Metodo pagamento** (chip): `"Volta per volta"`, `"Tutto anticipato"`, `"Rate"`
- **Sconto** (chip): `"Nessuno"`, `"Percentuale %"`, `"Importo fisso"`; se diverso da nessuno appare
  un input con placeholder `"Es. 10"` / `"Es. 20"`
- **Note**: label `"Note (opzionale)"`, placeholder `"Es. promo, accordi con il paziente..."`,
  `multiline`, `maxLength={500}`
- Azioni: `"Annulla"` (`accessibilityLabel="Annulla creazione acquisto"`) e `"Crea acquisto"`

Sheet con `maxHeight: '88%'`.

### UI — picker servizio

Vista sostitutiva a schermo pieno dentro il modal (`pickerServizioOpen`):

- Chevron di ritorno (`accessibilityLabel="Indietro"`)
- Titolo `"Servizio attivo"`
- Hint: `"Servizi con validita alla data del server. Se l'elenco e vuoto, non ci sono pacchetti attivi oggi."`
  *(le parole "validita" ed "e" sono senza accento nel sorgente)*
- Loading: `"Caricamento..."`
- Empty (senza errore): `"Nessun servizio attivo in questa data (lato server)."`
- Righe: pill con il nome del servizio + `servizioRestLabel(item)` (numero visite e prezzo)
- Lista con `maxHeight: 440`

### Validazione

```typescript
function parseScontoInput(value: string): number | null
```
Sostituisce `,` con `.`, trimma, e accetta solo numeri finiti `> 0`.

Regole al submit:

| Condizione | Alert |
|---|---|
| Nessun servizio | `'Servizio mancante'` / `'Seleziona un servizio dall'elenco attivo.'` |
| Sconto attivo ma valore non valido | `'Sconto non valido'` / `'Inserisci un valore sconto maggiore di zero.'` |

Il pulsante `"Crea acquisto"` è disabilitato se `!servizioSelezionato || createMutation.isPending`.

**Assenza di validazione sul valore massimo dello sconto**: uno sconto percentuale di 150 verrebbe
accettato dal client. Il controllo è demandato al backend.

---

## 7.6 `GestioneVisiteScreen` — agenda o storico

Due modalità completamente diverse nello stesso file, discriminate da:

```typescript
const osteopathAgenda = typeof osteopataId === 'number' && osteopataId > 0;
```

### Sotto-componenti interni

`AgendaLuogoRows`, `VisitNumberBadge`, `VisitaAgendaCard`, `EventoAgendaCard`, `AssenzaAgendaCard`,
più gli helper `isOsteopathRole`, `joinNomeCognome`, `itemStudioNome`, `itemStanzaNome`,
`patientName`, `calendarioItemKey`, `eventoTitolo`.

### Stato

| Variabile | Tipo | Iniziale |
|---|---|---|
| `giornoYmd` | `string` | `toLocalYmd(new Date())` → **oggi** |
| `datePickerOpen` | `boolean` | `false` |
| `openingWhatsApp` | `boolean` | `false` |
| `iosPickerDate` | `Date` | oggi a mezzogiorno |

`useMemo`: `calendarMin` = oggi − 3 anni, `calendarMax` = oggi + 2 anni. Range molto ampio, coerente
con la consultazione di uno storico.

### Query

| Query | `queryKey` | `enabled` | `staleTime` |
|---|---|---|---|
| `profileQuery` | `['auth-me-profile']` | sempre | `60_000` |
| `visitePazienteQuery` | `['visite-by-paziente', pazienteId, 'ASC']` | `!osteopathAgenda && pazienteId > 0` | default |
| `calendarioOsteopataQuery` | `['calendario-completo', osteopataId, giornoYmd]` | `osteopathAgenda` | default |

Le due query sono mutuamente esclusive: solo una è mai abilitata.

### Modalità OPERATORE — agenda del giorno

Lead text: `"Agenda del giorno: visite, eventi e assenze in ordine di orario. Scegli la data per caricare l'elenco."`

**Toolbar data** (solo in questa modalità):
- Pulsante `"−"` (`accessibilityLabel="Giorno precedente"`)
- Centro: `formatDayTitle(giornoYmd)` con hint `"Tocca per cambiare giorno"`
- Pulsante `"+"` (`accessibilityLabel="Giorno successivo"`)

Loading: `"Caricamento agenda del giorno…"`. Empty: `"Nessun impegno in questo giorno."`

**Rendering per tipo di item**:

| `tipo` | Card | Contenuto |
|---|---|---|
| `VISITA` | `VisitaAgendaCard` | Nome paziente (fallback `'Paziente'`), orario a destra (`formatTimelineFascia` o `'—'`), `"Studio: {nome}"`, `"Stanza: {nome}"` |
| `EVENTO` | `EventoAgendaCard` | Badge con tipo evento o `'Evento'`, titolo (`item.titolo` o `tipoEventoLabel`), orario, descrizione (max 3 righe), studio/stanza |
| `NON_REPERIBILITA` | `AssenzaAgendaCard` | Kind `"Non disponibile"`, titolo = `motivo` o `'Assenza'`, orario |

### Modalità PAZIENTE — storico visite

Lead text: `"Prenotate, effettuate, disdette e altri stati — ordine dalla più vecchia."`

Ordinamento `ASC` (dalla più vecchia). Loading: `"Caricamento visite…"`.
Empty: `"Nessuna visita in archivio per questo paziente."`

Ogni riga mostra:

- Data (`formatDayTitle`) e ora (`formatOraDisplay(oraInizio)`)
- Badge numerico progressivo (indice 1-based nella lista)
- Nome osteopata, oppure `"Osteopata non assegnato"`
- `"Stato visita: {visitaStatusLabel(statusVisita)}"` se presente
- `"Pagamento: {statusPagamento}"` se presente
- `"Importo: {formatPrezzoEUR(prezzoVisita)}"` se presente

### Stati particolari

**Ruolo osteopata ma `osteopataId` assente** (`osteopathMissingId`):

> `"Il tuo profilo ha ruolo osteopata ma manca osteopataId da GET /auth/me. Contatta l'amministratore."`

`isOsteopathRole` verifica `ruoli.some(r => r.toUpperCase().includes('OSTEOPATA'))`.

**Paziente senza `pazienteId`** (`showPatientEmptyState`): testo di supporto più pulsante WhatsApp.
Il pulsante mostra `"Contatta la segreteria su WhatsApp"` (o `"Apertura WhatsApp..."` durante il
caricamento) e ha colore hardcoded `#25D366`. Messaggio precompilato:

> `"Buongiorno Team di Mobilitas! Sono un utente dell'applicazione e vorrei poter visualizzare le visite. Attendo un vostro riscontro, grazie!"`

### Pull-to-refresh

Rinfresca il profilo e la query attiva in base alla modalità.

---

## 7.7 `PagamentiPazienteScreen` — pagamenti e fatture

Accessibile solo a chi ha `hasPazienteRole` (la card nel menu è nascosta agli altri).

### Componenti

- `PagamentoCard` — props `{ pagamento: PagamentoDto; opening: boolean; onOpenFattura: (p) => void }`
- Helper `isRimborso`, `statoLabel`

### Stato

| Variabile | Tipo | Iniziale |
|---|---|---|
| `openingPagamentoId` | `number \| null` | `null` |
| `fatturaError` | `string \| null` | `null` |
| `openingLock` | `useRef<boolean>` | `false` |

`openingLock` è un ref usato come mutex per prevenire il doppio tap sul pulsante fattura (un ref
anziché uno state perché non deve causare re-render e deve essere leggibile in modo sincrono).

### Query

| Query | `queryKey` | `enabled` | `staleTime` |
|---|---|---|---|
| `profileQuery` | `['auth-me-profile']` | sempre | `60_000` |
| `pagamentiQuery` | `['pagamenti-paziente', pazienteId, 'DESC']` | `isPaziente && hasPazienteId` | default |

`sortDir: 'DESC'` — dal più recente, opposto allo storico visite.

### UI

- Lead: `"Storico dei pagamenti associati al tuo profilo, dal più recente."`
- Badge: `"I tuoi pagamenti"` + `wallet-outline`; divider `card-outline`
- Loading profilo: `"Caricamento profilo…"`
- Non paziente: `"Questa sezione è disponibile solo per gli utenti pazienti."`
- Manca `pazienteId`:
  `"Per visualizzare i pagamenti in app dobbiamo collegare il tuo profilo paziente. Contatta la nostra segreteria e ti aiutiamo subito."`
  più `StudioWhatsAppSupportButton` con messaggio `PAGAMENTI_WHATSAPP`
- Loading pagamenti: `"Caricamento pagamenti…"`
- Empty: `"Nessun pagamento in archivio per il tuo profilo."`

**`PagamentoCard`** mostra:

- Importo in EUR, oppure `'—'`
- Data e ora via `formatLocalDateTimeDisplay`
- Badge di stato: `statoDescrizione` || `stato` || `'Stato non disponibile'`
- Pulsante fattura (`accessibilityLabel="Apri o richiedi la fattura"`)
- Stile differenziato se `isRimborso`

### `isRimborso`

```typescript
stato.toUpperCase().includes('RIMBORSO') || importo <= 0
```

Un pagamento di importo zero viene quindi classificato come rimborso, anche se semanticamente
potrebbe essere un pagamento annullato.

### Flusso fattura

1. Se `pagamento.fatturaPresente !== true` → modal con il messaggio `FATTURA_NON_DISPONIBILE`, senza
   alcuna chiamata HTTP.
2. Altrimenti `downloadFatturaPdf(pagamento.id)` → `shareFatturaPdf(uri, filename)`.
3. In caso di errore, il messaggio è mappato da `fatturaPdfUserMessage` (vedi
   [04 §4.4](./04-api-e-servizi.md)).

**Modal di errore fattura**:

- Titolo: `"Fattura non disponibile sull'app"`
- Testo: `fatturaError`
- Hint (solo se l'errore differisce dal default):
  `"Puoi riprovare più tardi oppure contattare la segreteria per richiedere la fattura."`
- `StudioWhatsAppSupportButton` con `FATTURA_WHATSAPP`
- Pulsante `"Chiudi"`

### Costanti di testo

```typescript
const PAGAMENTI_WHATSAPP =
  "Buongiorno Team di Mobilitas! Sono un utente dell'applicazione e vorrei poter visualizzare i miei pagamenti. Attendo un vostro riscontro, grazie!";

const FATTURA_NON_DISPONIBILE =
  'La fattura non è disponibile nell\'app. Contatta la segreteria su WhatsApp per richiederla.';

const FATTURA_WHATSAPP =
  'Buongiorno, sono un paziente dello studio e non riesco a scaricare la fattura di un pagamento dall\'app. Vorrei richiederla. Grazie.';
```

---

## 7.8 Riepilogo delle chiavi React Query del modulo

| `queryKey` | Schermate che la usano | `staleTime` |
|---|---|---|
| `['auth-me-profile']` | `BookVisit`, `GestioneVisite`, `PagamentiPaziente` | `60_000` |
| `['visite-studi']` | `BookVisit` | default |
| `['visite-osteopati', studioId]` | `BookVisit` | default |
| `['pazienti-advanced-search', query]` | `BookVisit` | `15_000` |
| `['acquisti-paziente', pazienteId]` | `BookVisit` | default |
| `['paziente-osteopata-riferimento', pazienteId]` | `BookVisit` | `60_000` |
| `['visite-disponibilita', osteopataId, studioId, da, a]` | `BookVisit` | default |
| `['visite-by-paziente', pazienteId, 'ASC']` | `GestioneVisite` | default |
| `['calendario-completo', osteopataId, giorno]` | `GestioneVisite` | default |
| `['pagamenti-paziente', pazienteId, 'DESC']` | `PagamentiPaziente` | default |
| `['servizi-attivi']` | `CreaAcquistoModal` | `60_000` |

La chiave `['auth-me-profile']` condivisa tra tre schermate garantisce una sola chiamata a
`/auth/me` per finestra di 60 secondi.

---

## 7.9 Osservazioni sul modulo

1. **Durata visita implicita di un'ora**: `expandSlotToHourlyChunks` impone segmenti da 60 minuti.
   Servizi con durata diversa (il campo `ServizioDto.durata` esiste) non sono supportati nel flusso di
   prenotazione.

2. **Esclusione hardcoded su cognome**: `isOsteopataExcludedFromVisitBooking` cerca la stringa
   `'ricciardi'`. Da sostituire con un flag lato backend.

3. **Messaggi tecnici esposti all'utente**: due stringhe contengono riferimenti a endpoint e nomi di
   campo (`GET /api/studi`, `osteopataId da GET /auth/me`). Utili in debug, inadeguate in produzione.

4. **Auto-select studio con N chiamate sequenziali**: nel flusso paziente, l'individuazione dello
   studio dell'osteopata di riferimento itera su tutti gli studi con chiamate imperative fuori da
   React Query, quindi senza cache né deduplicazione.

5. **`prezzoVisita` non inviato**: la prenotazione non specifica il prezzo, che viene derivato dal
   backend a partire dall'acquisto o dal servizio. Corretto, ma significa che il paziente non vede
   alcun importo prima di confermare.

6. **Nessuna conferma all'abbandono**: uscendo da `BookVisitScreen` con un form compilato non c'è
   alcun avviso.

7. **`createVisita` su endpoint `permitAll`**: il commento nel servizio segnala che
   `POST /api/visite` non richiede autenticazione lato backend. Se confermato, è una vulnerabilità
   lato server (chiunque potrebbe creare visite arbitrarie), indipendente dal client.
