# Volume Control Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add real-time master volume control via right hand thumb+index pinch y-position; left hand pinch retains key selection.

**Architecture:** Route the existing `pinch.hand` field (already tracked, currently ignored) to split pinch behavior by hand. Right pinch y-position maps to `masterGain.gain` via a new `setVolume()` method. Volume locks on release. A persistent vertical bar in the bottom-right shows current level.

**Tech Stack:** Tone.js 14.8.49 (`masterGain.gain.rampTo`), vanilla JS, inline CSS in `index.html`.

---

## File Map

| File | Change |
|------|--------|
| `src/audioEngine.js` | Add `setVolume()`, `pendingVolume`, `lastValidVolume` |
| `index.html` | Add volume bar `<div>` + CSS |
| `src/main.js` | Add `wasPinchingHand`, `currentVolume`, `updateVolumeBar()`; rewrite pinch routing |

---

### Task 1: Add `setVolume()` to AudioEngine

**Files:**
- Modify: `src/audioEngine.js`

- [ ] **Step 1: Add pending/last-valid volume state to the constructor**

In `src/audioEngine.js`, inside the `constructor()` body after `this.pendingWidth = null;` and `this.pendingWidth = null;` (around line 48–50), add:

```js
        this.pendingVolume = null;
        this.lastValidVolume = 0.5;  // 0.5 → gain 0.25, matches hardcoded init value
```

- [ ] **Step 2: Apply pending volume in `_doInit()` after other pending params**

In `_doInit()`, after the block that applies `pendingIntensity` (around line 210), add:

```js
            if (this.pendingVolume !== null) {
                this.setVolume(this.pendingVolume);
                this.pendingVolume = null;
            }
```

- [ ] **Step 3: Add the `setVolume()` method**

Add this method to the `AudioEngine` class after `setIntensity()` (after line 285):

```js
    setVolume(volumeAmount) {
        const validVolume = this._validateNumber(volumeAmount, this.lastValidVolume);
        this.lastValidVolume = validVolume;

        if (!this.isInitialized) {
            this.pendingVolume = validVolume;
            return;
        }

        const v = this._clamp(validVolume, 0, 1);
        // Map 0–1 to gain 0–0.5 (0.5 * 0.5 = 0.25 = current default)
        this.masterGain.gain.rampTo(v * 0.5, 0.05);
    }
```

- [ ] **Step 4: Verify the method is accessible**

Open a browser console on the running page, start audio, then run:
```js
audioEngine.setVolume(0.1)   // should get very quiet
audioEngine.setVolume(1.0)   // should get louder
audioEngine.setVolume(0.5)   // back to default
```
Expected: volume changes smoothly without clicks.

- [ ] **Step 5: Commit**

```bash
git add src/audioEngine.js
git commit -m "feat: add setVolume() to AudioEngine"
```

---

### Task 2: Add Volume Bar UI to `index.html`

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add volume bar CSS**

In `index.html`, inside the `<style>` block, after the `#key-indicator` rule (after line 248), add:

```css
        /* Volume bar */
        #volume-bar-container {
            position: fixed;
            bottom: 60px;
            right: 14px;
            width: 12px;
            height: 120px;
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.2);
            border-radius: 3px;
            z-index: 1000;
            opacity: 0.4;
            transition: opacity 0.2s;
        }
        #volume-bar-container.active {
            opacity: 1.0;
        }
        #volume-bar-fill {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(255, 255, 255, 0.85);
            border-radius: 2px;
            height: 50%;
            transition: height 0.05s linear;
        }
```

- [ ] **Step 2: Add volume bar DOM element**

In `index.html`, after `<div id="key-indicator"></div>` (line 294), add:

```html
    <div id="volume-bar-container">
        <div id="volume-bar-fill"></div>
    </div>
```

- [ ] **Step 3: Verify visually**

Load `index.html` in a browser. Before starting audio, you should see:
- A subtle vertical bar at bottom-right, above the key indicator
- Bar fill at 50% height (default volume)
- Bar is dim (opacity 0.4) while idle

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat: add volume bar UI to index.html"
```

---

### Task 3: Wire Volume Control in `main.js`

**Files:**
- Modify: `src/main.js`

- [ ] **Step 1: Add `wasPinchingHand` and `currentVolume` globals**

In `src/main.js`, after the existing globals block (after `let wasPinching = false;`, around line 77), add:

```js
let wasPinchingHand = null;
let currentVolume = 0.5;
```

- [ ] **Step 2: Add the `updateVolumeBar()` helper function**

In `src/main.js`, after the `validateRotation()` function (after line 85), add:

```js
function updateVolumeBar(volume, active) {
    const container = document.getElementById('volume-bar-container');
    const fill = document.getElementById('volume-bar-fill');
    if (!container || !fill) return;
    fill.style.height = `${Math.round(volume * 100)}%`;
    container.classList.toggle('active', active);
}
```

- [ ] **Step 3: Replace the `onHandResults` pinch block**

Find the full `onHandResults` function in `src/main.js` (lines 88–155) and replace it entirely with:

```js
function onHandResults(results) {
    const leftRotation = validateRotation(results.leftRotation);
    const rightRotation = validateRotation(results.rightRotation);

    const isPinching = results.pinch && results.pinch.active;
    const pinchHand = results.pinch ? results.pinch.hand : null;

    if (isPinching) {
        if (pinchHand === 'left') {
            // Key selection (existing behavior)
            const flippedPosition = {
                x: 1 - results.pinch.position.x,
                y: results.pinch.position.y
            };
            if (keyOverlay) {
                keyOverlay.show();
                keyOverlay.setPinchPosition(flippedPosition);
                hoveredKey = keyOverlay.getKeyAtPosition(flippedPosition);
                keyOverlay.setHoveredKey(hoveredKey);
            }
        } else if (pinchHand === 'right') {
            // Volume control: y-position maps to volume
            const normalizedY = Math.max(0.1, Math.min(0.9, results.pinch.position.y));
            const volume = 1 - ((normalizedY - 0.1) / 0.8);
            currentVolume = volume;
            if (audioEngine) {
                audioEngine.setVolume(volume);
            }
            updateVolumeBar(volume, true);
        }

        wasPinchingHand = pinchHand;
    } else {
        // Pinch just released
        if (wasPinching && wasPinchingHand === 'left') {
            if (hoveredKey && hoveredKey !== currentKey) {
                currentKey = hoveredKey;
                if (audioEngine) {
                    audioEngine.setKey(currentKey);
                }
                if (keyOverlay) {
                    keyOverlay.setCurrentKey(currentKey);
                    keyOverlay.hideWithDelay();
                }
                const keyIndicator = document.getElementById('key-indicator');
                if (keyIndicator) {
                    keyIndicator.textContent = currentKey;
                }
                addLog(`Key changed to ${currentKey}`, 'success');
            } else {
                if (keyOverlay) {
                    keyOverlay.hide();
                }
            }
            if (keyOverlay) {
                keyOverlay.setPinchPosition(null);
            }
            hoveredKey = null;
        } else if (wasPinching && wasPinchingHand === 'right') {
            // Volume stays locked — just dim the bar
            updateVolumeBar(currentVolume, false);
        }

        // Only update effects when not pinching
        if (asciiRenderer) {
            asciiRenderer.setSaturation(leftRotation);
            asciiRenderer.setDrift(rightRotation);
        }
        if (audioEngine) {
            audioEngine.setIntensity(Math.abs(leftRotation) / 90);
            audioEngine.setWidth(Math.abs(rightRotation) / 90);
        }
    }

    wasPinching = isPinching;
}
```

- [ ] **Step 4: Initialize volume bar on page load**

In `src/main.js`, inside the `window.addEventListener('load', async () => { ... })` block, after `audioEngine = new AudioEngine();` (around line 241), add:

```js
        // Initialize volume bar at default level
        updateVolumeBar(0.5, false);
```

- [ ] **Step 5: Commit**

```bash
git add src/main.js
git commit -m "feat: route pinch by hand, wire right pinch to volume control"
```

---

### Task 4: Browser Verification

**Files:** None — manual test only.

Start a local server:
```bash
python3 -m http.server 8000
# Open http://localhost:8000
```

- [ ] **Scenario 1 — Volume bar renders correctly**

Before clicking to start audio:
- Volume bar is visible at bottom-right, fill at 50%
- Bar is dim (opacity 0.4)
- Key indicator is not yet visible (expected)

- [ ] **Scenario 2 — Right hand pinch controls volume**

Start audio (click), then:
1. Form a thumb+index pinch with your right hand
2. Hold 450ms until confirmed active
3. Move hand up → bar fills toward 100%, audio gets louder
4. Move hand down → bar drains toward 0%, audio gets quieter
5. Bar is bright (opacity 1.0) while actively pinching

- [ ] **Scenario 3 — Volume locks on release**

While right pinch is active (mid-volume), release the pinch:
- Audio stays at last volume
- Bar dims back to idle opacity
- Bar height stays at last value

- [ ] **Scenario 4 — Left hand pinch still opens key overlay**

Form a thumb+index pinch with your left hand:
- Key selection overlay appears
- Moving the left pinch navigates keys
- Releasing on a key confirms the change
- No volume change occurs

- [ ] **Scenario 5 — Both hands active simultaneously**

Hold left fist (intensity) and right fist (drift) — confirm those still work normally. Then switch to right pinch — confirm volume still responds. Confirm no cross-contamination between gestures.

- [ ] **Scenario 6 — Volume persists across key changes**

Set volume to ~20% with right pinch. Then use left pinch to change key. Confirm volume did not reset.
