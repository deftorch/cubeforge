import * as THREE from 'three';

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}

/**
 * Lerp (linear interpolation) between two values
 */
export function lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
}

/**
 * Convert degrees to radians
 */
export function degToRad(degrees: number): number {
    return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function radToDeg(radians: number): number {
    return radians * (180 / Math.PI);
}

/**
 * Round to nearest step value
 */
export function snapToStep(value: number, step: number): number {
    if (step === 0) return value;
    return Math.round(value / step) * step;
}

/**
 * Snap vector to grid
 */
export function snapVectorToGrid(vec: THREE.Vector3, gridSize: number): THREE.Vector3 {
    return new THREE.Vector3(
        snapToStep(vec.x, gridSize),
        snapToStep(vec.y, gridSize),
        snapToStep(vec.z, gridSize)
    );
}

/**
 * Snap angle to step (in radians)
 */
export function snapAngle(angle: number, stepDegrees: number): number {
    const stepRadians = degToRad(stepDegrees);
    return snapToStep(angle, stepRadians);
}

/**
 * Check if two vectors are approximately equal
 */
export function vectorsEqual(a: THREE.Vector3, b: THREE.Vector3, epsilon = 0.0001): boolean {
    return (
        Math.abs(a.x - b.x) < epsilon &&
        Math.abs(a.y - b.y) < epsilon &&
        Math.abs(a.z - b.z) < epsilon
    );
}

/**
 * Generate random color hex
 */
export function randomColor(): string {
    const hue = Math.random() * 360;
    const saturation = 60 + Math.random() * 30; // 60-90%
    const lightness = 45 + Math.random() * 20; // 45-65%
    return hslToHex(hue, saturation, lightness);
}

/**
 * Convert HSL to hex color
 */
export function hslToHex(h: number, s: number, l: number): string {
    s /= 100;
    l /= 100;

    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => {
        const k = (n + h / 30) % 12;
        const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * color).toString(16).padStart(2, '0');
    };

    return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Parse hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
        ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16),
        }
        : null;
}
