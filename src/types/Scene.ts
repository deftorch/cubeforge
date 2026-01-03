import type { Cube, SerializedCube } from './Cube';

/**
 * Layer for organizing cubes
 */
export interface Layer {
    id: string;
    name: string;
    visible: boolean;
    locked: boolean;
    color: string; // Layer color coding
    cubeIds: string[];
}

/**
 * Camera state
 */
export interface CameraState {
    position: [number, number, number];
    target: [number, number, number];
    fov: number;
    near: number;
    far: number;
}

/**
 * Light configuration
 */
export interface Light {
    id: string;
    type: 'directional' | 'point' | 'ambient';
    color: string;
    intensity: number;
    position?: [number, number, number];
    castShadow: boolean;
}

/**
 * Scene settings
 */
export interface SceneSettings {
    gridSize: number;
    snapToGrid: boolean;
    snapAngle: number;
    showGrid: boolean;
    backgroundColor: string;
}

/**
 * Complete Scene data
 */
export interface Scene {
    id: string;
    name: string;
    cubes: Map<string, Cube>;
    layers: Layer[];
    camera: CameraState;
    lights: Light[];
    settings: SceneSettings;
    metadata: {
        created: string;
        modified: string;
        author?: string;
        version: string;
    };
}

/**
 * Serializable Scene format (for JSON save/load)
 */
export interface SerializedScene {
    version: string;
    metadata: {
        created: string;
        modified: string;
        author?: string;
        appVersion: string;
    };
    scene: {
        id: string;
        name: string;
        cubes: SerializedCube[];
        layers: Layer[];
        camera: CameraState;
        lights: Light[];
        settings: SceneSettings;
    };
    thumbnail?: string; // Base64 preview image
}

/**
 * Create default scene settings
 */
export function createDefaultSceneSettings(): SceneSettings {
    return {
        gridSize: 1.0,
        snapToGrid: true,
        snapAngle: 15,
        showGrid: true,
        backgroundColor: '#1a1a2e',
    };
}

/**
 * Create default camera state
 */
export function createDefaultCameraState(): CameraState {
    return {
        position: [8, 6, 8],
        target: [0, 0, 0],
        fov: 50,
        near: 0.1,
        far: 1000,
    };
}

/**
 * Create default layer
 */
export function createDefaultLayer(): Layer {
    return {
        id: 'default-layer',
        name: 'Default',
        visible: true,
        locked: false,
        color: '#ffffff',
        cubeIds: [],
    };
}

/**
 * Create default lights
 */
export function createDefaultLights(): Light[] {
    return [
        {
            id: 'ambient-light',
            type: 'ambient',
            color: '#404080',
            intensity: 0.4,
            castShadow: false,
        },
        {
            id: 'main-light',
            type: 'directional',
            color: '#ffffff',
            intensity: 1.0,
            position: [5, 10, 7],
            castShadow: true,
        },
        {
            id: 'fill-light',
            type: 'directional',
            color: '#8080ff',
            intensity: 0.3,
            position: [-5, 5, -5],
            castShadow: false,
        },
    ];
}
