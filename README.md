# Wyrm Lancer

A 60 FPS TypeScript + HTML5 Canvas 2D action-platformer mechanics prototype inspired by the Final Fantasy Dragoon job, featuring a 6-zone **Wyrmspire Proving Grounds** test level, a live Tuning Lab, and dual **Keyboard/Gamepad** + mobile **Hop-Swipe Touch** control schemes.

## Getting Started

```bash
npm install
npm run dev          # Desktop playtesting at http://localhost:5173
npm run dev:mobile   # Exposes Vite on your local Wi-Fi network (--host) for mobile playtesting
```

On Windows PowerShell environments where `.ps1` script execution is restricted, use `npm.cmd` (e.g., `npm.cmd run dev:mobile`).

## Controls

### Keyboard / Gamepad
- **Move / Aim**: `W A S D` or `Arrow Keys`
- **Jump / Drop-Through**: `Space` or `Z` (`Down + Jump` on one-way platforms)
- **Lance Thrust / Up-Thrust / Pogo**: `J` or `X` (`Up` / `Down` + Lance)
- **High Jump** (Invuln Ascent → Apex Lock-On → Meteor Dive): `K` or `C`
- **Elusive Jump**: `L` or `Shift`
- **Lancet** (Siphon +1 HP & +15 Dragon Gauge): `I` or `V`
- **Dragon Arts**: `U` or `F` (`50+` Gauge = *Geirskogul*, `100` Gauge = *Stardiver*)
- **Zone Warps / Reset / Tuning Lab**: `1`–`6` · `R` · `Tab` / `F1`

### Mobile Touch Mode (WIP — Locomotion)
- **Toggle**: Tap `Mode: Touch` / `Mode: KB` at top-right (auto-enabled on touch devices)
- **Left Half (4-Cardinal Swipes)**:
  - Grounded: `Swipe Left / Right` = Skip-Hop · `Swipe Up` = Single Jump · `Swipe Down` = Drop-Through
  - Airborne (1 default Air Charge): `Swipe Left / Right` = Air Hop · `Swipe Up` = Double Jump · `Swipe Down` = Free Fast-Fall Cancel (preserves Air Charge)

## Scripts

- `npm run typecheck` — Run `tsc --noEmit`
- `npm run test` — Run Vitest unit & mechanics suites (`physics`, `dragoonAbilities`, `combat`, `touchLocomotion`)
- `npm run build` — Typecheck and build production bundle to `dist/`
