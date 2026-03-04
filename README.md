# Cubing Stage

High-end webapp om operators in een Goods-to-Picker proces direct een visuele stapel-blueprint te geven voor een WTS winkeldoos van `70 x 50 x 45`.

## Features

- Interactieve 3D visualisatie van de winkeldoos en geplaatste schoenendozen.
- Dynamische receptinstellingen (schoenen, kleding, accessoires, caps).
- Automatische blueprint-generatie met laag-voor-laag instructies.
- KPI's voor fill-rate en gebruikte hoogte.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

## Deploy (Cloudflare Pages)

Als je een witte pagina ziet op `*.pages.dev`, controleer deze instellingen in Cloudflare Pages:

- Build command: `npm run build`
- Build output directory: `dist`
- Node version: `20` (aanrader)

Deze repo gebruikt nu relatieve asset-paden (`base: './'`) zodat deploys op root én subpad correct laden.
