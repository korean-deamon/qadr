# Qadr

Neighbourhood borrowing and item-sharing for Uzbekistan. *Har narsaning qadri bor.*

The specification lives in [`docs/SPEC.md`](docs/SPEC.md); project rules in [`CLAUDE.md`](CLAUDE.md).

## Layout

- `client/` — Next.js 16 (App Router, Cache Components), TypeScript strict, Tailwind v4,
  shadcn/ui, next-intl (`uz` default, `ru`, `en`), Motion, Lenis
- `server/` — FastAPI modular monolith (from Phase 2)

## Client

```bash
cd client
npm install
npm run dev            # http://localhost:3000 → /uz
npm test               # Vitest + RTL
npm run lint
npm run typecheck
npm run build
npx playwright install chromium   # once
npm run test:e2e       # builds must exist: runs against `next start`
npm run screenshots -- http://localhost:3000 ../docs/screenshots /uz /ru /en
```

## Design system

- Tokens: `client/src/app/globals.css` (SPEC §2 palette; `muted-ink` is the AA-safe
  secondary text colour, since `#72766F` only passes AA on white).
- Type: Brygada 1918 (display) + Onest (UI). Both verified for Latin, Cyrillic,
  Uzbek Cyrillic and ʻ (U+02BB).
- Motifs: `client/src/components/branding/motifs.tsx` — girih lattice, Registan arch,
  suzani rosette.
- Photo credits: `client/public/images/CREDITS.md` (CC0 placeholders).
