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

- **WebGL rendering** — ASCII art rendered GPU-side via `THREE.InstancedMesh` and custom GLSL shaders (`src/shaders/ascii.vert` / `src/shaders/ascii.frag`). Each character is a separate instance; color and character index update per frame from webcam pixel data.
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
