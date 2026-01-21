# Pinch-to-Change-Key Feature Design

## Overview

Add a pinch gesture that allows users to change the drone's musical key using a circle of fifths overlay. When the user pinches (index finger to thumb) with either hand, an overlay appears showing all 24 major and minor keys. Moving the pinch point to different screen regions selects different keys, with smooth audio transitions.

## Gesture Detection

### Pinch Recognition

A pinch is detected when:
1. **Thumb tip (landmark 4) and index tip (landmark 8) are close together** - distance < 0.05 normalized
2. **Not a fist** - `isFist()` returns false

This ensures pinch and fist gestures are mutually exclusive.

### Callback Data Structure

```javascript
{
  handsDetected,
  leftRotation,
  rightRotation,
  pinch: {
    active: boolean,
    position: {x, y},  // normalized 0-1, null if not pinching
    hand: 'left'|'right'|null
  }
}
```

### Behavior
- Either hand can trigger the pinch
- While pinching, rotation values freeze (saturation/drift controls pause)
- Pinch position = midpoint of thumb tip and index tip

## Circle of Fifths Overlay

### Structure

New `KeyOverlay` class renders a canvas-based overlay with:

- **Outer ring**: 12 major keys in circle of fifths order
  - Clockwise from top: C, G, D, A, E, B, F#/Gb, Db, Ab, Eb, Bb, F
- **Inner ring**: 12 relative minor keys
  - Clockwise from top: Am, Em, Bm, F#m, C#m, G#m/Abm, Ebm, Bbm, Fm, Cm, Gm, Dm
- **Center circle**: Displays current key name

### Visual Style (Hybrid)

- Clean geometric arcs drawn on canvas with semi-transparent dark fill
- Monospace ASCII-style text labels for key names
- Subtle glitch effect: slight random displacement of segment edges, faint scanline overlay
- Color scheme: dark grays (#1a1a1a, #2a2a2a) with white/green (#0f0) text to match ASCII aesthetic

### Selection Feedback

- Hovered segment gets brighter fill/border
- Key label enlarges or pulses when hovered

### Rotation Behavior

The wheel rotates so the current key is always at the 12 o'clock position:
- When a new key is selected, wheel animates rotation to place new key at top
- Center label updates to show new key name

### Visibility

- Hidden by default (opacity 0, pointer-events none)
- Fades in when pinch detected (~200ms transition)
- Fades out when pinch released after confirming selection

## Audio Engine Changes

### Chord Voicing System

Current static chord (C major): C3, G3, C4, E4

Generalized chord structure:
- **Major keys**: root, P5, P8, M3 (e.g., C-G-C-E)
- **Minor keys**: root, P5, P8, m3 (e.g., A-E-A-C)

### New Properties

```javascript
this.currentKey = 'C';        // Key name: 'C', 'G', 'Am', 'F#m', etc.
this.currentRoot = 130.81;    // Root frequency (C3)
this.isMinor = false;         // Major or minor mode
this.glideTime = 0.5;         // Transition time in seconds (configurable)
```

### Frequency Calculation

Root frequencies for all keys (octave 3):
```javascript
const ROOT_FREQUENCIES = {
  'C': 130.81, 'C#': 138.59, 'Db': 138.59,
  'D': 146.83, 'D#': 155.56, 'Eb': 155.56,
  'E': 164.81, 'F': 174.61, 'F#': 185.00,
  'Gb': 185.00, 'G': 196.00, 'G#': 207.65,
  'Ab': 207.65, 'A': 220.00, 'A#': 233.08,
  'Bb': 233.08, 'B': 246.94
};
```

Chord intervals from root:
- Major: [1, 1.5, 2, 2.52] (root, P5, P8, M3+P8)
- Minor: [1, 1.5, 2, 2.4] (root, P5, P8, m3+P8)

### New Method

```javascript
setKey(keyName) {
  // Parse key name (e.g., 'Am' → root='A', minor=true)
  // Calculate new frequencies for all 4 chord tones
  // Glide all oscillators (both rounded and saturated banks)
  // to new frequencies using rampTo() over this.glideTime
}
```

### Smooth Transition

Use Tone.js `frequency.rampTo(newFreq, this.glideTime)` on each FatOscillator to create smooth portamento between keys.

## Integration & Control Flow

### State Flow

```
Pinch detected → Show overlay → Track pinch position →
Highlight hovered segment → Pinch released →
Confirm key → Glide audio → Rotate overlay → Hide overlay
```

### Key Selection Logic

1. Convert pinch position (normalized 0-1) to position relative to screen center
2. Calculate angle from center (0° = top, clockwise positive)
3. Calculate distance from center:
   - Distance < inner radius: center zone (no key change)
   - Distance < outer radius: inner ring (minor keys)
   - Distance >= outer radius: outer ring (major keys)
4. Map angle to segment index (12 segments, 30° each)
5. Apply rotation offset based on current key
6. Return key name for that segment

### State in main.js

```javascript
let currentKey = 'C';
let overlayVisible = false;
let hoveredKey = null;
```

### Updated onHandResults Callback

```javascript
function onHandResults(results) {
  if (results.pinch.active) {
    // Show overlay
    keyOverlay.show();

    // Calculate which key is being hovered
    hoveredKey = keyOverlay.getKeyAtPosition(results.pinch.position);
    keyOverlay.setHoveredKey(hoveredKey);

    // Freeze rotation controls while pinching
  } else {
    // Pinch just released
    if (overlayVisible && hoveredKey && hoveredKey !== currentKey) {
      // Confirm key change
      audioEngine.setKey(hoveredKey);
      currentKey = hoveredKey;
      keyOverlay.setCurrentKey(hoveredKey);
    }

    // Hide overlay
    keyOverlay.hide();
    hoveredKey = null;

    // Resume normal rotation controls
    // ... existing saturation/drift logic
  }
}
```

## File Changes

| File | Changes |
|------|---------|
| `handDetection.js` | Add `isPinch()` method, include pinch data in callback |
| `audioEngine.js` | Add `setKey()`, `glideTime` constant, `ROOT_FREQUENCIES`, chord calculation |
| `keyOverlay.js` | **New file** - Canvas-based circle of fifths overlay class |
| `main.js` | Coordinate pinch state, overlay visibility, key selection logic |
| `index.html` | Add overlay canvas element, include `keyOverlay.js` script |

## Constants

Easily configurable values:
```javascript
// handDetection.js
const PINCH_THRESHOLD = 0.05;  // Normalized distance for pinch detection

// audioEngine.js
this.glideTime = 0.5;  // Key transition time in seconds

// keyOverlay.js
const FADE_DURATION = 200;     // Overlay fade in/out (ms)
const INNER_RADIUS = 0.15;     // Center circle radius (fraction of overlay size)
const MIDDLE_RADIUS = 0.32;    // Inner ring outer edge
const OUTER_RADIUS = 0.45;     // Outer ring outer edge
```
