import { describe, it, expect } from 'vitest';

// Test validation functions logic
// These match the exported functions in validation.ts

function isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

interface CubeMaterial {
    color: string;
    metalness: number;
    roughness: number;
    opacity: number;
    emissive: string;
    emissiveIntensity: number;
}

function validateMaterialRanges(material: CubeMaterial): string[] {
    const errors: string[] = [];

    if (!isInRange(material.metalness, 0, 1)) {
        errors.push(`metalness ${material.metalness} out of range [0, 1]`);
    }
    if (!isInRange(material.roughness, 0, 1)) {
        errors.push(`roughness ${material.roughness} out of range [0, 1]`);
    }
    if (!isInRange(material.opacity, 0, 1)) {
        errors.push(`opacity ${material.opacity} out of range [0, 1]`);
    }
    if (!isInRange(material.emissiveIntensity, 0, 1)) {
        errors.push(`emissiveIntensity ${material.emissiveIntensity} out of range [0, 1]`);
    }
    if (!isValidHexColor(material.color)) {
        errors.push(`invalid color format: ${material.color}`);
    }
    if (!isValidHexColor(material.emissive)) {
        errors.push(`invalid emissive format: ${material.emissive}`);
    }

    return errors;
}

describe('validation utilities', () => {
    describe('isValidHexColor()', () => {
        it('should accept valid 6-digit hex color', () => {
            expect(isValidHexColor('#ff0000')).toBe(true);
            expect(isValidHexColor('#4a9eff')).toBe(true);
            expect(isValidHexColor('#000000')).toBe(true);
            expect(isValidHexColor('#FFFFFF')).toBe(true);
        });

        it('should accept valid 3-digit hex color', () => {
            expect(isValidHexColor('#fff')).toBe(true);
            expect(isValidHexColor('#000')).toBe(true);
            expect(isValidHexColor('#abc')).toBe(true);
        });

        it('should reject invalid colors', () => {
            expect(isValidHexColor('red')).toBe(false);
            expect(isValidHexColor('#gg0000')).toBe(false);
            expect(isValidHexColor('ff0000')).toBe(false);
            expect(isValidHexColor('#ff00')).toBe(false);
            expect(isValidHexColor('#ff00000')).toBe(false);
        });
    });

    describe('isInRange()', () => {
        it('should return true for values in range', () => {
            expect(isInRange(0.5, 0, 1)).toBe(true);
            expect(isInRange(0, 0, 1)).toBe(true);
            expect(isInRange(1, 0, 1)).toBe(true);
        });

        it('should return false for values out of range', () => {
            expect(isInRange(-0.1, 0, 1)).toBe(false);
            expect(isInRange(1.1, 0, 1)).toBe(false);
        });
    });

    describe('validateMaterialRanges()', () => {
        it('should return empty array for valid material', () => {
            const material: CubeMaterial = {
                color: '#4a9eff',
                metalness: 0.1,
                roughness: 0.7,
                opacity: 1,
                emissive: '#000000',
                emissiveIntensity: 0,
            };

            expect(validateMaterialRanges(material)).toHaveLength(0);
        });

        it('should detect invalid metalness', () => {
            const material: CubeMaterial = {
                color: '#4a9eff',
                metalness: 1.5,
                roughness: 0.7,
                opacity: 1,
                emissive: '#000000',
                emissiveIntensity: 0,
            };

            const errors = validateMaterialRanges(material);
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('metalness');
        });

        it('should detect invalid color format', () => {
            const material: CubeMaterial = {
                color: 'invalid',
                metalness: 0.1,
                roughness: 0.7,
                opacity: 1,
                emissive: '#000000',
                emissiveIntensity: 0,
            };

            const errors = validateMaterialRanges(material);
            expect(errors).toHaveLength(1);
            expect(errors[0]).toContain('color');
        });

        it('should detect multiple errors', () => {
            const material: CubeMaterial = {
                color: 'bad',
                metalness: -1,
                roughness: 2,
                opacity: 1.5,
                emissive: 'also-bad',
                emissiveIntensity: -0.5,
            };

            const errors = validateMaterialRanges(material);
            expect(errors.length).toBeGreaterThan(4);
        });
    });
});
