# Volume Control via Right Hand Pinch — Design Spec

**Date:** 2026-05-12  
**Status:** Approved

## Overview

Add real-time volume control to the performance. The right hand's thumb+index pinch gesture (y-position) controls master volume. Left hand pinch retains its existing key-selection behavior. Volume locks at last position on release.

## Motivation

The performer currently has no way to control overall output volume during a session. Adding it via the right hand pinch completes a clean left/right hand split:

| Hand | Fist gesture | Pinch gesture |
|------|-------------|---------------|
| Left | Timbre/intensity | Key selection |
| Right | Space/drift/width | Volume |

## Gesture Design

**Gesture**: Thumb tip (landmark 4) + index finger tip (landmark 8) pinch, on the **right hand only**.

**Activation**: Same 450ms hold-to-activate pattern as all existing gestures. Prevents accidental triggers.

**Tracking**: While the right pinch is confirmed-active, the y-position of the midpoint between thumb and index tips maps continuously to volume.

**Release behavior**: Volume locks at the last tracked value when the pinch is released. Does not decay or reset.

**Hand disambiguation**: `HandDetector` already exposes `pinch.hand` in the callback. `main.js` currently ignores it — this change uses it to route left vs. right pinch to different behaviors. No changes to `handDetection.js` required.

## Y-Position to Volume Mapping

MediaPipe y-coordinates: 0 = top of frame, 1 = bottom.

```
normalizedY = clamp(pinch.position.y, 0.1, 0.9)
volume = 1 - ((normalizedY - 0.1) / 0.8)   // 0.0 (silent) to 1.0 (loud)
```

Hand raised (low y) = louder. Hand lowered (high y) = quieter.

The 0.1–0.9 clamp gives comfortable dead zones at the top and bottom of the frame.

## Audio Engine Changes (`audioEngine.js`)

Add `setVolume(volumeAmount)` method following the same pattern as `setIntensity()`:

- **Input**: 0–1 normalized value
- **Controls**: `masterGain.gain`, ramped over 0.05s to prevent clicks
- **Gain range**: 0.0 (silent) → 0.5 (loud)
- **Default**: initialized at 0.25 (halfway, matching current hardcoded value)
- **Pre-init**: queues via `pendingVolume`, applied after init like other parameters
- **Validation**: NaN/out-of-range values fall back to `lastValidVolume`

## Main.js Changes

In `onHandResults`, split pinch handling by `results.pinch.hand`:

```
if pinch.active:
  if pinch.hand === 'left':
    → existing key overlay logic (unchanged)
  if pinch.hand === 'right':
    → read pinch.position.y → compute volume → audioEngine.setVolume()
    → update volume bar UI

if !pinch.active AND wasPinching:
  if last pinch was left:
    → existing key-confirm-or-hide logic (unchanged)
  if last pinch was right:
    → do nothing (volume stays locked)
```

Track `wasPinchingHand` (the hand label of the most recent active pinch) so release logic routes correctly.

## UI — Volume Bar (`index.html` / CSS)

**Position**: Fixed, bottom-right corner.  
**Form**: Vertical bar, ~12px wide, ~120px tall.  
**Fill**: Height percentage = current volume (0–100%). Fills from bottom up.  
**Color**: Matches existing key indicator aesthetic (semi-transparent white/light).  
**States**:
- Idle: subtle opacity (0.4), shows last-locked volume level
- Active (right pinch confirmed): full opacity (1.0), bright fill

No label needed — bar height is self-explanatory in performance context.

## Files Changed

| File | Change |
|------|--------|
| `src/audioEngine.js` | Add `setVolume()`, `pendingVolume`, `lastValidVolume` |
| `src/main.js` | Route pinch by hand, track `wasPinchingHand`, call `setVolume()`, update bar UI |
| `index.html` | Add volume bar DOM element + CSS |

## Out of Scope

- Keyboard shortcut for volume (not needed)
- Smooth volume fade-in on first detection (hold-to-activate already handles abruptness)
- Per-voice volume (masterGain is the right place)
