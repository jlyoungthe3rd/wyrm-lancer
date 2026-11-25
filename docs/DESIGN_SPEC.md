# Wyrm Lancer — Design Spec & Development Roadmap

> **Repo:** `https://github.com/jlyoungthe3rd/wyrm-lancer`  
> **Local Workspace:** `C:\Users\jlyou\Workspace\wyrm-lancer`  
> **Stack:** TypeScript + HTML5 Canvas (60Hz fixed-timestep headless simulation) + Vite + Vitest

---

## 1. Vision & Core Feel

**Wyrm Lancer** is a 2D action-platformer mechanics prototype inspired by the **Final Fantasy Dragoon** job (Kain, Freya, Estinien), aiming for a **snappy, rhythmic platformer feel** (Hollow Knight / Shovel Knight responsiveness) with deliberate, high-impact aerial spear combat.

The primary goal during this prototyping phase is dialing in Dragoon movement, aerial spear mechanics, and mobile playability inside a dedicated **6-zone test playground** paired with a live **Tuning Lab** (`Tab` / `F1`).

---

## 2. Dragoon Ability Kit (Implemented Baseline)

All core Dragoon abilities are implemented and playable in Keyboard/Gamepad mode (`src/game/playerState.ts`, `src/game/dragoonAbilities.ts`, `src/game/combat.ts`):

- **Snappy Platforming**: `100ms` coyote time, `110ms` jump buffer, variable jump height cut, subtle `0.62×` apex gravity hang, and `Down + Jump` one-way drop-through.
- **Lance Combat**:
  - **True Thrust → Vorpal Thrust**: 2-hit grounded spear combo with forward lunge and `35ms` hitstop.
  - **Up-Thrust**: Vertical overhead anti-air poke.
  - **Lance Pogo** (`Down + Lance` mid-air): Bounces sharply upward off enemies, Bounce Lanterns, shields, and spikes, granting `+12` Dragon Gauge and refreshing mid-air **High Jump** & **Elusive Jump** charges.
- **High Jump (3-Phase Signature Dragoon Jump)**:
  1. **Startup & Rocket Ascent**: Passes upward through one-way platforms with full invulnerability frames to dodge ground sweeps/projectiles.
  2. **Apex Hang & Soft Target Snap**: Near-zero gravity hover with dive trajectory preview and automatic diamond reticle lock-on inside a `±42°` downward cone (`520px` range); steering strongly opposite breaks lock for manual angled dives (`±38°`).
  3. **Meteor Dive & Impact**: Armor-breaking, shield-bypassing plunge that shatters **Cracked Stone Floors**, deals height-scaled damage + radial shockwave, grants `+30` Dragon Gauge, resets Elusive Jump cooldown, and triggers a steerable **Dragoon Rebound** on direct enemy hits.
- **Elusive Jump**: Invulnerable backflip opposite `player.facing` (`160ms` i-frames, `1.4s` cooldown); enables **Reverse-Facing Super Vaults** across wide chasms and cancels `HJ_RECOVERY`.
- **Lancet**: Mid-air micro-stall spectral drain lance (`±22°` vertical tilt) that spawns a homing **Drain Orb** on hit, restoring **+1 HP** and **+15 Dragon Gauge**.
- **Dragon Gauge (0–100) & Dragon Arts**:
  - **Geirskogul (`50` Gauge)**: Wide piercing azure-crimson dragon beam that penetrates solid walls and shields.
  - **Stardiver (`100` Gauge)**: Fiery crimson meteor dive-bomb (callable grounded or directly out of `HJ_APEX`) with a `175px` shockwave and heavy stagger.

---

## 3. Test Level: "Wyrmspire Proving Grounds" (6 Zones)

Continuous `6400 × 1480` test playground (`src/game/levelData.ts`, `src/game/enemies.ts`) with diegetic signposts and `1`–`6` instant warp hotkeys:

1. **Zone 1 — Lance Courtyard**: Dummies, step/one-way perch, patrolling Beetle, and spike pit with 4 **Bounce Lanterns**.
2. **Zone 2 — High Jump Spire**: One-way shaft with a **Sweeping Energy Turret** (i-frame test), **Cracked Stone Floor** over a hidden vault, and a **Shield Knight** overlook (frontal shield blocks normal thrusts; High Jump dive breaks armor).
3. **Zone 3 — Elusive Chasm**: Wide spike chasm requiring a **Reverse-Facing Elusive Jump** vault, followed by a telegraphed **Charging Lancer Sentinel**.
4. **Zone 4 — Sky Wyvern Perch**: Tiered platforms, Bounce Lanterns, and 3 **Hovering Wyverns** firing embers.
5. **Zone 5 — Dragon Altar**: **Dragon Resonance Crystal** (strike for instant 100 Gauge), stone wall shielding a squad for **Geirskogul**, and an armored cluster for **Stardiver**.
6. **Zone 6 — Iron Wyvern Arena**: Replayable mini-boss with a `100`-point Stagger Bar (`1.5×` damage while staggered) cycling *Flame Sweep*, *Armored Lunge*, and *Aerial Barrage*.

---

## 4. Mobile Touch Control Scheme ("Hop-Swipe Dragoon")

Designed for **landscape phone playtesting** while iterating locally (`npm.cmd run dev:mobile`, `--host` on LAN).

### Core Design Rules
- **Mode Separation**: Keyboard/Gamepad keeps smooth walk/run controls untouched (`controlScheme: 'keyboard'`). Toggling **Touch Mode** (`controlScheme: 'touch'`, auto-enabled on touch devices and toggleable via HUD pill `Mode: Touch / Mode: KB` or Tuning Lab) switches to the **Hop-Swipe + Double Jump** locomotion state machine.
- **Left / Right Screen Split**:
  - **Left Half** = **4-Cardinal Movement Swipes** (`Left`, `Right`, `Up`, `Down`) for crisp, predictable positioning.
  - **Right Half** = **Combat & Angled / Magnetic Dragoon Attacks** *(upcoming Features 4–5)*.
  - Supports **Swap Left / Right Hands** in the Tuning Lab.
- **Minimal Feedback & Mobile Viewport**:
  - Landscape-first `16:9` viewport with `touch-action: none`, safe-area insets, hidden desktop keybind bar in Touch Mode, and dismissible portrait rotate prompt.
  - **4-Corner Subtle Flash** (`CornerFlashOverlay` in `src/ui/cornerFlash.ts`): pulses `190ms` across the 4 screen corners whenever a swipe is recognized (azure for hops/jumps, indigo for free fast-fall).

### Left-Half 4-Cardinal Movement State Machine (Implemented)

| State | Swipe Direction | Action | Consumes Air Charge? | Behavior Details |
| :--- | :--- | :--- | :--- | :--- |
| **Grounded** | `RIGHT` / `LEFT` | **Skip-Hop** | No | Crisp short parabolic hop (`touchHopVx` / `touchHopVy`), sets `facing` |
| **Grounded** | `UP` | **Single Jump** | No | Full vertical Dragoon leap (`touchSingleJumpVy`) |
| **Grounded** | `DOWN` | **Drop Through** | No | Drops through one-way platforms (no-op on solid ground) |
| **Airborne** | `RIGHT` / `LEFT` | **Air Hop** | **Yes (-1)** | Mid-air directional hop (`touchAirHopVx` / `touchAirHopVy`), sets `facing` |
| **Airborne** | `UP` | **Double Jump** | **Yes (-1)** | Second vertical leap (`touchDoubleJumpVy`) |
| **Airborne** | `DOWN` | **Fast-Fall Cancel** | **No (Free!)** | Kills apex float & drift, drops sharply through one-way platforms; pure movement (0 damage by default), leaving Air Charge intact for `Jump → Fast-Fall → Air Hop` |

- **Air Hop Charges**: Defaults to `touchMaxAirHopCharges: 1` (tunable/upgradeable later), refilled on landing.
- **Apex Float + Fast-Cancel**: Pausing near apex grants a brief low-gravity hang (`touchApexFloatDuration`) to read the situation; swiping rapidly chains immediately without waiting for apex.
- **Landing Swipe Buffer**: Swiping `Left`/`Right`/`Up` within `touchSwipeBufferTime` before touchdown when `airHopCharges === 0` executes immediately on landing.

---

## 5. Feature-by-Feature Roadmap & Status

- [x] **Core Prototype & 6-Zone Test Level**: Dragoon FSM, abilities, enemies, Iron Wyvern boss, procedural Web Audio SFX, live Tuning Lab (`src/tests/physics.test.ts`, `dragoonAbilities.test.ts`, `combat.test.ts`).
- [x] **Touch Feature 1 — Control Toggle & Mobile Setup**: `Mode: Touch / KB` toggle, auto-detect, LAN `dev:mobile`, landscape viewport, Swap Hands option.
- [x] **Touch Feature 2 — Left-Half 4-Cardinal Swipe Recognizer & 4-Corner Flash**: Multi-touch `pointerId` tracking (`src/engine/touchInput.ts`) + `CornerFlashOverlay`.
- [x] **Touch Feature 3 — Hop-Swipe Locomotion & Double Jump Engine**: Full Left-Half movement FSM + 10 live Tuning Lab sliders + 8 unit tests (`src/tests/touchLocomotion.test.ts`).
- [ ] **Touch Feature 4 — Right-Half Angled & Magnetic Combat** *(NEXT — `/grill-me` & plan before building)*:
  - Right-Half gesture design for directional/angled Lance attacks.
  - Target magnetism cone when attacking (keeping Left-Half movement simple).
  - Aerial Lance Pogo integration (and whether Touch Pogo refreshes Air Hop Charges).
- [ ] **Touch Feature 5 — Right-Half Signature Dragoon Arts**:
  - Mapping **High Jump** (Ascent → Apex Lock-On / Dive aiming → Meteor Dive), **Elusive Jump**, **Lancet**, **Geirskogul**, and **Stardiver** cleanly onto Right-Half touch gestures.

---

## 6. Architecture & Development Notes

- **Decoupled Simulation**: `src/game/` (`world.ts`, `playerState.ts`, `physics.ts`, `combat.ts`, `enemies.ts`, `dragoonAbilities.ts`) has zero DOM/Canvas dependencies so all physics and mechanics run deterministically in Vitest.
- **Single Source of Truth**: All physics, combat, and touch parameters live in `DEFAULT_TUNING` (`src/engine/tuning.ts`) and can be tweaked live in the **Tuning Lab** (`Tab` / `F1` or top-right button) and exported via **Copy Tuning JSON**.
- **Windows PowerShell Note**: On this machine `npm.ps1`/`npx.ps1` are blocked by script execution policy—use `npm.cmd` (`npm.cmd run dev:mobile`, `npm.cmd run test`, `npm.cmd run typecheck`, `npm.cmd run build`).
