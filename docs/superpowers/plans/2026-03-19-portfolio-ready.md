# Portfolio-Ready Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write a musician-facing README and implement three small improvements (startup copy fix, persistent key indicator, OG meta tags) to make the project portfolio-ready.

**Architecture:** Pure static HTML/JS, no build step. All changes touch `index.html`, `main.js`, or create `README.md`. No new dependencies. Changes are additive and non-breaking.

**Tech Stack:** Vanilla JS, HTML/CSS, Tone.js, Three.js, MediaPipe Hands. Served via GitHub Pages.

> **No test framework exists.** Verification steps use the browser directly. Serve with `python3 -m http.server 8000` and open `http://localhost:8000` in Chrome or Edge (required for WebGL + MediaPipe).

---

## File Map

| File | Change type | Responsibility |
|---|---|---|
| `index.html` | Modify | OG/Twitter meta tags, `<title>`, `#key-indicator` element + CSS |
| `main.js` | Modify | Startup copy strings, show/update key indicator |
| `README.md` | Create | Musician-facing project README |

---

## Task 1: OG Meta Tags + Title

**Files:**
- Modify: `index.html` (inside `<head>`, before the first `<script>` tag)

- [ ] **Step 1: Add meta tags and update title**

Replace the existing `<title>` line in `index.html`:

```html
<title>Hand-Controlled ASCII Camera</title>
```

With:

```html
<title>Hand-Controlled Drone Synthesizer</title>
<meta name="description" content="A live performance drone instrument you control with your hands. No keyboard, no mouse — just gestures.">

<!-- Open Graph -->
<meta property="og:title" content="Hand-Controlled Drone Synthesizer">
<meta property="og:description" content="A live performance drone instrument you control with your hands. Real-time ASCII visuals driven by WebGL. Audio synthesis via Tone.js. Hand tracking via MediaPipe.">
<meta property="og:type" content="website">
<meta property="og:image" content="thumbnail.png">

<!-- Twitter -->
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Hand-Controlled Drone Synthesizer">
<meta name="twitter:description" content="A live performance drone instrument you control with your hands. Real-time ASCII visuals driven by WebGL. Audio synthesis via Tone.js. Hand tracking via MediaPipe.">
```

> `og:image` points to `thumbnail.png` — a placeholder. Update to the full GitHub Pages URL once a screenshot is captured and committed to the repo root.

- [ ] **Step 2: Verify in browser**

Open `http://localhost:8000`. Check the browser tab — it should read "Hand-Controlled Drone Synthesizer". No functional behavior changes.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add OG/Twitter meta tags and update page title"
```

---

## Task 2: Fix Startup Screen Copy

**Files:**
- Modify: `main.js` (`initStartupOverlay` function, lines ~26-29)

- [ ] **Step 1: Update the two warbly text strings**

In `main.js`, find `initStartupOverlay()`. The two `createWarblyText` calls for `line1` and `line2` currently read:

```js
createWarblyText('LEFT HAND controls pitch density', line1);
createWarblyText('RIGHT HAND controls color', line2);
```

Change them to:

```js
createWarblyText('RIGHT HAND controls tone', line1);
createWarblyText('LEFT HAND controls space', line2);
```

- [ ] **Step 2: Verify in browser**

Reload `http://localhost:8000`. The startup overlay should display "RIGHT HAND controls tone" on the first line and "LEFT HAND controls space" on the second. Both lines should have the warbly floating animation. Click to dismiss.

- [ ] **Step 3: Commit**

```bash
git add main.js
git commit -m "fix: correct startup overlay hand labels from performer's perspective"
```

---

## Task 3: Persistent Key Indicator

**Files:**
- Modify: `index.html` — add `#key-indicator` element and CSS
- Modify: `main.js` — show on audio init, update on key change

### Part A: Add the element and styles to index.html

- [ ] **Step 1: Add CSS for `#key-indicator`**

In `index.html`, inside the `<style>` block, add after the `.help-item-desc` rule (near the end of the style block, before the closing `</style>`):

```css
/* Key indicator */
#key-indicator {
    position: fixed;
    bottom: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #0f0;
    border-radius: 5px;
    color: #fff;
    font-family: monospace;
    font-size: 18px;
    padding: 6px 12px;
    z-index: 1000;
    display: none;
}
```

- [ ] **Step 2: Add the `#key-indicator` element to the HTML body**

In `index.html`, add this div after the `#help-panel` div and before the `#key-overlay` canvas:

```html
<div id="key-indicator"></div>
```

The surrounding context looks like:

```html
<div id="help-icon">?</div>
<div id="help-panel" class="hidden"></div>

<div id="key-indicator"></div>   <!-- ADD THIS LINE -->

<canvas id="key-overlay"></canvas>
```

### Part B: Wire up show + update logic in main.js

- [ ] **Step 3: Show the indicator on audio init**

In `main.js`, find the `startAudio` function. After the `hideStartupOverlay()` call (around line 262), add:

```js
hideStartupOverlay();

// Show key indicator immediately (concurrent with overlay fade-out)
const keyIndicator = document.getElementById('key-indicator');
if (keyIndicator) {
    keyIndicator.textContent = currentKey;
    keyIndicator.style.display = 'block';
}
```

- [ ] **Step 4: Update the indicator on key change**

In `main.js`, find the `onHandResults` function. Locate the key-change branch (around lines 112–123). It looks like this:

```js
if (wasPinching && hoveredKey && hoveredKey !== currentKey) {
    currentKey = hoveredKey;
    if (audioEngine) {
        audioEngine.setKey(currentKey);
    }
    if (keyOverlay) {
        keyOverlay.setCurrentKey(currentKey);
        keyOverlay.hideWithDelay();
    }
    addLog(`Key changed to ${currentKey}`, 'success');
}
```

Add the key indicator update **after the `if (audioEngine)` block but still inside the outer `if (wasPinching ...)` block**, before `addLog`. Do not duplicate the existing `audioEngine.setKey()` call — only add the three new lines shown below:

```js
if (wasPinching && hoveredKey && hoveredKey !== currentKey) {
    currentKey = hoveredKey;
    if (audioEngine) {
        audioEngine.setKey(currentKey);
    }
    if (keyOverlay) {
        keyOverlay.setCurrentKey(currentKey);
        keyOverlay.hideWithDelay();
    }
    // ADD ONLY THESE THREE LINES:
    const keyIndicator = document.getElementById('key-indicator');
    if (keyIndicator) {
        keyIndicator.textContent = currentKey;
    }
    addLog(`Key changed to ${currentKey}`, 'success');
}
```

- [ ] **Step 5: Verify in browser**

Reload `http://localhost:8000`:
1. The startup overlay appears — no key indicator visible.
2. Tap or click to start audio — startup overlay fades out, and simultaneously a small box appears bottom-right showing `C`.
3. Use the pinch gesture to open the circle of fifths and select a different key (e.g. `G`) — the indicator should update to `G` immediately after releasing the pinch.

- [ ] **Step 6: Commit**

```bash
git add index.html main.js
git commit -m "feat: add persistent key indicator shown after audio init"
```

---

## Task 4: Write README.md

**Files:**
- Create: `README.md` (repo root)

- [ ] **Step 1: Create README.md**

Create `README.md` at the repo root with this content:

```markdown
# Hand-Controlled Drone Synthesizer

A live performance instrument you control with your hands. No keyboard, no mouse — just gestures.

---

<!-- Demo video coming soon. Record with QuickTime Player and embed here. -->
<!-- Example embed once you have a URL: -->
<!-- [![Demo](thumbnail.png)](https://link-to-video) -->

---

## What it is

A sustained drone synthesizer that responds to your hand movements in real time. Hold a fist with your right hand to shape the tone — from a warm, airy choir to a bright, saturated buzz. Hold a fist with your left hand to open up the stereo space and shift the visual color. Pinch to change the root key. Point your phone or laptop camera at yourself and perform.

## Quick start

1. Open `index.html` in Chrome or Edge (webcam access required)
2. Or serve locally to avoid CORS issues:
   ```bash
   python3 -m http.server 8000
   # Open http://localhost:8000
   ```
3. Tap or click anywhere to start the audio
4. Hold a fist for ~0.5 seconds to activate hand control

> Chrome or Edge required. Safari and Firefox are not supported (WebGL instancing + MediaPipe compatibility).

## Controls

| Control | Effect |
|---|---|
| Right fist (hold briefly, then rotate) | Tone texture — timbre crossfade from soft to bright + filter sweep |
| Left fist (hold briefly, then rotate) | Space — stereo width + visual color drift |
| Pinch (index + thumb, hold briefly) | Open circle of fifths — move hand over a key, release to select |
| `?` icon | Show this controls reference |
| Tap / click | Start audio (browser requirement) |

> Gestures require a brief hold (~0.5 seconds) before activating, to reduce accidental triggers during performance.

## How it sounds

A sustained four-voice major chord (root, fifth, octave, third) built from eight oscillators. At rest the voices are warm triangle waves, like a distant choir. Rotate your right fist to crossfade into sawtooth waves — brighter, richer, more present. Open your left fist to spread the sound into the stereo field and shift the ASCII visuals into color. Change the root key with a pinch gesture using the circle of fifths overlay.

## Technical highlights

- **WebGL rendering** — ASCII art rendered GPU-side via `THREE.InstancedMesh` and custom GLSL shaders (`shaders/ascii.vert` / `shaders/ascii.frag`). Each character is a separate instance; color and character index update per frame from webcam pixel data.
- **Hand tracking** — [MediaPipe Hands](https://developers.google.com/mediapipe/solutions/vision/hand_landmarker) runs in-browser at up to 30fps. Fist and pinch gestures include a 450ms hold-to-activate to reduce false positives.
- **Audio synthesis** — [Tone.js](https://tonejs.github.io/) choir synthesizer with dual-channel crossfade architecture. Rounded (triangle) and saturated (sawtooth) voice banks run simultaneously; their gains crossfade to avoid clicks. Effects chain: filter → chorus → stereo widener → reverb.
- **iOS silent mode** — A silent audio file is played on first interaction to unlock the Web Audio API regardless of the iOS ring/silent switch.
- **Graceful shutdown** — Gain ramps to near-zero on page close and tab switch to prevent audio clicks.

## Browser support

| Browser | Status |
|---|---|
| Chrome (desktop + mobile) | Supported |
| Edge | Supported |
| Safari | Not supported |
| Firefox | Not supported |

Webcam required. Works on desktop, mobile, and tablet.
```

- [ ] **Step 2: Verify the README renders correctly**

Open `README.md` in a Markdown previewer (VS Code preview, GitHub web UI, or similar). Confirm:
- The demo placeholder comment is visible as a comment (not rendered as content)
- The controls table renders correctly
- The technical highlights section is readable

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: add musician-facing README with controls, audio description, and technical highlights"
```

---

## Final Check

- [ ] Reload `http://localhost:8000` one more time and walk through the full flow:
  1. Startup overlay shows correct hand labels ("RIGHT HAND controls tone" / "LEFT HAND controls space")
  2. After tapping to start audio, key indicator appears bottom-right showing `C`
  3. Browser tab reads "Hand-Controlled Drone Synthesizer"
  4. `?` help icon still works
  5. Pinch gesture updates the key indicator
- [ ] Verify README renders on GitHub (push and check `github.com/<your-repo>`)
- [ ] Update `og:image` in `index.html` once a screenshot/thumbnail is captured — change `thumbnail.png` to the full GitHub Pages absolute URL
