// iOS Silent Mode Audio Unlock
// Enables Web Audio API playback even when iOS device is in silent mode
// Based on technique from https://github.com/feross/unmute-ios-audio

class IOSAudioUnlock {
    constructor() {
        this.isUnlocked = false;
        this.isIOS = this._detectIOS();
        this.unlockCallbacks = [];
    }

    _detectIOS() {
        // Check for iOS device
        return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    }

    async unlock() {
        // Already unlocked or not iOS
        if (this.isUnlocked || !this.isIOS) {
            this.isUnlocked = true;
            this._notifyCallbacks();
            return true;
        }

        try {
            // Create silent audio element
            const silentAudio = document.createElement('audio');
            silentAudio.controls = false;
            silentAudio.preload = 'auto';
            silentAudio.loop = false;

            // Set to avoid showing in AirPlay
            silentAudio.setAttribute('x-webkit-airplay', 'deny');

            // Create a minimal silent audio data URI (0.5 seconds of silence)
            // This is a base64-encoded MP3 file with silence
            const silentMP3 = 'data:audio/mpeg;base64,SUQzBAAAAAABEVRYWFgAAAAtAAADY29tbWVudABCaWdTb3VuZEJhbmsuY29tIC8gTGFTb25vdGhlcXVlLm9yZwBURU5DAAAAHQAAA1N3aXRjaCBQbHVzIMKpIE5DSCBTb2Z0d2FyZQBUSVQyAAAABgAAAzIyMzUAVFNTRQAAAA8AAANMYXZmNTcuODMuMTAwAAAAAAAAAAAAAAD/80DEAAAAA0gAAAAATEFNRTMuMTAwVVVVVVVVVVVVVUxBTUUzLjEwMFVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQsRbAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVf/zQMSkAAADSAAAAABVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV';

            silentAudio.src = silentMP3;

            // Play and immediately pause
            const playPromise = silentAudio.play();

            if (playPromise !== undefined) {
                await playPromise;
                silentAudio.pause();
                silentAudio.remove();
            }

            this.isUnlocked = true;
            this._notifyCallbacks();
            if (typeof debugLog === 'function') {
                debugLog('iOS audio unlocked successfully');
            } else {
                console.log('iOS audio unlocked successfully');
            }
            return true;
        } catch (err) {
            if (typeof debugLog === 'function') {
                debugLog('iOS audio unlock failed:', err);
            } else {
                console.log('iOS audio unlock failed:', err);
            }
            return false;
        }
    }

    onUnlock(callback) {
        if (this.isUnlocked) {
            callback();
        } else {
            this.unlockCallbacks.push(callback);
        }
    }

    _notifyCallbacks() {
        this.unlockCallbacks.forEach(cb => cb());
        this.unlockCallbacks = [];
    }
}

// Global instance
window.iosAudioUnlock = new IOSAudioUnlock();
