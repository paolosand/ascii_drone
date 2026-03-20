// ASCII Renderer WebGL Class - GPU-accelerated ASCII art rendering using Three.js

class AsciiRendererWebGL {
    constructor(video, canvas, container) {
        this.video = video;
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.container = container;
        this.width = canvas.width;
        this.height = canvas.height;

        // ASCII characters from dark to light
        this.chars = ' .\'`^",:;Il!i><~+_-?][}{1)(|/tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$';

        // Effect parameters
        this.baseDrift = 2;
        this.driftAmount = this.baseDrift;

        // Three.js setup
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.material = null;
        this.mesh = null;
        this.videoTexture = null;

        // Character atlas
        this.atlasGenerator = null;
        this.atlasTexture = null;
        this.atlasInfo = null;

        // Instance data
        this.numInstances = this.width * this.height;
        this.instancePositions = null;
        this.instanceCharIndices = null;
        this.instanceColors = null;
        this.instanceDriftSeeds = null;

        // Initialization state
        this.isReady = false;
        this.initPromise = null;

        // Load shaders and initialize (but don't await in constructor)
        this.initPromise = this.init();
    }

    async init() {
        try {
            // Generate character atlas
            this.atlasGenerator = new TextureAtlasGenerator(this.chars, 32);
            const atlasCanvas = this.atlasGenerator.generate();
            this.atlasInfo = this.atlasGenerator.getAtlasInfo();

            // Debug: show atlas
            // this.atlasGenerator.addToDOM();

            // Create Three.js renderer
            this.renderer = new THREE.WebGLRenderer({
                canvas: this.container,
                alpha: true,
                antialias: false
            });
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.renderer.setClearColor(0x000000, 1);

            // Create scene
            this.scene = new THREE.Scene();

            // Create orthographic camera
            this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
            this.camera.position.z = 1;

            // Load shaders
            const vertexShader = await this.loadShader('src/shaders/ascii.vert');
            const fragmentShader = await this.loadShader('src/shaders/ascii.frag');

            // Create atlas texture
            this.atlasTexture = new THREE.CanvasTexture(atlasCanvas);
            this.atlasTexture.minFilter = THREE.LinearFilter;
            this.atlasTexture.magFilter = THREE.LinearFilter;

            // Setup instance attributes
            this.setupInstancedGeometry();

            // Create shader material
            this.material = new THREE.ShaderMaterial({
                vertexShader,
                fragmentShader,
                uniforms: {
                    time: { value: 0 },
                    driftAmount: { value: this.baseDrift * 0.001 },
                    charAtlas: { value: this.atlasTexture },
                    atlasColumns: { value: this.atlasInfo.columns },
                    atlasRows: { value: this.atlasInfo.rows },
                    saturation: { value: 0 }
                },
                transparent: true,
                depthTest: false,
                depthWrite: false
            });

            // Create instanced mesh
            const geometry = new THREE.PlaneGeometry(1, 1);
            this.mesh = new THREE.InstancedMesh(geometry, this.material, this.numInstances);
            this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

            // Set instance attributes
            geometry.setAttribute('instanceCharIndex', this.instanceCharIndices);
            geometry.setAttribute('instanceColor', this.instanceColors);
            geometry.setAttribute('instanceDriftSeed', this.instanceDriftSeeds);

            // Set instance matrices for positioning
            this.updateInstanceMatrices();

            this.scene.add(this.mesh);

            // Handle window resize
            window.addEventListener('resize', () => this.onResize());

            this.isReady = true;

            if (window.DEBUG) {
                console.log('WebGL ASCII renderer initialized');
            }
        } catch (err) {
            console.error('Failed to initialize WebGL renderer:', err);
            this.isReady = false;
        }
    }

    async loadShader(path) {
        try {
            const response = await fetch(path);
            if (!response.ok) {
                throw new Error(`Failed to load shader: ${path} - ${response.status}`);
            }
            const text = await response.text();
            if (window.DEBUG) {
                console.log(`Loaded shader: ${path} (${text.length} bytes)`);
            }
            return text;
        } catch (err) {
            console.error(`Shader load error for ${path}:`, err);
            throw err;
        }
    }

    setupInstancedGeometry() {
        // Create instance attribute arrays
        const charIndices = new Float32Array(this.numInstances);
        const colors = new Float32Array(this.numInstances * 3);
        const driftSeeds = new Float32Array(this.numInstances * 2);

        // Store grid positions for matrix updates
        this.gridPositions = [];

        let idx = 0;
        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                // Store grid position for later
                this.gridPositions.push({ x, y });

                // Initial char index (will be updated each frame)
                charIndices[idx] = 0;

                // Initial color (white)
                colors[idx * 3] = 1;
                colors[idx * 3 + 1] = 1;
                colors[idx * 3 + 2] = 1;

                // Random drift seeds
                driftSeeds[idx * 2] = Math.random();
                driftSeeds[idx * 2 + 1] = Math.random();

                idx++;
            }
        }

        this.instanceCharIndices = new THREE.InstancedBufferAttribute(charIndices, 1);
        this.instanceColors = new THREE.InstancedBufferAttribute(colors, 3);
        this.instanceDriftSeeds = new THREE.InstancedBufferAttribute(driftSeeds, 2);

        this.instanceCharIndices.setUsage(THREE.DynamicDrawUsage);
        this.instanceColors.setUsage(THREE.DynamicDrawUsage);
    }

    updateInstanceMatrices() {
        const dummy = new THREE.Object3D();
        const charWidth = 2.0 / this.width;
        const charHeight = 2.0 / this.height;

        for (let i = 0; i < this.numInstances; i++) {
            const gridPos = this.gridPositions[i];

            // Convert grid position to normalized coords (-1 to 1)
            const x = (gridPos.x / this.width) * 2 - 1;
            const y = -((gridPos.y / this.height) * 2 - 1); // Flip Y

            dummy.position.set(x, y, 0);
            dummy.scale.set(charWidth, charHeight, 1);
            dummy.updateMatrix();

            this.mesh.setMatrixAt(i, dummy.matrix);
        }

        this.mesh.instanceMatrix.needsUpdate = true;
    }

    setSaturation(leftRotation) {
        if (this.material) {
            this.material.uniforms.saturation.value = Math.abs(leftRotation) / 45;
        }
    }

    setDrift(rightRotation) {
        this.driftAmount = this.baseDrift + Math.abs(rightRotation) / 3.6;
    }

    render() {
        if (!this.isReady || !this.renderer || !this.material) return;

        // Draw video frame to canvas (flipped horizontally)
        this.ctx.save();
        this.ctx.scale(-1, 1);
        this.ctx.drawImage(this.video, -this.width, 0, this.width, this.height);
        this.ctx.restore();

        // Get pixel data
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        const pixels = imageData.data;

        // Update instance attributes based on video pixels
        const charIndices = this.instanceCharIndices.array;
        const colors = this.instanceColors.array;

        for (let y = 0; y < this.height; y++) {
            for (let x = 0; x < this.width; x++) {
                const pixelIdx = (y * this.width + x) * 4;
                const instanceIdx = y * this.width + x;

                const r = pixels[pixelIdx] / 255;
                const g = pixels[pixelIdx + 1] / 255;
                const b = pixels[pixelIdx + 2] / 255;

                // Character selection based on brightness
                const brightness = r * 0.299 + g * 0.587 + b * 0.114;
                charIndices[instanceIdx] = Math.floor(brightness * (this.chars.length - 1));

                // Raw color — saturation handled in shader
                colors[instanceIdx * 3] = r;
                colors[instanceIdx * 3 + 1] = g;
                colors[instanceIdx * 3 + 2] = b;
            }
        }

        // Mark attributes as needing update
        this.instanceCharIndices.needsUpdate = true;
        this.instanceColors.needsUpdate = true;

        // Update uniforms
        this.material.uniforms.time.value = performance.now() / 1000;
        // Convert drift from pixels to normalized coordinates
        const driftNormalized = this.driftAmount * (2.0 / Math.min(window.innerWidth, window.innerHeight));
        this.material.uniforms.driftAmount.value = driftNormalized;

        if (window.DEBUG && Math.random() < 0.01) {
            console.log(`Drift: ${this.driftAmount}px -> ${driftNormalized} norm, Saturation: ${this.material.uniforms.saturation.value}`);
        }

        // Render scene
        this.renderer.render(this.scene, this.camera);
    }

    onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    getRenderer() {
        return this.renderer;
    }
}
