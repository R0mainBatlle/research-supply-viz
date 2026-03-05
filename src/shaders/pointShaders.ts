import * as THREE from 'three';

/**
 * Creates a circular sprite texture using DataTexture (avoids Canvas2D
 * premultiplied-alpha issues that cause square artifacts with PointsMaterial).
 */
export function createCircleTexture(size = 64): THREE.DataTexture {
    const data = new Uint8Array(size * size * 4);
    const center = size / 2;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = (x + 0.5 - center) / center; // -1..1
            const dy = (y + 0.5 - center) / center;
            const dist = Math.sqrt(dx * dx + dy * dy); // 0..~1.41

            // Hard circle with soft edge
            const circle = 1.0 - smoothstep(0.55, 0.7, dist);
            // Subtle outer glow
            const glow = Math.exp(-dist * dist * 8) * 0.25;
            // Brighter center
            const bright = Math.exp(-dist * dist * 3) * 0.1;

            const alpha = Math.min(1, circle + glow);
            const luminance = Math.min(255, Math.round((1.0 + bright) * 255));

            const idx = (y * size + x) * 4;
            data[idx] = luminance;     // R
            data[idx + 1] = luminance; // G
            data[idx + 2] = luminance; // B
            data[idx + 3] = Math.round(alpha * 255); // A
        }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
    const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
    return t * t * (3 - 2 * t);
}
