class HandDetector {
    // Pinch detection threshold (normalized distance)
    static PINCH_THRESHOLD = 0.05;

    // Hold-to-activate duration in milliseconds
    static HOLD_DURATION_MS = 450;

    constructor(onResultsCallback) {
        this.onResultsCallback = onResultsCallback;
        this.hands = null;
        this.camera = null;
        this.video = null;
        this.canvas = null;
        this.ctx = null;
        this.statusDiv = null;

        this.hand1Rotation = 0;
        this.hand2Rotation = 0;
        this.lastLeftRotation = 0;
        this.lastRightRotation = 0;
        this.lastFrameTime = 0;
        this.frameCount = 0;
        this.fps = 0;
        this.isInitialized = false;
        this.noDetectionCount = 0;
        this.maxNoDetection = 300;

        // Pinch state
        this.pinchActive = false;
        this.pinchPosition = null;
        this.pinchHand = null;

        // Hold-to-activate state tracking
        this.fistHoldStart = { left: null, right: null };
        this.pinchHoldStart = null;
        this.fistActive = { left: false, right: false };
        this.pinchActiveConfirmed = false;

        this.init();
    }
    
    async init() {
        try {
            if (window.DEBUG) console.log('Initializing MediaPipe Hands...');
            
            this.video = document.getElementById('video');
            this.canvas = document.getElementById('canvas');
            this.ctx = this.canvas.getContext('2d');
            this.statusDiv = document.getElementById('status');
            
            this.hands = new Hands({
                locateFile: (file) => {
                    if (window.DEBUG) console.log(`Loading ${file}...`);
                    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
                }
            });
            
            this.hands.setOptions({
                maxNumHands: 2,
                modelComplexity: 1,
                minDetectionConfidence: 0.5,
                minTrackingConfidence: 0.5
            });
            
            this.hands.onResults((results) => this.onResults(results));
            
            this.camera = new Camera(this.video, {
                onFrame: async () => {
                    try {
                        await this.hands.send({image: this.video});
                    } catch (err) {
                        console.error('Frame processing error:', err);
                    }
                },
                width: 640,
                height: 480
            });
            
            await this.camera.start();
            this.isInitialized = true;
            if (window.DEBUG) console.log('MediaPipe Hands initialized successfully!');

            if (window.DEBUG) this.updateStatus('Camera started. Show your hands!');
        } catch (err) {
            if (window.DEBUG) console.error('Initialization error:', err);
            if (window.DEBUG) this.updateStatus('Error: ' + err.message);
        }
    }
    
    calculateHandRotation(landmarks) {
        const wrist = landmarks[0];
        const middleFingerMCP = landmarks[9];
        const middleFingerTip = landmarks[12];
        
        const dx = middleFingerTip.x - wrist.x;
        const dy = middleFingerTip.y - wrist.y;
        
        let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
        
        if (angle < -180) angle += 360;
        if (angle > 180) angle -= 360;
        
        return Math.max(-90, Math.min(90, angle));
    }
    
    isFist(landmarks) {
        const fingerTips = [4, 8, 12, 16, 20];
        const fingerMCPs = [2, 5, 9, 13, 17];

        let foldedFingers = 0;

        for (let i = 0; i < fingerTips.length; i++) {
            const tip = landmarks[fingerTips[i]];
            const mcp = landmarks[fingerMCPs[i]];

            if (tip.y > mcp.y) {
                foldedFingers++;
            }
        }

        return foldedFingers >= 4;
    }

    isPinch(landmarks) {
        // Check if thumb tip (4) and index tip (8) are close together
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];

        const dx = thumbTip.x - indexTip.x;
        const dy = thumbTip.y - indexTip.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Pinch detected if close together AND not a fist
        return distance < HandDetector.PINCH_THRESHOLD && !this.isFist(landmarks);
    }

    getPinchPosition(landmarks) {
        // Return midpoint between thumb tip and index tip
        const thumbTip = landmarks[4];
        const indexTip = landmarks[8];

        return {
            x: (thumbTip.x + indexTip.x) / 2,
            y: (thumbTip.y + indexTip.y) / 2
        };
    }
    
    getHandRotationAngle(results) {
        let leftRotation = this.lastLeftRotation;
        let rightRotation = this.lastRightRotation;

        const now = performance.now();

        // Track which hands/gestures are detected this frame
        let leftFistDetected = false;
        let rightFistDetected = false;
        let pinchDetected = false;
        let pinchData = null;

        if (results.multiHandLandmarks && results.multiHandedness) {
            if (window.DEBUG) console.log(`Detected ${results.multiHandLandmarks.length} hand(s)`);

            results.multiHandedness.forEach((handedness, index) => {
                const landmarks = results.multiHandLandmarks[index];
                const rotation = this.calculateHandRotation(landmarks);
                const isFist = this.isFist(landmarks);
                const isPinch = this.isPinch(landmarks);
                const label = handedness.label;
                const confidence = (handedness.score * 100).toFixed(0);

                if (window.DEBUG) console.log(`${label} hand: ${rotation.toFixed(1)}° (confidence: ${confidence}%, fist: ${isFist}, pinch: ${isPinch})`);

                // Check for pinch gesture (takes priority)
                if (isPinch) {
                    pinchDetected = true;
                    pinchData = {
                        position: this.getPinchPosition(landmarks),
                        hand: label.toLowerCase()
                    };
                }

                // Check for fist gesture (only if not pinching)
                if (isFist && !isPinch) {
                    if (label === 'Left') {
                        leftFistDetected = true;
                        // Store rotation for potential activation
                        this.hand1Rotation = rotation;
                    } else {
                        rightFistDetected = true;
                        this.hand2Rotation = rotation;
                    }
                }
            });
        }

        // Process left fist hold-to-activate
        if (leftFistDetected) {
            if (this.fistHoldStart.left === null) {
                // Fist just detected, start timer
                this.fistHoldStart.left = now;
            } else if (!this.fistActive.left && (now - this.fistHoldStart.left >= HandDetector.HOLD_DURATION_MS)) {
                // Hold duration met, activate
                this.fistActive.left = true;
                if (window.DEBUG) console.log('Left fist activated after hold');
            }

            // If active, update rotation
            if (this.fistActive.left) {
                this.lastLeftRotation = this.hand1Rotation;
            }
        } else {
            // Fist not detected, reset
            this.fistHoldStart.left = null;
            this.fistActive.left = false;
        }

        // Process right fist hold-to-activate
        if (rightFistDetected) {
            if (this.fistHoldStart.right === null) {
                this.fistHoldStart.right = now;
            } else if (!this.fistActive.right && (now - this.fistHoldStart.right >= HandDetector.HOLD_DURATION_MS)) {
                this.fistActive.right = true;
                if (window.DEBUG) console.log('Right fist activated after hold');
            }

            if (this.fistActive.right) {
                this.lastRightRotation = this.hand2Rotation;
            }
        } else {
            this.fistHoldStart.right = null;
            this.fistActive.right = false;
        }

        // Process pinch hold-to-activate
        if (pinchDetected) {
            if (this.pinchHoldStart === null) {
                // Pinch just detected, start timer
                this.pinchHoldStart = now;
                this.pinchActiveConfirmed = false;
            } else if (!this.pinchActiveConfirmed && (now - this.pinchHoldStart >= HandDetector.HOLD_DURATION_MS)) {
                // Hold duration met, activate
                this.pinchActiveConfirmed = true;
                if (window.DEBUG) console.log('Pinch activated after hold');
            }

            // Update pinch state if confirmed
            if (this.pinchActiveConfirmed) {
                this.pinchActive = true;
                this.pinchPosition = pinchData.position;
                this.pinchHand = pinchData.hand;
            } else {
                this.pinchActive = false;
                this.pinchPosition = null;
                this.pinchHand = null;
            }
        } else {
            // Pinch not detected, reset
            this.pinchHoldStart = null;
            this.pinchActiveConfirmed = false;
            this.pinchActive = false;
            this.pinchPosition = null;
            this.pinchHand = null;
        }

        leftRotation = this.lastLeftRotation;
        rightRotation = this.lastRightRotation;

        return { left: leftRotation, right: rightRotation };
    }
    
    onResults(results) {
        if (!this.isInitialized) return;

        const now = performance.now();

        this.frameCount++;
        if (now - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = now;
        }

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);

        const rotations = this.getHandRotationAngle(results);
        this.hand1Rotation = rotations.left;
        this.hand2Rotation = rotations.right;

        const handsDetected = results.multiHandLandmarks ? results.multiHandLandmarks.length : 0;

        if (handsDetected === 0) {
            this.noDetectionCount++;
            if (window.DEBUG) console.log(`No hands detected for ${this.noDetectionCount} frames`);

            if (this.noDetectionCount >= this.maxNoDetection) {
                if (window.DEBUG) console.warn('No hands detected for too long, restarting camera...');
                if (window.DEBUG) this.updateStatus('Restarting camera...');
                this.restartCamera();
            }
        } else {
            this.noDetectionCount = 0;
        }
        
        if (window.DEBUG) {
            const now = performance.now();

            // Calculate hold progress
            const leftFistProgress = this.fistHoldStart.left
                ? Math.min(100, ((now - this.fistHoldStart.left) / HandDetector.HOLD_DURATION_MS * 100)).toFixed(0)
                : 0;
            const rightFistProgress = this.fistHoldStart.right
                ? Math.min(100, ((now - this.fistHoldStart.right) / HandDetector.HOLD_DURATION_MS * 100)).toFixed(0)
                : 0;
            const pinchProgress = this.pinchHoldStart
                ? Math.min(100, ((now - this.pinchHoldStart) / HandDetector.HOLD_DURATION_MS * 100)).toFixed(0)
                : 0;

            const leftFistStatus = this.fistActive.left ? '✓ ACTIVE' : (leftFistProgress > 0 ? `${leftFistProgress}%` : 'none');
            const rightFistStatus = this.fistActive.right ? '✓ ACTIVE' : (rightFistProgress > 0 ? `${rightFistProgress}%` : 'none');
            const pinchStatus = this.pinchActiveConfirmed ? `✓ ACTIVE (${this.pinchHand})` : (pinchProgress > 0 ? `${pinchProgress}%` : 'none');

            this.updateStatus(`
                Hands Detected: ${handsDetected}<br>
                Left Fist: ${leftFistStatus} (${this.hand1Rotation.toFixed(1)}°)<br>
                Right Fist: ${rightFistStatus} (${this.hand2Rotation.toFixed(1)}°)<br>
                Pinch: ${pinchStatus}<br>
                FPS: ${this.fps}
            `);
        }
        
        if (this.onResultsCallback) {
            this.onResultsCallback({
                handsDetected,
                leftRotation: this.hand1Rotation,
                rightRotation: this.hand2Rotation,
                fps: this.fps,
                pinch: {
                    active: this.pinchActive,
                    position: this.pinchPosition,
                    hand: this.pinchHand
                }
            });
        }
    }
    
    updateStatus(message) {
        if (this.statusDiv) {
            this.statusDiv.innerHTML = message;
        }
    }
    
    async restartCamera() {
        try {
            if (this.camera) {
                await this.camera.stop();
            }
            await this.camera.start();
            this.noDetectionCount = 0;
            if (window.DEBUG) this.updateStatus('Camera restarted');
            if (window.DEBUG) console.log('Camera restarted successfully');
        } catch (err) {
            if (window.DEBUG) console.error('Error restarting camera:', err);
            if (window.DEBUG) this.updateStatus('Error restarting camera');
        }
    }
}