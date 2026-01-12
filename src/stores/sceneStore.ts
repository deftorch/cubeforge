import { createStore } from 'solid-js/store';
import type { Cube, Layer, Light, SceneSettings, CameraState } from '@/types';
import {
    createDefaultSceneSettings,
    createDefaultCameraState,
    createDefaultLayer,
    createDefaultLights
} from '@/types';
import { generateUUID } from '@/utils';

/**
 * Scene Store - Central state for scene data
 */
export interface SceneStoreState {
    id: string;
    name: string;
    cubes: Record<string, Cube>;
    layers: Layer[];
    lights: Light[];
    settings: SceneSettings;
    camera: CameraState;
    isDirty: boolean;
    metadata: {
        created: string;
        modified: string;
        version: string;
    };
}

function createInitialState(): SceneStoreState {
    const now = new Date().toISOString();
    return {
        id: generateUUID(),
        name: 'Untitled Project',
        cubes: {},
        layers: [createDefaultLayer()],
        lights: createDefaultLights(),
        settings: createDefaultSceneSettings(),
        camera: createDefaultCameraState(),
        isDirty: false,
        metadata: {
            created: now,
            modified: now,
            version: '1.0.0',
        },
    };
}

const [sceneStore, setSceneStore] = createStore<SceneStoreState>(createInitialState());

// Scene Actions
export const sceneActions = {
    /**
     * Add a cube to the scene
     */
    addCube(cube: Cube) {
        setSceneStore('cubes', cube.id, cube);

        // Add to layer
        const layerIndex = sceneStore.layers.findIndex(l => l.id === cube.layerId);
        if (layerIndex !== -1) {
            setSceneStore('layers', layerIndex, 'cubeIds', ids => [...ids, cube.id]);
        }

        setSceneStore('isDirty', true);
        setSceneStore('metadata', 'modified', new Date().toISOString());
    },

    /**
     * Reorder cube within a layer
     */
    reorderCubeInLayer(layerId: string, cubeId: string, toIndex: number) {
        const layerIndex = sceneStore.layers.findIndex(l => l.id === layerId);
        if (layerIndex === -1) return;

        const currentIds = [...sceneStore.layers[layerIndex].cubeIds];
        const fromIndex = currentIds.indexOf(cubeId);
        if (fromIndex === -1) return;

        // Remove
        currentIds.splice(fromIndex, 1);

        // Insert
        // Clamp index
        const targetIndex = Math.max(0, Math.min(toIndex, currentIds.length));
        currentIds.splice(targetIndex, 0, cubeId);

        setSceneStore('layers', layerIndex, 'cubeIds', currentIds);
        setSceneStore('isDirty', true);
        setSceneStore('metadata', 'modified', new Date().toISOString());
    },

    /**
     * Remove a cube from the scene
     */
    removeCube(cubeId: string) {
        const cube = sceneStore.cubes[cubeId];
        if (!cube) return;

        // Remove from layer
        const layerIndex = sceneStore.layers.findIndex(l => l.id === cube.layerId);
        if (layerIndex !== -1) {
            setSceneStore('layers', layerIndex, 'cubeIds', ids => ids.filter(id => id !== cubeId));
        }

        // Remove cube
        setSceneStore('cubes', cubeId, undefined!);

        setSceneStore('isDirty', true);
        setSceneStore('metadata', 'modified', new Date().toISOString());
    },

    /**
     * Update a cube's properties
     */
    updateCube(cubeId: string, updates: Partial<Cube>) {
        if (!sceneStore.cubes[cubeId]) return;

        setSceneStore('cubes', cubeId, updates);
        setSceneStore('isDirty', true);
        setSceneStore('metadata', 'modified', new Date().toISOString());
    },

    /**
     * Update cube transform
     */
    updateCubeTransform(cubeId: string, transform: Partial<Cube['transform']>) {
        if (!sceneStore.cubes[cubeId]) return;

        setSceneStore('cubes', cubeId, 'transform', transform);
        setSceneStore('isDirty', true);
    },

    /**
     * Update cube material
     */
    updateCubeMaterial(cubeId: string, material: Partial<Cube['material']>) {
        if (!sceneStore.cubes[cubeId]) return;

        setSceneStore('cubes', cubeId, 'material', material);
        setSceneStore('isDirty', true);
    },

    /**
     * Get cube by ID
     */
    getCube(cubeId: string): Cube | undefined {
        return sceneStore.cubes[cubeId];
    },

    /**
     * Get layer by ID
     */
    getLayer(layerId: string): Layer | undefined {
        return sceneStore.layers.find(l => l.id === layerId);
    },

    /**
     * Get all cubes
     */
    getAllCubes(): Cube[] {
        return Object.values(sceneStore.cubes);
    },

    /**
     * Get cube count
     */
    getCubeCount(): number {
        return Object.keys(sceneStore.cubes).length;
    },

    /**
     * Update scene settings
     */
    updateSettings(settings: Partial<SceneSettings>) {
        setSceneStore('settings', settings);
        setSceneStore('isDirty', true);
    },

    /**
     * Update scene name
     */
    setName(name: string) {
        setSceneStore('name', name);
        setSceneStore('isDirty', true);
    },

    /**
     * Reset scene to initial state
     */
    reset() {
        const initial = createInitialState();
        setSceneStore(initial);
    },

    /**
     * Load scene from data
     */
    loadScene(data: Partial<SceneStoreState>) {
        setSceneStore({ ...createInitialState(), ...data, isDirty: false });
    },

    /**
     * Mark scene as clean (saved)
     */
    markClean() {
        setSceneStore('isDirty', false);
    },
};

export { sceneStore, setSceneStore };
