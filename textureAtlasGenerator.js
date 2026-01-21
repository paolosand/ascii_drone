// Texture Atlas Generator - Renders ASCII characters to a texture atlas

class TextureAtlasGenerator {
    constructor(chars, fontSize = 32) {
        this.chars = chars;
        this.fontSize = fontSize;
        this.charWidth = Math.ceil(fontSize * 0.6);  // Monospace width
        this.charHeight = fontSize;

        // Calculate atlas dimensions (square power of 2)
        this.numChars = chars.length;
        this.columns = Math.ceil(Math.sqrt(this.numChars));
        this.rows = Math.ceil(this.numChars / this.columns);

        // Round up to power of 2 for better GPU performance
        this.atlasWidth = this.nextPowerOf2(this.columns * this.charWidth);
        this.atlasHeight = this.nextPowerOf2(this.rows * this.charHeight);

        this.canvas = null;
        this.ctx = null;
        this.texture = null;
    }

    nextPowerOf2(n) {
        return Math.pow(2, Math.ceil(Math.log2(n)));
    }

    generate() {
        // Create offscreen canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.atlasWidth;
        this.canvas.height = this.atlasHeight;
        this.ctx = this.canvas.getContext('2d');

        // Clear to transparent
        this.ctx.clearRect(0, 0, this.atlasWidth, this.atlasHeight);

        // Set up text rendering
        this.ctx.font = `bold ${this.fontSize}px 'Courier New', monospace`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillStyle = '#ffffff';

        // Render each character to the atlas
        for (let i = 0; i < this.numChars; i++) {
            const char = this.chars[i];
            const col = i % this.columns;
            const row = Math.floor(i / this.columns);

            const x = col * this.charWidth + this.charWidth / 2;
            const y = row * this.charHeight + this.charHeight / 2;

            this.ctx.fillText(char, x, y);
        }

        if (window.DEBUG) {
            console.log(`Generated texture atlas: ${this.atlasWidth}x${this.atlasHeight} (${this.columns}x${this.rows} chars)`);
        }

        return this.canvas;
    }

    getAtlasInfo() {
        return {
            canvas: this.canvas,
            width: this.atlasWidth,
            height: this.atlasHeight,
            columns: this.columns,
            rows: this.rows,
            charWidth: this.charWidth,
            charHeight: this.charHeight,
            numChars: this.numChars
        };
    }

    // For debugging - add atlas to DOM
    addToDOM() {
        this.canvas.style.position = 'fixed';
        this.canvas.style.top = '10px';
        this.canvas.style.left = '10px';
        this.canvas.style.zIndex = '10000';
        this.canvas.style.border = '2px solid red';
        this.canvas.style.width = '256px';
        this.canvas.style.height = 'auto';
        document.body.appendChild(this.canvas);
    }
}
