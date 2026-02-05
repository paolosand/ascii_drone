# Help Menu Design

## Overview

Add a clickable dropdown help menu in the top left corner that displays hand gesture controls and instructions.

## Visual Design

### Help Icon (Always Visible)

- **Position**: Top left corner (`top: 10px; left: 10px`)
- **Appearance**:
  - Monospace "?" character in a rounded square
  - Size: ~40x40px (easily clickable)
  - Background: rgba(0, 0, 0, 0.9)
  - Border: 2px solid #0f0 (green)
  - Border-radius: 5px
  - Font: Monospace, white text, 24px
  - Cursor: pointer
  - Z-index: 1000

### Dropdown Panel (Toggle Visibility)

- **Position**: Directly below help icon
- **Appearance**:
  - Background: rgba(0, 0, 0, 0.9)
  - Border: 2px solid #0f0
  - Border-radius: 5px
  - Padding: 15px
  - Width: ~320px
  - Z-index: 1000

- **Animation**:
  - Slide down: 0.3s ease-out transition
  - Transform from `translateY(-10px)` to `translateY(0)`
  - Fade from `opacity: 0` to `opacity: 1`

## Content Structure

```
HAND CONTROLS
(Camera view is mirrored)

Left Hand (Fist + Rotation):
  • Visual: Drift
  • Audio: Width (stereo spread)

Right Hand (Fist + Rotation):
  • Visual: Saturation
  • Audio: Intensity (timbre)

Pinch (Index + Thumb):
  • Opens key selector overlay
  • Move hand to hover over key
  • Release to change key
```

### Text Styling

- **"HAND CONTROLS"**: White (#fff), 14px, bold
- **"(Camera view is mirrored)"**: Dim orange (#c93), 11px, italic - draws attention to important note
- **Section headers** (e.g., "Left Hand..."): Light cyan (#4ff), 12px - matches info log entries
- **Bullet points**: Light cyan (#4ff), 11px
- **Descriptions**: Light gray (#888), 11px - matches startup subtitle
- **Font family**: Monospace (matches entire app)

## Interaction Behavior

1. **Click "?" icon** → Panel slides down and becomes visible
2. **Click "?" again** → Panel slides up and disappears
3. **Click outside help menu** → Does NOT close (must click "?" to toggle)
4. **State persistence**: Open/closed state persists during session

## Implementation

### File Structure

**New file**: `helpMenu.js`

**Modified files**:
- `index.html` - Add HTML elements, CSS styles, script reference
- `main.js` - Initialize HelpMenu instance

### HTML Elements (index.html)

Add after startup overlay (around line 181):

```html
<div id="help-icon">?</div>
<div id="help-panel" class="hidden"></div>
```

### CSS Styles (index.html)

```css
#help-icon {
    position: fixed;
    top: 10px;
    left: 10px;
    width: 40px;
    height: 40px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #0f0;
    border-radius: 5px;
    color: #fff;
    font-family: monospace;
    font-size: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 1000;
    user-select: none;
}

#help-icon:hover {
    border-color: #4f4;
}

#help-panel {
    position: fixed;
    top: 60px;
    left: 10px;
    width: 320px;
    background: rgba(0, 0, 0, 0.9);
    border: 2px solid #0f0;
    border-radius: 5px;
    padding: 15px;
    color: #fff;
    font-family: monospace;
    z-index: 1000;
    transition: opacity 0.3s ease-out, transform 0.3s ease-out;
}

#help-panel.hidden {
    opacity: 0;
    transform: translateY(-10px);
    pointer-events: none;
}

#help-panel.visible {
    opacity: 1;
    transform: translateY(0);
}

.help-title {
    font-size: 14px;
    font-weight: bold;
    color: #fff;
    margin-bottom: 5px;
}

.help-note {
    font-size: 11px;
    color: #c93;
    font-style: italic;
    margin-bottom: 12px;
}

.help-section {
    margin-bottom: 12px;
}

.help-section-title {
    font-size: 12px;
    color: #4ff;
    margin-bottom: 4px;
}

.help-item {
    font-size: 11px;
    color: #4ff;
    margin-left: 12px;
    margin-bottom: 2px;
}

.help-item-desc {
    color: #888;
}
```

### JavaScript Class (helpMenu.js)

```javascript
class HelpMenu {
    constructor() {
        this.icon = document.getElementById('help-icon');
        this.panel = document.getElementById('help-panel');
        this.isOpen = false;

        this.setupEventListeners();
        this.populateContent();
    }

    setupEventListeners() {
        this.icon.addEventListener('click', () => this.toggle());
    }

    toggle() {
        this.isOpen = !this.isOpen;

        if (this.isOpen) {
            this.panel.classList.remove('hidden');
            this.panel.classList.add('visible');
        } else {
            this.panel.classList.remove('visible');
            this.panel.classList.add('hidden');
        }
    }

    populateContent() {
        this.panel.innerHTML = `
            <div class="help-title">HAND CONTROLS</div>
            <div class="help-note">(Camera view is mirrored)</div>

            <div class="help-section">
                <div class="help-section-title">Left Hand (Fist + Rotation):</div>
                <div class="help-item">• Visual: <span class="help-item-desc">Drift</span></div>
                <div class="help-item">• Audio: <span class="help-item-desc">Width (stereo spread)</span></div>
            </div>

            <div class="help-section">
                <div class="help-section-title">Right Hand (Fist + Rotation):</div>
                <div class="help-item">• Visual: <span class="help-item-desc">Saturation</span></div>
                <div class="help-item">• Audio: <span class="help-item-desc">Intensity (timbre)</span></div>
            </div>

            <div class="help-section">
                <div class="help-section-title">Pinch (Index + Thumb):</div>
                <div class="help-item">• Opens key selector overlay</div>
                <div class="help-item">• Move hand to hover over key</div>
                <div class="help-item">• Release to change key</div>
            </div>
        `;
    }
}
```

### Integration (main.js)

Add after other component initialization (around line 238):

```javascript
// Create help menu
const helpMenu = new HelpMenu();
addLog('Help menu initialized', 'success');
```

## Technical Considerations

### Z-index Hierarchy

- Key overlay: 1500
- Startup overlay: 2000
- Help menu: 1000 (same as status/log, won't interfere with key selection)

### Mobile Responsiveness

- 40px icon is large enough for touch targets (meets accessibility guidelines)
- Panel width (320px) fits comfortably on mobile screens in portrait mode
- Text remains readable at mobile sizes

### Performance

- No continuous rendering or animation loops
- Simple DOM manipulation on toggle
- No impact on audio/video processing

## Future Enhancements (Out of Scope)

- Keyboard shortcut to toggle help (e.g., "?" key)
- "Don't show again" checkbox
- Expandable sections for advanced tips
- Visual gesture diagrams/animations
