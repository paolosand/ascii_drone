// ASCII Renderer Class - Converts video frames to colored ASCII art
class AsciiRenderer {
    constructor(video, canvas, outputElement) {
        this.video = video;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.output = outputElement;
        this.width = canvas.width;
        this.height = canvas.height;

        // ASCII characters from dark to light
        this.chars = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

        // Effect parameters
        this.saturationMultiplier = 0;  // 0 = grayscale by default
        this.baseDrift = 2;             // Small constant warble
        this.driftAmount = this.baseDrift;

        // Create random seeds for each character position (for organic drift)
        this.driftSeeds = [];
        for (let i = 0; i < this.width * this.height; i++) {
            this.driftSeeds.push({
                x: Math.random() * Math.PI * 2,
                y: Math.random() * Math.PI * 2,
                speedX: 0.5 + Math.random() * 1.5,
                speedY: 0.5 + Math.random() * 1.5
            });
        }

        // Store span elements for efficient updates
        this.spans = [];
        this.initialized = false;
    }

    // RGB to HSL conversion
    rgbToHsl(r, g, b) {
        r /= 255; g /= 255; b /= 255;
        const max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0;
        } else {
            const d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
                case g: h = ((b - r) / d + 2) / 6; break;
                case b: h = ((r - g) / d + 4) / 6; break;
            }
        }
        return [h, s, l];
    }

    // HSL to RGB conversion
    hslToRgb(h, s, l) {
        let r, g, b;
        if (s === 0) {
            r = g = b = l;
        } else {
            const hue2rgb = (p, q, t) => {
                if (t < 0) t += 1;
                if (t > 1) t -= 1;
                if (t < 1/6) return p + (q - p) * 6 * t;
                if (t < 1/2) return q;
                if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
                return p;
            };
            const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
            const p = 2 * l - q;
            r = hue2rgb(p, q, h + 1/3);
            g = hue2rgb(p, q, h);
            b = hue2rgb(p, q, h - 1/3);
        }
        return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
    }

    // Adjust saturation of RGB color
    adjustSaturation(r, g, b, multiplier) {
        const [h, s, l] = this.rgbToHsl(r, g, b);
        const newS = Math.min(1, s * multiplier);
        return this.hslToRgb(h, newS, l);
    }

    // Set saturation from left hand rotation
    setSaturation(leftRotation) {
        // Map rotation to saturation: 0° = 0 (grayscale), 90° = 2 (hypersaturated)
        this.saturationMultiplier = Math.abs(leftRotation) / 45;
    }

    // Set drift from right hand rotation
    setDrift(rightRotation) {
        // Map rotation to drift: base warble + 0° = 0px extra, 90° = 25px extra
        this.driftAmount = this.baseDrift + Math.abs(rightRotation) / 3.6;
    }

    // Initialize the DOM structure (called once)
    initializeDOM() {
        this.output.innerHTML = '';
        this.spans = [];

        for (let y = 0; y < this.height; y++) {
            const row = document.createElement('div');
            row.style.height = '8px';
            row.style.whiteSpace = 'nowrap';

            for (let x = 0; x < this.width; x++) {
                const span = document.createElement('span');
                span.textContent = ' ';
                span.style.color = '#fff';
                row.appendChild(span);
                this.spans.push(span);
            }
            this.output.appendChild(row);
        }
        this.initialized = true;
    }

    // Render the current video frame as ASCII
    render() {
        if (!this.initialized) {
            this.initializeDOM();
        }

        // Draw video frame to canvas (flipped horizontally for mirror effect)
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, -this.width, 0, this.width, this.height);
        this.ctx.restore();

        // Get pixel data
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        const pixels = imageData.data;

        const time = performance.now() / 1000;

        // Convert each pixel to ASCII
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const i = (y * this.width + x) * 4;
                let r = pixels[i];
                let g = pixels[i + 1];
                let b = pixels[i + 2];

                // Calculate brightness for character selection
                const brightness = (r * 0.299 + g * 0.587 + b * 0.114) / 255;
                const charIndex = Math.floor(brightness * (this.chars.length - 1));
                const char = this.chars[charIndex];

                // Apply saturation adjustment (0 = grayscale, >1 = hypersaturated)
                if (this.saturationMultiplier === 0) {
                    // Grayscale: use brightness for all channels
                    const gray = Math.round(brightness * 255);
                    r = g = b = gray;
                } else {
                    [r, g, b] = this.adjustSaturation(r, g, b, this.saturationMultiplier);
                }

                // Get the span element
                const spanIndex = y * this.width + x;
                const span = this.spans[spanIndex];

                // Update character and color
                span.textContent = char;
                span.style.color = `rgb(${r},${g},${b})`;

                // Apply drift effect (always has base warble)
                const seed = this.driftSeeds[spanIndex];
                const offsetX = Math.sin(time * seed.speedX + seed.x) * this.driftAmount;
                const offsetY = Math.cos(time * seed.speedY + seed.y) * this.driftAmount;
                span.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            }
        }
    }
}
