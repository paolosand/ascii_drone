# Portfolio-Ready: README + Quick-Win Improvements

**Date:** 2026-03-19
**Status:** Approved

---

## Goal

Make the ASCII drone project portfolio-ready by writing a musician-facing README and implementing three small, high-value improvements. No build step changes, no new dependencies, mobile/tablet-first throughout.

---

## README

**File:** `README.md` (repo root)

**Audience:** Musicians who want a gestural drone instrument for live performance. Technical detail is secondary but present for portfolio viewers.

**Sections (in order):**

1. **Title + tagline** — "Hand-Controlled Drone Synthesizer" / subtitle describing it as a live performance instrument
2. **Demo placeholder** — a clearly marked block ready to swap with a QuickTime recording embed once captured
3. **What it is** — 2-3 sentences, musician-first: a live drone instrument you control with your hands, no keyboard or mouse required
4. **Quick start** — open `index.html` directly, or `python3 -m http.server 8000` for local server; webcam required; Chrome/Edge recommended
5. **Controls table** — accurate from the performer's perspective (right fist = tone, left fist = space):

   | Control | Effect |
   |---|---|
   | Right fist (hold briefly, then rotate) | Tone texture — timbre crossfade (soft to bright) + filter sweep |
   | Left fist (hold briefly, then rotate) | Space — stereo width + visual color drift |
   | Pinch (index + thumb, hold briefly) | Open circle of fifths — move hand over a key, release to select |
   | ? icon | Show controls reference |
   | Tap / click | Start audio (browser requirement) |

   > Gestures require a brief hold (~0.5 seconds) before activating, to reduce false positives during performance.

6. **How it sounds** — short prose: a sustained choir drone, four-voice major chord (root, fifth, octave, third), timbre crossfades from warm triangle to bright sawtooth, stereo width opens the sound into the room
7. **Technical highlights** — for portfolio viewers: WebGL GPU-accelerated ASCII rendering via custom GLSL shaders (`shaders/ascii.vert` / `shaders/ascii.frag`) + Three.js instanced geometry, real-time hand tracking via MediaPipe Hands, audio synthesis via Tone.js with dual-channel crossfade architecture, iOS silent mode bypass
8. **Browser / device notes** — Chrome or Edge required (WebGL + MediaPipe), webcam required, works on desktop and mobile/tablet

---

## Improvement 1: Fix Startup Screen Copy

**File:** `main.js`

**Problem:** The startup overlay currently reads:
- "LEFT HAND controls pitch density"
- "RIGHT HAND controls color"

This is backwards from the performer's perspective. Because the webcam feed is mirrored, MediaPipe's "Left" label corresponds to the performer's right hand. The performer's right fist controls tone/texture; the performer's left fist controls space/drift.

**Fix:** Update the two `createWarblyText` calls in `initStartupOverlay()`:
- Line 1: "RIGHT HAND controls tone"
- Line 2: "LEFT HAND controls space"

---

## Improvement 2: Persistent Key Indicator

**Files:** `index.html` (add element + styles), `main.js` (update on key change)

**Problem:** The current root key is only visible during an active pinch gesture. Musicians need to know their key at a glance during performance without triggering the circle of fifths overlay.

**Design:**
- Small fixed element, bottom-right corner, always visible after audio starts
- Shows current key name (e.g. `C`, `F#`, `Bb`)
- Styled consistently with the rest of the UI: monospace, green border, dark background
- Hidden initially (before audio starts), shown after first successful audio init
- Updates whenever `setKey()` is called in `main.js`

**Implementation scope:**
- Add `#key-indicator` div to `index.html` with matching CSS
- In `main.js`, immediately after calling `hideStartupOverlay()` (do not wait for the 500ms fade-out to complete), show the indicator and set its initial text content to `currentKey` (which is `'C'` by default) — the indicator should appear concurrently with the startup overlay fading out, not after it is removed from the DOM
- In the `onHandResults` key-change branch (where `currentKey` is updated and `audioEngine.setKey()` is called), also update the indicator's text content

---

## Improvement 3: OG Meta Tags

**File:** `index.html`

**Problem:** Sharing the GitHub Pages URL produces a bare, unformatted link with no preview. For a portfolio project, every share should look intentional.

**Tags to add:**
- `og:title` — "Hand-Controlled Drone Synthesizer"
- `og:description` — concise description of what it is and how it works
- `og:type` — "website"
- `og:image` — placeholder pointing to a screenshot (to be added to repo after demo recording)
- `twitter:card` — "summary_large_image"
- `twitter:title` — same as og:title
- `twitter:description` — same as og:description
- Update `<title>` to match: "Hand-Controlled Drone Synthesizer"

**Note:** The `og:image` URL will need updating once a screenshot/thumbnail is captured and committed to the repo.

---

## Out of Scope (Future)

- Instrument preset switching (synth / choir / string / sine) — gesture-triggered, deferred
- Major/minor toggle — keyboard shortcut not appropriate for mobile/tablet-first use case; could be a gesture in future
- Any build tooling or dependency changes
