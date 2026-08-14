# Site Audit & Verification Tasks — FlowerzFC Platform

## Overview
Comprehensive page-by-page audit and feature verification plan based on the original Figma project design and custom specification requirements.

---

## Audit Checklist & Status

- [x] **Project Initialization**:
  - Restored full modular design architecture from `/Users/DJFLOWERZ/Downloads/Multilingual Site Enhancements`.
  - Installed all required packages (`react-router-dom`, `lucide-react`, `@tailwindcss/vite`).
  - Verified clean production build (`npx vite build` in 772ms).
  - Started Vite dev server on `http://localhost:5173`.

- [ ] **Page 1: Homepage (`/`)**
  - [x] Hero Slideshow carousel with auto-timer & controls.
  - [x] Live Ticker with real-time match minute updates.
  - [x] Bigstone DJ Mixes & Events showcase card.
  - [x] Top Headlines grid with category filter chips.
  - [x] Interactive Match Quick-Poll widget.
  - [x] Non-overcrowded IAB ad banners.

- [ ] **Page 2: Live Scores (`/scores`)**
  - [ ] Date tab switcher (Yesterday, Today, Tomorrow, Calendar Picker).
  - [ ] Searchable League Filter.
  - [ ] Live ticking match minutes.

- [ ] **Page 3: Match Detail (`/match/:id`)**
  - [ ] Tabs: Overview | Lineups | Stats | Commentary | Head-to-Head (H2H).

- [ ] **Page 4: Mixes & Events (`/mixes`)**
  - [ ] Official Mixcloud audio player embeds (streaming only).
  - [ ] Event poster gallery with Lightbox overlay.
  - [ ] DJ Flowerz booking inquiry form.

- [ ] **Page 5: Standings (`/standings`)**
  - [ ] Full statistics columns (`P`, `W`, `D`, `L`, `GF`, `GA`, `GD`, `Pts`).
  - [ ] Qualification zone color indicators (UCL, UEL, Relegation).

- [ ] **Page 6: Transfers (`/transfers`)**
  - [ ] Transfer Centre cards with status badges (`Confirmed`, `Reported`, `Rumour`).

- [ ] **Page 7: Videos (`/videos`)**
  - [ ] Video grid with category tabs (`All`, `Highlights`, `Shorts`).

- [ ] **Page 8: Shop (`/shop`) & Single Product (`/product/:id`)**
  - [ ] Category filters & product cards.
  - [ ] Dedicated single product view with size selector & quantity stepper.
  - [ ] Cart drawer & multi-step Checkout modal with explicit Cancel buttons.

- [ ] **Page 9: Account (`/account`) & Auth (`/login`)**
  - [ ] Sign In & Sign Up tabbed form with Password strength bar & Social auth buttons.
  - [ ] User profile tabs: My Teams / Favourites, Saved Articles, Predictions, Settings.

- [ ] **Page 10: Advertise With Us (`/advertise`)**
  - [ ] Traffic statistics & direct WhatsApp business link (`💬 Chat on WhatsApp`).
