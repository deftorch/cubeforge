import type { Cube, CubeMaterial, Transform } from '@/types';
import * as THREE from 'three';

/**
 * Validation utilities for runtime type checking
 * Active in development mode only
 */

const isDev = (import.meta as { env?: { DEV?: boolean } }).env?.DEV ?? false;

/**
 * Log validation error (only in dev mode)
 */
function logValidationError(context: string, message: string, data?: unknown): void {
    if (isDev) {
        console.error(`[VALIDATION] ${context}: ${message}`, data);
        console.trace();
    }
}

/**
 * Assertion that only runs in development
 */
export function devAssert(condition: boolean, message: string): void {
    if (isDev && !condition) {
        console.error(`[ASSERTION FAILED] ${message}`);
        console.trace();
    }
}

/**
 * Validate Cube ID exists in collection
 */
export function assertCubeExists(
    cubeId: string,
    cubes: Record<string, Cube>,
    context = 'Unknown'
): boolean {
    if (!cubes[cubeId]) {
        logValidationError(context, `Cube "${cubeId}" not found`, { availableIds: Object.keys(cubes) });
        return false;
    }
    return true;
}

/**
 * Validate Transform object structure
 */
export function isValidTransform(transform: unknown): transform is Transform {
    if (!transform || typeof transform !== 'object') return false;
    const t = transform as Record<string, unknown>;

    return (
        t.position instanceof THREE.Vector3 &&
        t.rotation instanceof THREE.Euler &&
        t.scale instanceof THREE.Vector3
    );
}

/**
 * Validate CubeMaterial structure
 */
export function isValidMaterial(material: unknown): material is CubeMaterial {
    if (!material || typeof material !== 'object') return false;
    const m = material as Record<string, unknown>;

    return (
        typeof m.color === 'string' &&
        typeof m.metalness === 'number' &&
        typeof m.roughness === 'number' &&
        typeof m.opacity === 'number' &&
        typeof m.emissive === 'string' &&
        typeof m.emissiveIntensity === 'number'
    );
}

/**
 * Validate Cube object structure
 */
export function isValidCube(cube: unknown): cube is Cube {
    if (!cube || typeof cube !== 'object') return false;
    const c = cube as Record<string, unknown>;

    return (
        typeof c.id === 'string' &&
        typeof c.name === 'string' &&
        isValidTransform(c.transform) &&
        isValidMaterial(c.material) &&
        typeof c.layerId === 'string' &&
        typeof c.visible === 'boolean' &&
        typeof c.locked === 'boolean'
    );
}

/**
 * Validate Hex color format
 */
export function isValidHexColor(color: string): boolean {
    return /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
}

/**
 * Validate number is within range
 */
export function isInRange(value: number, min: number, max: number): boolean {
    return value >= min && value <= max;
}

/**
 * Validate material properties are within valid ranges
 */
export function validateMaterialRanges(material: CubeMaterial): string[] {
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
