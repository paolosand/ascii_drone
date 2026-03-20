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
uniform float saturation; // 0 = grayscale, >0 = color multiplier

// HSL helpers
vec3 rgb2hsl(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float delta = maxC - minC;
    float l = (maxC + minC) * 0.5;
    float s = 0.0;
    float h = 0.0;
    if (delta > 0.0001) {
        s = l > 0.5 ? delta / (2.0 - maxC - minC) : delta / (maxC + minC);
        if (maxC == c.r) h = (c.g - c.b) / delta + (c.g < c.b ? 6.0 : 0.0);
        else if (maxC == c.g) h = (c.b - c.r) / delta + 2.0;
        else h = (c.r - c.g) / delta + 4.0;
        h /= 6.0;
    }
    return vec3(h, s, l);
}

float hue2rgb(float p, float q, float t) {
    if (t < 0.0) t += 1.0;
    if (t > 1.0) t -= 1.0;
    if (t < 1.0 / 6.0) return p + (q - p) * 6.0 * t;
    if (t < 0.5) return q;
    if (t < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - t) * 6.0;
    return p;
}

vec3 hsl2rgb(vec3 hsl) {
    if (hsl.y < 0.0001) return vec3(hsl.z);
    float q = hsl.z < 0.5 ? hsl.z * (1.0 + hsl.y) : hsl.z + hsl.y - hsl.z * hsl.y;
    float p = 2.0 * hsl.z - q;
    return vec3(
        hue2rgb(p, q, hsl.x + 1.0 / 3.0),
        hue2rgb(p, q, hsl.x),
        hue2rgb(p, q, hsl.x - 1.0 / 3.0)
    );
}

vec3 applySaturation(vec3 rgb, float sat) {
    float luma = dot(rgb, vec3(0.299, 0.587, 0.114));
    if (sat < 0.001) return vec3(luma);
    vec3 hsl = rgb2hsl(rgb);
    hsl.y = clamp(hsl.y * sat, 0.0, 1.0);
    return hsl2rgb(hsl);
}

void main() {
    // Calculate UV within the character atlas
    vec2 atlasCharSize = vec2(1.0 / atlasColumns, 1.0 / atlasRows);
    vec2 atlasUV = (vAtlasUV + vUv) * atlasCharSize;

    // Sample character from atlas (grayscale stored in alpha channel)
    vec4 charSample = texture2D(charAtlas, atlasUV);
    float charAlpha = charSample.a;

    // Apply saturation adjustment to instance color
    vec3 adjustedColor = applySaturation(vColor, saturation);

    // Apply character mask
    vec3 finalColor = adjustedColor * charAlpha;

    // Output with alpha
    gl_FragColor = vec4(finalColor, charAlpha);

    // Discard fully transparent fragments for performance
    if (charAlpha < 0.01) discard;
}
