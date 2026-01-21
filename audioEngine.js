// Audio Engine Class - Tone.js-based choir synthesizer
class AudioEngine {
    // State constants
    static STATE = {
        UNINITIALIZED: 'uninitialized',
        INITIALIZING: 'initializing',
        INITIALIZED: 'initialized',
        ERROR: 'error'
    };

    // Root frequencies for all keys (octave 3)
    static ROOT_FREQUENCIES = {
        'C': 130.81, 'C#': 138.59, 'Db': 138.59,
        'D': 146.83, 'D#': 155.56, 'Eb': 155.56,
        'E': 164.81, 'F': 174.61, 'F#': 185.00,
        'Gb': 185.00, 'G': 196.00, 'G#': 207.65,
        'Ab': 207.65, 'A': 220.00, 'A#': 233.08,
        'Bb': 233.08, 'B': 246.94
    };

    // Interval ratios for chord voicing
    // [root, fifth, octave, third+octave]
    static MAJOR_INTERVALS = [1, 1.5, 2, 2.52];  // M3 = 5/4 * 2 = 2.52 approx
    static MINOR_INTERVALS = [1, 1.5, 2, 2.4];   // m3 = 6/5 * 2 = 2.4

    constructor() {
        // Dual-channel voice system for smooth crossfade
        this.roundedVoices = [];    // Triangle FatOscillators (warm, mellow)
        this.saturatedVoices = [];  // Sawtooth FatOscillators (bright, aggressive)
        this.roundedGain = null;    // Gain node for rounded channel
        this.saturatedGain = null;  // Gain node for saturated channel
        this.roundedLFOs = [];      // LFOs for rounded voices
        this.saturatedLFOs = [];    // LFOs for saturated voices
        this.voiceMixer = null;     // Gain for mixing voices

        // Effects chain
        this.filter = null;         // Lowpass (controlled by intensity)
        this.chorus = null;         // Chorus (controlled by width)
        this.stereoWidener = null;  // Stereo spread (controlled by width)
        this.reverb = null;         // Choir ambience
        this.masterGain = null;

        // State machine
        this.state = AudioEngine.STATE.UNINITIALIZED;
        this.initPromise = null;

        // Parameter queuing for pre-init calls
        this.pendingIntensity = null;
        this.pendingWidth = null;

        // Last valid values for NaN fallback
        this.lastValidIntensity = 0;
        this.lastValidWidth = 0;

        // Key state
        this.currentKey = 'C';
        this.isMinor = false;
        this.glideTime = 0.5;  // Configurable transition time in seconds

        // C major chord voicing: C3, G3, C4, E4
        this.baseFreqs = [130.81, 196.00, 261.63, 329.63];
    }

    // Convenience getter for backwards compatibility
    get isInitialized() {
        return this.state === AudioEngine.STATE.INITIALIZED;
    }

    // Validate a number, returning fallback if NaN/undefined
    _validateNumber(value, fallback) {
        if (typeof value !== 'number' || isNaN(value) || !isFinite(value)) {
            return fallback;
        }
        return value;
    }

    // Clamp value to range
    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }

    async init() {
        // Already initialized
        if (this.state === AudioEngine.STATE.INITIALIZED) {
            return;
        }

        // Currently initializing - return existing promise (mutex)
        if (this.state === AudioEngine.STATE.INITIALIZING && this.initPromise) {
            return this.initPromise;
        }

        // Start initialization
        this.state = AudioEngine.STATE.INITIALIZING;
        this.initPromise = this._doInit();
        return this.initPromise;
    }

    async _doInit() {
        try {
            await Tone.start();
            debugLog('Audio engine starting...');

            // Build effects chain from output to input:
            // Master gain → Destination
            this.masterGain = new Tone.Gain(0.25).toDestination();

            // Reverb → Master gain (choir ambience)
            this.reverb = new Tone.Reverb({
                decay: 4,
                wet: 0.35
            }).connect(this.masterGain);
            await this.reverb.generate();

            // Stereo widener → Reverb
            this.stereoWidener = new Tone.StereoWidener({
                width: 0.5
            }).connect(this.reverb);

            // Chorus → Stereo widener
            this.chorus = new Tone.Chorus({
                frequency: 2.5,
                delayTime: 3.5,
                depth: 0.5,
                wet: 0.6
            }).connect(this.stereoWidener);
            this.chorus.start();

            // Filter → Chorus
            this.filter = new Tone.Filter({
                type: 'lowpass',
                frequency: 400,
                Q: 1.5
            }).connect(this.chorus);

            // Voice mixer → Filter
            this.voiceMixer = new Tone.Gain(0.6).connect(this.filter);

            // Create gain nodes for dual-channel crossfade
            this.roundedGain = new Tone.Gain(1.0).connect(this.voiceMixer);   // Starts at full
            this.saturatedGain = new Tone.Gain(0.0).connect(this.voiceMixer); // Starts at zero

            // Create rounded voices (triangle - warm, mellow)
            this.baseFreqs.forEach((freq, i) => {
                const voice = new Tone.FatOscillator({
                    type: 'triangle',
                    frequency: freq,
                    count: 3,
                    spread: 20
                }).connect(this.roundedGain);

                // Slow pitch drift LFO (different rate per voice for organic feel)
                const lfoFreq = 0.08 + (i * 0.02); // 0.08, 0.10, 0.12, 0.14 Hz
                const lfo = new Tone.LFO({
                    type: 'sine',
                    frequency: lfoFreq,
                    min: -3,  // cents
                    max: 3    // cents
                });
                lfo.connect(voice.detune);

                this.roundedVoices.push(voice);
                this.roundedLFOs.push(lfo);

                voice.start();
                lfo.start();
            });

            // Create saturated voices (sawtooth - bright, aggressive)
            this.baseFreqs.forEach((freq, i) => {
                const voice = new Tone.FatOscillator({
                    type: 'sawtooth',
                    frequency: freq,
                    count: 3,
                    spread: 20
                }).connect(this.saturatedGain);

                // Slow pitch drift LFO (slightly different rates for variation)
                const lfoFreq = 0.09 + (i * 0.02); // 0.09, 0.11, 0.13, 0.15 Hz
                const lfo = new Tone.LFO({
                    type: 'sine',
                    frequency: lfoFreq,
                    min: -3,  // cents
                    max: 3    // cents
                });
                lfo.connect(voice.detune);

                this.saturatedVoices.push(voice);
                this.saturatedLFOs.push(lfo);

                voice.start();
                lfo.start();
            });

            this.state = AudioEngine.STATE.INITIALIZED;
            debugLog('Audio engine initialized');

            // Apply any queued parameters
            if (this.pendingWidth !== null) {
                this.setWidth(this.pendingWidth);
                this.pendingWidth = null;
            }
            if (this.pendingIntensity !== null) {
                this.setIntensity(this.pendingIntensity);
                this.pendingIntensity = null;
            }
        } catch (err) {
            debugLog('Audio engine initialization failed:', err);
            this.state = AudioEngine.STATE.ERROR;
            this.initPromise = null; // Allow retry
            throw err;
        }
    }

    setWidth(widthAmount) {
        // Validate input (0-1 range)
        const validWidth = this._validateNumber(widthAmount, this.lastValidWidth);
        this.lastValidWidth = validWidth;

        // Queue if not initialized
        if (!this.isInitialized) {
            this.pendingWidth = validWidth;
            return;
        }

        const w = this._clamp(validWidth, 0, 1);

        // FatOscillator spread: 10-50 cents (apply to both voice banks)
        const spread = 10 + (w * 40);
        const allVoices = [...this.roundedVoices, ...this.saturatedVoices];
        allVoices.forEach(voice => {
            voice.spread = spread;
        });

        // Chorus frequency: 1-6 Hz
        const chorusFreq = 1 + (w * 5);
        this.chorus.frequency.rampTo(chorusFreq, 0.1);

        // LFO depth: ±2 to ±15 cents (apply to both LFO banks)
        const lfoDepth = 2 + (w * 13);
        const allLFOs = [...this.roundedLFOs, ...this.saturatedLFOs];
        allLFOs.forEach(lfo => {
            lfo.min = -lfoDepth;
            lfo.max = lfoDepth;
        });

        // Stereo width: 0.3-1.0
        const stereoWidth = 0.3 + (w * 0.7);
        this.stereoWidener.width.rampTo(stereoWidth, 0.1);
    }

    setIntensity(intensityAmount) {
        // Validate input (0-1 range)
        const validIntensity = this._validateNumber(intensityAmount, this.lastValidIntensity);
        this.lastValidIntensity = validIntensity;

        // Queue if not initialized
        if (!this.isInitialized) {
            this.pendingIntensity = validIntensity;
            return;
        }

        const i = this._clamp(validIntensity, 0, 1);

        // Crossfade between voice banks: rounded fades out, saturated fades in
        this.roundedGain.gain.rampTo(1 - i, 0.1);
        this.saturatedGain.gain.rampTo(i, 0.1);

        // Filter cutoff: 300-5000 Hz
        const filterFreq = 300 + (i * 4700);
        this.filter.frequency.rampTo(filterFreq, 0.1);

        // Filter Q: 1-3
        const filterQ = 1 + (i * 2);
        this.filter.Q.rampTo(filterQ, 0.1);

        // Chorus depth: 0.3-0.8
        const chorusDepth = 0.3 + (i * 0.5);
        this.chorus.depth = chorusDepth;
    }

    setKey(keyName) {
        // Parse key name (e.g., 'Am' → root='A', minor=true)
        const isMinor = keyName.endsWith('m');
        const rootName = isMinor ? keyName.slice(0, -1) : keyName;

        // Get root frequency
        const rootFreq = AudioEngine.ROOT_FREQUENCIES[rootName];
        if (rootFreq === undefined) {
            console.warn(`Unknown key: ${keyName}`);
            return;
        }

        // Calculate chord frequencies
        const intervals = isMinor ? AudioEngine.MINOR_INTERVALS : AudioEngine.MAJOR_INTERVALS;
        const newFreqs = intervals.map(ratio => rootFreq * ratio);

        // Update state
        this.currentKey = keyName;
        this.isMinor = isMinor;
        this.baseFreqs = newFreqs;

        // If not initialized, frequencies will be applied on init
        if (!this.isInitialized) {
            return;
        }

        // Glide all oscillators to new frequencies
        this.roundedVoices.forEach((voice, i) => {
            voice.frequency.rampTo(newFreqs[i], this.glideTime);
        });
        this.saturatedVoices.forEach((voice, i) => {
            voice.frequency.rampTo(newFreqs[i], this.glideTime);
        });

        if (window.DEBUG) {
            debugLog(`Key changed to ${keyName}: ${newFreqs.map(f => f.toFixed(1)).join(', ')} Hz`);
        }
    }

    getCurrentKey() {
        return this.currentKey;
    }
}
