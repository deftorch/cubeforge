import * as THREE from 'three';

/**
 * Cube Transform - Position, Rotation, Scale
 */
export interface Transform {
    position: THREE.Vector3;
    rotation: THREE.Euler;
    scale: THREE.Vector3;
}

/**
 * Cube Material Properties
 */
export interface CubeMaterial {
    color: string; // Hex color
    metalness: number; // 0-1
    roughness: number; // 0-1
    opacity: number; // 0-1
    emissive: string; // Hex color
    emissiveIntensity: number; // 0-1
}

/**
 * Core Cube Entity
 */
export interface Cube {
    id: string;
    name: string;
    transform: Transform;
    material: CubeMaterial;
    layerId: string;
    parentId?: string;
    visible: boolean;
    locked: boolean;
    metadata?: Record<string, unknown>;
}

/**
 * Serializable Cube format (for JSON save/load)
 */
export interface SerializedCube {
    id: string;
    name: string;
    transform: {
        position: [number, number, number];
        rotation: [number, number, number];
        scale: [number, number, number];
    };
    material: CubeMaterial;
    layerId: string;
    parentId?: string;
    visible: boolean;
    locked: boolean;
    metadata?: Record<string, unknown>;
}

/**
 * Create default Transform
 */
export function createDefaultTransform(): Transform {
    return {
        position: new THREE.Vector3(0, 0.5, 0),
        rotation: new THREE.Euler(0, 0, 0),
        scale: new THREE.Vector3(1, 1, 1),
    };
}

/**
 * Create default Material
 */
export function createDefaultMaterial(): CubeMaterial {
    return {
        color: '#4a9eff',
        metalness: 0.1,
        roughness: 0.7,
        opacity: 1,
        emissive: '#000000',
        emissiveIntensity: 0,
    };
}

/**
 * Serialize Cube to JSON-safe format
 */
export function serializeCube(cube: Cube): SerializedCube {
    return {
        id: cube.id,
        name: cube.name,
        transform: {
            position: [cube.transform.position.x, cube.transform.position.y, cube.transform.position.z],
            rotation: [cube.transform.rotation.x, cube.transform.rotation.y, cube.transform.rotation.z],
            scale: [cube.transform.scale.x, cube.transform.scale.y, cube.transform.scale.z],
        },
        material: { ...cube.material },
        layerId: cube.layerId,
        parentId: cube.parentId,
        visible: cube.visible,
        locked: cube.locked,
        metadata: cube.metadata,
    };
}

/**
 * Deserialize Cube from JSON format
 */
export function deserializeCube(data: SerializedCube): Cube {
    return {
        id: data.id,
        name: data.name,
        transform: {
            position: new THREE.Vector3(...data.transform.position),
            rotation: new THREE.Euler(...data.transform.rotation),
            scale: new THREE.Vector3(...data.transform.scale),
        },
        material: { ...data.material },
        layerId: data.layerId,
        parentId: data.parentId,
        visible: data.visible,
        locked: data.locked,
        metadata: data.metadata,
    };
}
