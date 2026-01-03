/**
 * Color utility functions for HSV/RGB/Hex conversions
 * Used by the HSV Color Picker component
 */

export interface RGB {
    r: number;  // 0-255
    g: number;  // 0-255
    b: number;  // 0-255
}

export interface HSV {
    h: number;  // 0-360 (degrees)
    s: number;  // 0-100 (percentage)
    v: number;  // 0-100 (percentage)
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

/**
 * Convert hex color string to RGB
 * @param hex - Color in format "#RRGGBB" or "#RGB"
 */
export function hexToRgb(hex: string): RGB {
    // Remove # if present
    hex = hex.replace(/^#/, '');

    // Expand shorthand form (e.g. "03F") to full form (e.g. "0033FF")
    if (hex.length === 3) {
        hex = hex.split('').map(c => c + c).join('');
    }

    const num = parseInt(hex, 16);
    return {
        r: (num >> 16) & 255,
        g: (num >> 8) & 255,
        b: num & 255
    };
}

/**
 * Convert RGB to hex color string
 */
export function rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => {
        const hex = clamp(Math.round(n), 0, 255).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Convert RGB to HSV
 * RGB values are 0-255, HSV values are H: 0-360, S: 0-100, V: 0-100
 */
export function rgbToHsv(r: number, g: number, b: number): HSV {
    r /= 255;
    g /= 255;
    b /= 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0;
    const s = max === 0 ? 0 : (delta / max) * 100;
    const v = max * 100;

    if (delta !== 0) {
        if (max === r) {
            h = ((g - b) / delta) % 6;
        } else if (max === g) {
            h = (b - r) / delta + 2;
        } else {
            h = (r - g) / delta + 4;
        }
        h = Math.round(h * 60);
        if (h < 0) h += 360;
    }

    return {
        h: Math.round(h),
        s: Math.round(s),
        v: Math.round(v)
    };
}

/**
 * Convert HSV to RGB
 * HSV values are H: 0-360, S: 0-100, V: 0-100
 * Returns RGB values 0-255
 */
export function hsvToRgb(h: number, s: number, v: number): RGB {
    h = h % 360;
    s = s / 100;
    v = v / 100;

    const c = v * s;
    const x = c * (1 - Math.abs((h / 60) % 2 - 1));
    const m = v - c;

    let r = 0, g = 0, b = 0;

    if (h >= 0 && h < 60) {
        r = c; g = x; b = 0;
    } else if (h >= 60 && h < 120) {
        r = x; g = c; b = 0;
    } else if (h >= 120 && h < 180) {
        r = 0; g = c; b = x;
    } else if (h >= 180 && h < 240) {
        r = 0; g = x; b = c;
    } else if (h >= 240 && h < 300) {
        r = x; g = 0; b = c;
    } else {
        r = c; g = 0; b = x;
    }

    return {
        r: Math.round((r + m) * 255),
        g: Math.round((g + m) * 255),
        b: Math.round((b + m) * 255)
    };
}

/**
 * Convert hex color to HSV
 */
export function hexToHsv(hex: string): HSV {
    const { r, g, b } = hexToRgb(hex);
    return rgbToHsv(r, g, b);
}

/**
 * Convert HSV to hex color
 */
export function hsvToHex(h: number, s: number, v: number): string {
    const { r, g, b } = hsvToRgb(h, s, v);
    return rgbToHex(r, g, b);
}

/**
 * Get CSS gradient for hue strip (0-360 degrees)
 */
export function getHueGradient(): string {
    const colors = [];
    for (let h = 0; h <= 360; h += 30) {
        const { r, g, b } = hsvToRgb(h, 100, 100);
        colors.push(`rgb(${r}, ${g}, ${b})`);
    }
    return `linear-gradient(to bottom, ${colors.join(', ')})`;
}

/**
 * Get pure color at given hue (full saturation, full value)
 */
export function getHueColor(h: number): string {
    const { r, g, b } = hsvToRgb(h, 100, 100);
    return `rgb(${r}, ${g}, ${b})`;
}
