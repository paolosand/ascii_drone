// Fragment shader for ASCII character rendering

precision highp float;

// From vertex shader
varying vec2 vUv;
varying vec3 vColor;
varying vec2 vAtlasUV;

// Uniforms
uniform sampler2D charAtlas;
uniform float atlasColumns;
uniform float atlasRows;

void main() {
    // Calculate UV within the character atlas
    vec2 atlasCharSize = vec2(1.0 / atlasColumns, 1.0 / atlasRows);
    vec2 atlasUV = (vAtlasUV + vUv) * atlasCharSize;

    // Sample character from atlas (grayscale stored in alpha channel)
    vec4 charSample = texture2D(charAtlas, atlasUV);
    float charAlpha = charSample.a;

    // Apply instance color
    vec3 finalColor = vColor * charAlpha;

    // Output with alpha
    gl_FragColor = vec4(finalColor, charAlpha);

    // Discard fully transparent fragments for performance
    if (charAlpha < 0.01) discard;
}
