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
        createWarblyText('RIGHT HAND controls tone', line1);
        createWarblyText('LEFT HAND controls space', line2);
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
let overlayMesh = null;  // Three.js mesh for overlay compositing

// Key selection state
let currentKey = 'C';
let hoveredKey = null;
let wasPinching = false;
let wasPinchingHand = null;
let currentVolume = 0.5;

// Validate rotation value, defaulting to 0 if invalid
function validateRotation(value) {
    if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
        return 0;
    }
    return value;
}

function updateVolumeBar(volume, active) {
    const container = document.getElementById('volume-bar-container');
    const fill = document.getElementById('volume-bar-fill');
    if (!container || !fill) return;
    fill.style.height = `${Math.round(volume * 100)}%`;
    container.classList.toggle('active', active);
}

// Hand results callback
function onHandResults(results) {
    const leftRotation = validateRotation(results.leftRotation);
    const rightRotation = validateRotation(results.rightRotation);

    const isPinching = results.pinch && results.pinch.active;
    const pinchHand = results.pinch ? results.pinch.hand : null;

    if (isPinching) {
        if (pinchHand === 'left') {
            // Key selection (existing behavior)
            wasPinchingHand = 'left';
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
            wasPinchingHand = 'right';
            const normalizedY = Math.max(0.1, Math.min(0.9, results.pinch.position.y));
            const volume = 1 - ((normalizedY - 0.1) / 0.8);
            currentVolume = volume;
            if (audioEngine) {
                audioEngine.setVolume(volume);
            }
            updateVolumeBar(volume, true);
        }
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

// Animation loop for ASCII rendering
function animate() {
    // Render ASCII layer
    if (asciiRenderer) {
        asciiRenderer.render();
    }

    // Update and render overlay layer (it has its own internal render loop)
    if (keyOverlay) {
        keyOverlay.render();
    }

    requestAnimationFrame(animate);
}

// Initialize on page load
window.addEventListener('load', async () => {
    addLog('Page loaded, initializing...', 'info');

    // Initialize startup overlay
    initStartupOverlay();

    try {
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const webglCanvas = document.getElementById('webgl-canvas');

        // Create WebGL ASCII renderer
        asciiRenderer = new AsciiRendererWebGL(video, canvas, webglCanvas);
        addLog('WebGL ASCII renderer initializing...', 'info');

        // Wait for WebGL renderer to initialize
        try {
            await asciiRenderer.initPromise;
            addLog('WebGL ASCII renderer ready', 'success');
        } catch (err) {
            addLog(`WebGL init failed: ${err.message}`, 'error');
            console.error('WebGL initialization error:', err);
            return;
        }

        // Create key overlay
        keyOverlay = new KeyOverlay('key-overlay');
        addLog('Key overlay created', 'success');

        // Create help menu
        const helpMenu = new HelpMenu();
        addLog('Help menu initialized', 'success');

        // Create overlay texture and add to scene
        const overlayTexture = keyOverlay.createTexture();
        if (overlayTexture && asciiRenderer.renderer) {
            // Create full-screen quad for overlay
            const overlayGeometry = new THREE.PlaneGeometry(2, 2);
            const overlayMaterial = new THREE.ShaderMaterial({
                uniforms: {
                    overlayTexture: { value: overlayTexture }
                },
                vertexShader: `
                    varying vec2 vUv;
                    void main() {
                        vUv = uv;
                        gl_Position = vec4(position, 1.0);
                    }
                `,
                fragmentShader: `
                    uniform sampler2D overlayTexture;
                    varying vec2 vUv;
                    void main() {
                        vec4 overlay = texture2D(overlayTexture, vUv);
                        gl_FragColor = overlay;
                    }
                `,
                transparent: true,
                depthTest: false,
                depthWrite: false
            });
            overlayMesh = new THREE.Mesh(overlayGeometry, overlayMaterial);
            overlayMesh.renderOrder = 999;  // Render on top
            asciiRenderer.scene.add(overlayMesh);
        }

        // Create audio engine
        audioEngine = new AudioEngine();
        addLog('Audio engine created', 'info');

        // Initialize volume bar at default level
        updateVolumeBar(0.5, false);

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

                // Show key indicator immediately (concurrent with overlay fade-out)
                const keyIndicator = document.getElementById('key-indicator');
                if (keyIndicator) {
                    keyIndicator.textContent = currentKey;
                    keyIndicator.style.display = 'block';
                }

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

// Clean up audio on page unload to prevent clicks
window.addEventListener('beforeunload', () => {
    if (audioEngine && audioEngine.isInitialized && audioEngine.masterGain) {
        try {
            const currentTime = Tone.getContext().currentTime;
            audioEngine.masterGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.03);
        } catch (e) {
            // Silently fail on cleanup errors during unload
        }
    }
});

// Also handle visibility change (mobile background/tab switch)
document.addEventListener('visibilitychange', () => {
    if (document.hidden && audioEngine && audioEngine.isInitialized && audioEngine.masterGain) {
        try {
            const currentTime = Tone.getContext().currentTime;
            audioEngine.masterGain.gain.exponentialRampToValueAtTime(0.0001, currentTime + 0.03);
        } catch (e) {
            // Silently fail on cleanup errors during visibility change
        }
    }
});
