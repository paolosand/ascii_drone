// Help Menu - Displays hand gesture controls in a dropdown panel
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
