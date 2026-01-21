// Main application - initialization, callbacks, and animation loop

// Startup overlay utilities
function createWarblyText(text, container) {
    container.innerHTML = '';
    for (let i = 0; i < text.length; i++) {
        const span = document.createElement('span');
        span.textContent = text[i] === ' ' ? '\u00A0' : text[i];
        // Random animation delay for organic feel
        span.style.animationDelay = `${Math.random() * 2}s`;
        container.appendChild(span);
    }
}

function initStartupOverlay() {
    const titleEl = document.querySelector('.startup-title');
    const subtitleEl = document.querySelector('.startup-subtitle');

    if (titleEl) {
        createWarblyText('TAP TO START', titleEl);
    }
    if (subtitleEl) {
        // Create two lines with a break between them
        const line1 = document.createElement('div');
        const line2 = document.createElement('div');
        createWarblyText('LEFT HAND controls pitch density', line1);
        createWarblyText('RIGHT HAND controls color', line2);
        subtitleEl.appendChild(line1);
        subtitleEl.appendChild(line2);
    }
}

function hideStartupOverlay() {
    const overlay = document.getElementById('startup-overlay');
    if (overlay) {
        overlay.classList.add('hidden');
        // Remove from DOM after transition
        setTimeout(() => {
            overlay.remove();
        }, 500);
    }
}

// Logging utilities
const logDiv = document.getElementById('log');

function addLog(message, type = 'info') {
    if (!window.DEBUG) return;
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    logDiv.appendChild(entry);
    logDiv.scrollTop = logDiv.scrollHeight;

    // Keep log manageable
    while (logDiv.children.length > 20) {
        logDiv.removeChild(logDiv.firstChild);
    }
}

function debugLog(...args) {
    if (window.DEBUG) {
        console.log(...args);
    }
}

// Global references
let asciiRenderer = null;
let detector = null;
let audioEngine = null;
let keyOverlay = null;

// Key selection state
let currentKey = 'C';
let hoveredKey = null;
let wasPinching = false;

// Validate rotation value, defaulting to 0 if invalid
function validateRotation(value) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return 0;
    }
    return value;
}

// Hand results callback
function onHandResults(results) {
    // Validate inputs before use
    const leftRotation = validateRotation(results.leftRotation);
    const rightRotation = validateRotation(results.rightRotation);

    // Handle pinch gesture for key selection
    const isPinching = results.pinch && results.pinch.active;

    if (isPinching) {
        // Flip x coordinate to match mirrored video
        const flippedPosition = {
            x: 1 - results.pinch.position.x,
            y: results.pinch.position.y
        };

        // Show overlay and track hovered key
        if (keyOverlay) {
            keyOverlay.show();
            keyOverlay.setPinchPosition(flippedPosition);
            hoveredKey = keyOverlay.getKeyAtPosition(flippedPosition);
            keyOverlay.setHoveredKey(hoveredKey);
        }
    } else {
        // Pinch just released - check if we should change key
        if (wasPinching && hoveredKey && hoveredKey !== currentKey) {
            // Confirm key change
            currentKey = hoveredKey;
            if (audioEngine) {
                audioEngine.setKey(currentKey);
            }
            if (keyOverlay) {
                keyOverlay.setCurrentKey(currentKey);
                // Hide overlay after delay to show new key
                keyOverlay.hideWithDelay();
            }
            addLog(`Key changed to ${currentKey}`, 'success');
        } else if (wasPinching) {
            // No key change, hide immediately
            if (keyOverlay) {
                keyOverlay.hide();
            }
        }

        // Clear pinch position
        if (keyOverlay) {
            keyOverlay.setPinchPosition(null);
        }
        hoveredKey = null;

        // Only update effects when not pinching
        if (asciiRenderer) {
            asciiRenderer.setSaturation(leftRotation);
            asciiRenderer.setDrift(rightRotation);
        }
        if (audioEngine) {
            // Map left rotation (0-90) to intensity (0-1)
            audioEngine.setIntensity(Math.abs(leftRotation) / 90);
            // Map right rotation (0-90) to width (0-1)
            audioEngine.setWidth(Math.abs(rightRotation) / 90);
        }
    }

    wasPinching = isPinching;
}

// Animation loop for ASCII rendering
function animate() {
    if (asciiRenderer) {
        asciiRenderer.render();
    }
    requestAnimationFrame(animate);
}

// Initialize on page load
window.addEventListener('load', () => {
    addLog('Page loaded, initializing...', 'info');

    // Initialize startup overlay
    initStartupOverlay();

    try {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const asciiOutput = document.getElementById('ascii-output');

        // Create ASCII renderer
        asciiRenderer = new AsciiRenderer(video, canvas, asciiOutput);
        addLog('ASCII renderer created', 'success');

        // Create key overlay
        keyOverlay = new KeyOverlay('key-overlay');
        addLog('Key overlay created', 'success');

        // Create audio engine
        audioEngine = new AudioEngine();
        addLog('Audio engine created', 'info');

        // Create hand detector
        detector = new HandDetector(onHandResults);
        addLog('Hand detector initialized', 'success');

        // Start animation loop
        animate();
        addLog('Animation loop started', 'success');

        // Start audio on first interaction
        const startAudio = async () => {
            if (!audioEngine) return;

            // Skip if already initialized
            if (audioEngine.isInitialized) {
                document.removeEventListener('click', startAudio);
                document.removeEventListener('keydown', startAudio);
                return;
            }

            try {
                await audioEngine.init();
                addLog('Audio engine started', 'success');
                // Hide startup overlay
                hideStartupOverlay();
                // Only remove listeners after successful init
                document.removeEventListener('click', startAudio);
                document.removeEventListener('keydown', startAudio);
            } catch (err) {
                // Log error but keep listeners for retry
                addLog(`Audio init failed: ${err.message}. Click to retry.`, 'error');
                debugLog('Audio initialization failed:', err);
            }
        };

        document.addEventListener('click', startAudio);
        document.addEventListener('keydown', startAudio);
        addLog('Click anywhere to start audio', 'info');

    } catch (err) {
        addLog(`Failed to initialize: ${err.message}`, 'error');
        debugLog(err);
    }
});

window.addEventListener('error', (event) => {
    addLog(`Error: ${event.message}`, 'error');
});
