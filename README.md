# ReperiPharma

Web app full-stack per la gestione dei turni di reperibilita di una farmacia ospedaliera su piu presidi.

## Stack

- Next.js App Router, TypeScript, Tailwind CSS
- shadcn/ui su Base UI
- Prisma 7 con PostgreSQL (`@prisma/adapter-pg`)
- Zod per validazione server-side
- Recharts per dashboard
- ExcelJS per export XLSX
- jsPDF + jspdf-autotable per export PDF mensile
- Vitest per test unitari delle regole dominio

## Setup

1. Copia le variabili ambiente:

```bash
cp .env.example .env
```

2. Imposta `DATABASE_URL` verso un database PostgreSQL.

3. Installa le dipendenze:

```bash
npm install
```

4. Genera client Prisma e applica la migration:

```bash
npm run db:generate
npm run db:migrate
```

5. Carica seed iniziale:

```bash
npm run db:seed
```

6. Avvia l'app:

```bash
npm run dev
```

## Script

- `npm run dev`: sviluppo locale
- `npm run build`: build production
- `npm run lint`: lint
- `npm test`: test unitari
- `npm run db:generate`: genera Prisma Client
- `npm run db:migrate`: applica migration
- `npm run db:seed`: crea presidi iniziali, farmacisti fittizi e impostazioni

## Funzioni principali

- Creazione calendario annuale per anno e presidio con vincolo `unique(year, siteId)`.
- Generazione persistente dei giorni dell'anno e degli slot turno vuoti.
- Festivita nazionali italiane precaricate per anno, incluse Pasqua e Lunedi dell'Angelo.
- Priorita giorno: nazionale, manuale/locale/aziendale, domenica, sabato, feriale.
- Calendario mensile interattivo con assegnazione farmacisti e registrazione chiamate.
- Precompilazione farmacista chiamata da reperibilita diurna/notturna in base all'ora di inizio.
- Conteggi mese delle reperibilita assegnabili, assegnate, scoperte e per farmacista.
- Dashboard con metriche e grafici.
- CRUD per farmacisti, presidi, festivi e impostazioni.
- Export PDF del calendario mensile.
- Export XLSX dashboard con fogli: Aggregato, Per mese, Per farmacista, Chiamate, Festivi, Turni grezzi.

## Note dominio

Le iniziali dei farmacisti sono generate prendendo la prima lettera di ogni parola in nome e cognome, fino a 4 lettere. Esempi:

- `Mario Rossi` -> `MR`
- `Anna Maria Bianchi` -> `AMB`

Lo score festivo viene distribuito solo sui turni di reperibilita:

- doppia reperibilita: score diviso tra `ON_CALL_DAY` e `ON_CALL_NIGHT`
- pomeriggio + reperibilita: score solo su `ON_CALL_WEEKDAY`
- mattina + reperibilita: score solo su `ON_CALL_SATURDAY`

## Test

I test coprono:

- anni normali e bisestili
- duplicato anno/presidio
- regole di tipo giorno e priorita festivi
- Natale con framework doppia reperibilita
- distribuzione score festivi
- selezione farmacista diurno/notturno per chiamate
