// Vertex shader for instanced ASCII character rendering

// Instance attributes (per character)
attribute float instanceCharIndex; // Character index in atlas
attribute vec3 instanceColor;      // RGB color for this character
attribute vec2 instanceDriftSeed;  // Random seeds for drift animation

// Uniforms
uniform float time;
uniform float driftAmount;
uniform float atlasColumns;       // Number of columns in character atlas

// Varyings to fragment shader
varying vec2 vUv;
varying vec3 vColor;
varying vec2 vAtlasUV;            // Which character in the atlas

void main() {
    vColor = instanceColor;
    vUv = uv;

    // Calculate atlas UV offset for this character
    float charCol = mod(instanceCharIndex, atlasColumns);
    float charRow = floor(instanceCharIndex / atlasColumns);
    vAtlasUV = vec2(charCol, charRow);

    // Calculate drift offset using instance-specific seeds
    float driftX = sin(time * (0.5 + instanceDriftSeed.x * 1.5) + instanceDriftSeed.x * 6.28318) * driftAmount;
    float driftY = cos(time * (0.5 + instanceDriftSeed.y * 1.5) + instanceDriftSeed.y * 6.28318) * driftAmount;
    vec2 drift = vec2(driftX, driftY);

    // Get instance matrix (provided by Three.js for InstancedMesh)
    mat4 instanceMatrix = instanceMatrix;

    // Apply instance transform to vertex position
    vec4 instancedPosition = instanceMatrix * vec4(position, 1.0);

    // Add drift in screen space
    instancedPosition.xy += drift;

    gl_Position = projectionMatrix * modelViewMatrix * instancedPosition;
}
