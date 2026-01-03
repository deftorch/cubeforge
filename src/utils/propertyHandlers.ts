import * as THREE from 'three';
import type { Transform, CubeMaterial } from '@/types';
import type { CubeManager } from '@/core/scene/CubeManager';
import { degToRad, radToDeg } from '@/utils/math';

/**
 * Property Handler Types
 */
export interface PropertyHandler<T> {
    /** Update value with live preview (no undo) */
    update: (value: T) => void;
    /** Commit value with undo support */
    commit: (value: T, originalValue: T) => void;
}

export interface Vector3Value {
    x: number;
    y: number;
    z: number;
}

/**
 * Create a transform property handler
 * Reduces boilerplate for position, rotation, and scale handlers
 */
export function createTransformHandler(
    type: 'position' | 'rotation' | 'scale',
    getCubeId: () => string | null,
    getTransform: () => Transform | null,
    cubeManager: CubeManager
): PropertyHandler<Vector3Value> {
    const convertToThree = (value: Vector3Value): Partial<Transform> => {
        switch (type) {
            case 'position':
                return { position: new THREE.Vector3(value.x, value.y, value.z) };
            case 'rotation':
                return { rotation: new THREE.Euler(degToRad(value.x), degToRad(value.y), degToRad(value.z)) };
            case 'scale':
                return { scale: new THREE.Vector3(value.x, value.y, value.z) };
        }
    };

    const getDescription = (cubeName: string): string => {
        switch (type) {
            case 'position': return `Move ${cubeName}`;
            case 'rotation': return `Rotate ${cubeName}`;
            case 'scale': return `Scale ${cubeName}`;
        }
    };

    return {
        update: (value: Vector3Value) => {
            const cubeId = getCubeId();
            if (!cubeId) return;
            cubeManager.updateTransform(cubeId, convertToThree(value));
        },

        commit: (value: Vector3Value, originalValue: Vector3Value) => {
            const cubeId = getCubeId();
            const transform = getTransform();
            if (!cubeId || !transform) return;

            // Get cube name for description
            const cubeName = cubeId; // Could be enhanced to get actual name

            cubeManager.updateCubeWithUndo(
                cubeId,
                { transform: { ...transform, ...convertToThree(value) } },
                getDescription(cubeName),
                { transform: { ...transform, ...convertToThree(originalValue) } }
            );
        }
    };
}

/**
 * Create a material color handler
 */
export function createColorHandler(
    getCubeId: () => string | null,
    cubeManager: CubeManager
): PropertyHandler<string> {
    return {
        update: (color: string) => {
            const cubeId = getCubeId();
            if (!cubeId) return;
            cubeManager.updateMaterial(cubeId, { color });
        },

        commit: (color: string, originalColor: string) => {
            const cubeId = getCubeId();
            if (!cubeId) return;
            cubeManager.updateMaterialWithUndo(cubeId, { color }, { color: originalColor });
        }
    };
}

/**
 * Create a material number property handler (metalness, roughness, etc.)
 */
export function createMaterialNumberHandler(
    property: keyof Pick<CubeMaterial, 'metalness' | 'roughness' | 'opacity' | 'emissiveIntensity'>,
    getCubeId: () => string | null,
    cubeManager: CubeManager
): PropertyHandler<number> {
    return {
        update: (value: number) => {
            const cubeId = getCubeId();
            if (!cubeId) return;
            cubeManager.updateMaterial(cubeId, { [property]: value });
        },

        commit: (value: number, originalValue: number) => {
            const cubeId = getCubeId();
            if (!cubeId) return;
            cubeManager.updateMaterialWithUndo(
                cubeId,
                { [property]: value },
                { [property]: originalValue }
            );
        }
    };
}

/**
 * Helper to convert Vector3/Euler to UI values
 */
export function transformToUIValue(
    transform: Transform,
    type: 'position' | 'rotation' | 'scale'
): Vector3Value {
    switch (type) {
        case 'position':
            return {
                x: transform.position.x,
                y: transform.position.y,
                z: transform.position.z
            };
        case 'rotation':
            return {
                x: radToDeg(transform.rotation.x),
                y: radToDeg(transform.rotation.y),
                z: radToDeg(transform.rotation.z)
            };
        case 'scale':
            return {
                x: transform.scale.x,
                y: transform.scale.y,
                z: transform.scale.z
            };
    }
}
