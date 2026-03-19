// Key Overlay Class - Circle of fifths overlay for key selection
class KeyOverlay {
    // Circle of fifths order (clockwise from top)
    static MAJOR_KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
    static MINOR_KEYS = ['Am', 'Em', 'Bm', 'F#m', 'C#m', 'G#m', 'Ebm', 'Bbm', 'Fm', 'Cm', 'Gm', 'Dm'];

    // Layout constants (fractions of min dimension)
    static CENTER_RADIUS = 0.12;
    static INNER_RADIUS = 0.25;
    static OUTER_RADIUS = 0.42;

    // Animation
    static FADE_DURATION = 200;
    static ROTATION_DURATION = 300;
    static HIDE_DELAY = 1500;  // Delay before hiding after key change (ms)

    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // State
        this.visible = false;
        this.opacity = 0;
        this.currentKey = 'C';
        this.hoveredKey = null;
        this.rotationOffset = 0;  // Radians to rotate so current key is at top
        this.targetRotationOffset = 0;
        this.pinchPosition = null;  // Store pinch position for visual indicator

        // Animation state
        this.fadeStartTime = null;
        this.fadeDirection = 0;  // 1 = fading in, -1 = fading out
        this.rotationStartTime = null;
        this.rotationStartOffset = 0;
        this.hideTimeout = null;

        // Glitch effect seeds
        this.glitchSeeds = [];
        for (let i = 0; i < 24; i++) {
            this.glitchSeeds.push({
                offset: Math.random() * Math.PI * 2,
                speed: 0.5 + Math.random() * 1.5,
                amplitude: 1 + Math.random() * 2
            });
        }

        // Texture integration for WebGL
        this.texture = null;
        this.needsTextureUpdate = false;

        // Resize handler
        this.resize();
        window.addEventListener('resize', () => this.resize());

        // Don't start render loop here - will be called from main render loop
        this.render = this.render.bind(this);
    }

    resize() {
        // Match canvas to window size
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        this.centerX = this.canvas.width / 2;
        this.centerY = this.canvas.height / 2;
        this.minDim = Math.min(this.canvas.width, this.canvas.height);
    }

    show() {
        if (this.visible && this.fadeDirection >= 0) return;

        // Clear any pending hide timeout
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }

        this.visible = true;
        this.fadeDirection = 1;
        this.fadeStartTime = performance.now();
        this.canvas.style.pointerEvents = 'auto';
    }

    hide() {
        if (!this.visible && this.fadeDirection <= 0) return;
        this.fadeDirection = -1;
        this.fadeStartTime = performance.now();
    }

    hideWithDelay(delay = KeyOverlay.HIDE_DELAY) {
        // Schedule hide after delay
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
        }
        this.hideTimeout = setTimeout(() => {
            this.hide();
            this.hideTimeout = null;
        }, delay);
    }

    setPinchPosition(normalizedPos) {
        this.pinchPosition = normalizedPos;
    }

    setCurrentKey(keyName) {
        if (keyName === this.currentKey) return;

        this.currentKey = keyName;

        // Calculate rotation offset to put current key at top
        const keyIndex = this.getKeyIndex(keyName);
        if (keyIndex !== -1) {
            this.rotationStartOffset = this.rotationOffset;
            this.targetRotationOffset = -keyIndex * (Math.PI * 2 / 12);
            this.rotationStartTime = performance.now();
        }
    }

    setHoveredKey(keyName) {
        this.hoveredKey = keyName;
    }

    getKeyIndex(keyName) {
        // Find index in major or minor keys array
        let index = KeyOverlay.MAJOR_KEYS.indexOf(keyName);
        if (index === -1) {
            index = KeyOverlay.MINOR_KEYS.indexOf(keyName);
        }
        return index;
    }

    getKeyAtPosition(normalizedPos) {
        if (!normalizedPos) return null;

        // Convert normalized position (0-1, where 0,0 is top-left in camera view)
        // to canvas coordinates
        const x = normalizedPos.x * this.canvas.width;
        const y = normalizedPos.y * this.canvas.height;

        // Get distance and angle from center
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Calculate radii in pixels
        const centerRadius = KeyOverlay.CENTER_RADIUS * this.minDim;
        const innerRadius = KeyOverlay.INNER_RADIUS * this.minDim;
        const outerRadius = KeyOverlay.OUTER_RADIUS * this.minDim;

        // Check if in center (no change)
        if (distance < centerRadius) {
            return null;
        }

        // Calculate angle (0 = top, clockwise positive)
        // atan2 gives angle from positive x-axis, so we adjust
        let angle = Math.atan2(dx, -dy);  // Swap to make 0 = top
        if (angle < 0) angle += Math.PI * 2;

        // Adjust for current rotation offset
        angle = (angle - this.rotationOffset + Math.PI * 2) % (Math.PI * 2);

        // Calculate segment index (12 segments, 30° each)
        const segmentIndex = Math.floor(angle / (Math.PI * 2 / 12));

        // Determine which ring
        if (distance < innerRadius) {
            // Inner ring - minor keys
            return KeyOverlay.MINOR_KEYS[segmentIndex];
        } else if (distance < outerRadius) {
            // Outer ring - major keys
            return KeyOverlay.MAJOR_KEYS[segmentIndex];
        }

        // Outside the wheel
        return null;
    }

    render() {
        const now = performance.now();

        // Update fade animation
        if (this.fadeStartTime !== null) {
            const elapsed = now - this.fadeStartTime;
            const progress = Math.min(1, elapsed / KeyOverlay.FADE_DURATION);

            if (this.fadeDirection > 0) {
                this.opacity = progress;
            } else {
                this.opacity = 1 - progress;
            }

            if (progress >= 1) {
                this.fadeStartTime = null;
                if (this.fadeDirection < 0) {
                    this.visible = false;
                    this.canvas.style.pointerEvents = 'none';
                }
            }
        }

        // Update rotation animation
        if (this.rotationStartTime !== null) {
            const elapsed = now - this.rotationStartTime;
            const progress = Math.min(1, elapsed / KeyOverlay.ROTATION_DURATION);
            // Ease out
            const eased = 1 - Math.pow(1 - progress, 3);
            this.rotationOffset = this.rotationStartOffset +
                (this.targetRotationOffset - this.rotationStartOffset) * eased;

            if (progress >= 1) {
                this.rotationStartTime = null;
                this.rotationOffset = this.targetRotationOffset;
            }
        }

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Only draw if visible
        if (this.visible || this.opacity > 0) {
            this.ctx.globalAlpha = this.opacity;
            this.drawOverlay(now);
            this.ctx.globalAlpha = 1;
            this.needsTextureUpdate = true;
        }

        // Update texture if needed
        this.updateTexture();
    }

    drawOverlay(time) {
        const ctx = this.ctx;
        const cx = this.centerX;
        const cy = this.centerY;

        // Calculate radii
        const centerRadius = KeyOverlay.CENTER_RADIUS * this.minDim;
        const innerRadius = KeyOverlay.INNER_RADIUS * this.minDim;
        const outerRadius = KeyOverlay.OUTER_RADIUS * this.minDim;

        // Semi-transparent dark background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw scanline effect
        this.drawScanlines(ctx);

        // Draw outer ring (major keys)
        this.drawRing(ctx, cx, cy, innerRadius, outerRadius, KeyOverlay.MAJOR_KEYS, false, time);

        // Draw inner ring (minor keys)
        this.drawRing(ctx, cx, cy, centerRadius, innerRadius, KeyOverlay.MINOR_KEYS, true, time);

        // Draw center circle with current key
        this.drawCenter(ctx, cx, cy, centerRadius);

        // Draw ring borders
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(cx, cy, centerRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
        ctx.stroke();

        // Draw pinch point indicator
        if (this.pinchPosition) {
            this.drawPinchIndicator(ctx);
        }
    }

    drawPinchIndicator(ctx) {
        // Convert normalized position to canvas coordinates
        const x = this.pinchPosition.x * this.canvas.width;
        const y = this.pinchPosition.y * this.canvas.height;

        // Draw outer ring
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.8)';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Draw inner dot
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 255, 0, 0.9)';
        ctx.fill();

        // Draw crosshair
        ctx.strokeStyle = 'rgba(0, 255, 0, 0.6)';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x - 20, y);
        ctx.lineTo(x - 8, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + 20, y);
        ctx.lineTo(x + 8, y);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y - 20);
        ctx.lineTo(x, y - 8);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x, y + 20);
        ctx.lineTo(x, y + 8);
        ctx.stroke();
    }

    drawRing(ctx, cx, cy, innerR, outerR, keys, isMinor, time) {
        const segmentAngle = Math.PI * 2 / 12;

        keys.forEach((key, i) => {
            // Calculate segment angles (with rotation offset)
            const startAngle = i * segmentAngle + this.rotationOffset - Math.PI / 2 - segmentAngle / 2;
            const endAngle = startAngle + segmentAngle;

            // Check if this segment is hovered
            const isHovered = key === this.hoveredKey;
            const isCurrent = key === this.currentKey;

            // Glitch offset
            const glitch = this.glitchSeeds[i + (isMinor ? 12 : 0)];
            const glitchOffset = Math.sin(time / 1000 * glitch.speed + glitch.offset) * glitch.amplitude;

            // Draw segment
            ctx.beginPath();
            ctx.arc(cx, cy, outerR + glitchOffset, startAngle, endAngle);
            ctx.arc(cx, cy, innerR + glitchOffset, endAngle, startAngle, true);
            ctx.closePath();

            // Fill color
            if (isHovered) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.4)';
            } else if (isCurrent) {
                ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
            } else {
                ctx.fillStyle = isMinor ? 'rgba(30, 30, 30, 0.8)' : 'rgba(40, 40, 40, 0.8)';
            }
            ctx.fill();

            // Segment border
            ctx.strokeStyle = isHovered ? 'rgba(0, 255, 0, 0.8)' : 'rgba(100, 100, 100, 0.5)';
            ctx.lineWidth = isHovered ? 3 : 1;
            ctx.stroke();

            // Draw key label
            const midAngle = startAngle + segmentAngle / 2;
            const labelRadius = (innerR + outerR) / 2;
            const labelX = cx + Math.cos(midAngle) * labelRadius;
            const labelY = cy + Math.sin(midAngle) * labelRadius;

            // Font size based on hover state
            const baseFontSize = isMinor ? 14 : 18;
            const fontSize = isHovered ? baseFontSize * 1.3 : baseFontSize;

            ctx.font = `bold ${fontSize}px 'Courier New', monospace`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Text color
            if (isHovered) {
                ctx.fillStyle = '#0f0';
            } else if (isCurrent) {
                ctx.fillStyle = '#0f0';
            } else {
                ctx.fillStyle = '#fff';
            }

            ctx.fillText(key, labelX, labelY);
        });
    }

    drawCenter(ctx, cx, cy, radius) {
        // Center circle background
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
        ctx.fill();

        // Current key label
        ctx.font = `bold 32px 'Courier New', monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = '#0f0';
        ctx.fillText(this.currentKey, cx, cy);
    }

    drawScanlines(ctx) {
        // Subtle scanline effect for glitchy aesthetic
        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        for (let y = 0; y < this.canvas.height; y += 4) {
            ctx.fillRect(0, y, this.canvas.width, 1);
        }
    }

    getCurrentKey() {
        return this.currentKey;
    }

    // Create Three.js texture from canvas
    createTexture() {
        if (typeof THREE === 'undefined') {
            console.warn('THREE.js not loaded, cannot create texture');
            return null;
        }

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;
        return this.texture;
    }

    // Update texture if it exists and needs update
    updateTexture() {
        if (this.texture && this.needsTextureUpdate) {
            this.texture.needsUpdate = true;
            this.needsTextureUpdate = false;
        }
    }

    getCanvas() {
        return this.canvas;
    }
}
