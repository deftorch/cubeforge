import { describe, it, expect, beforeEach } from 'vitest';

// Mock Cube type for testing
interface Cube {
    id: string;
    name: string;
    layerId: string;
    visible: boolean;
    locked: boolean;
}

interface Layer {
    id: string;
    name: string;
    cubeIds: string[];
}

interface SceneStoreState {
    id: string;
    name: string;
    cubes: Record<string, Cube>;
    layers: Layer[];
    isDirty: boolean;
}

// Testable implementation of sceneStore logic
function createSceneStore() {
    let state: SceneStoreState = {
        id: 'scene-1',
        name: 'Untitled Project',
        cubes: {},
        layers: [{ id: 'layer-default', name: 'Default', cubeIds: [] }],
        isDirty: false,
    };

    return {
        getState: () => state,

        addCube(cube: Cube) {
            state.cubes = { ...state.cubes, [cube.id]: cube };

            const layerIndex = state.layers.findIndex(l => l.id === cube.layerId);
            if (layerIndex !== -1) {
                state.layers = state.layers.map((l, i) =>
                    i === layerIndex
                        ? { ...l, cubeIds: [...l.cubeIds, cube.id] }
                        : l
                );
            }

            state.isDirty = true;
        },

        removeCube(cubeId: string) {
            const cube = state.cubes[cubeId];
            if (!cube) return;

            const layerIndex = state.layers.findIndex(l => l.id === cube.layerId);
            if (layerIndex !== -1) {
                state.layers = state.layers.map((l, i) =>
                    i === layerIndex
                        ? { ...l, cubeIds: l.cubeIds.filter(id => id !== cubeId) }
                        : l
                );
            }

            const { [cubeId]: _, ...rest } = state.cubes;
            state.cubes = rest;
            state.isDirty = true;
        },

        updateCube(cubeId: string, updates: Partial<Cube>) {
            if (!state.cubes[cubeId]) return;

            state.cubes = {
                ...state.cubes,
                [cubeId]: { ...state.cubes[cubeId], ...updates },
            };
            state.isDirty = true;
        },

        getCube(cubeId: string): Cube | undefined {
            return state.cubes[cubeId];
        },

        getAllCubes(): Cube[] {
            return Object.values(state.cubes);
        },

        getCubeCount(): number {
            return Object.keys(state.cubes).length;
        },

        setName(name: string) {
            state.name = name;
            state.isDirty = true;
        },

        reset() {
            state = {
                id: 'scene-new',
                name: 'Untitled Project',
                cubes: {},
                layers: [{ id: 'layer-default', name: 'Default', cubeIds: [] }],
                isDirty: false,
            };
        },

        markClean() {
            state.isDirty = false;
        },
    };
}

// Helper to create mock cube
function createMockCube(id: string, name = 'Cube'): Cube {
    return {
        id,
        name,
        layerId: 'layer-default',
        visible: true,
        locked: false,
    };
}

describe('sceneStore', () => {
    let store: ReturnType<typeof createSceneStore>;

    beforeEach(() => {
        store = createSceneStore();
    });

    describe('addCube()', () => {
        it('should add cube to store', () => {
            const cube = createMockCube('cube-1');
            store.addCube(cube);

            expect(store.getCube('cube-1')).toEqual(cube);
        });

        it('should add cube id to layer', () => {
            const cube = createMockCube('cube-1');
            store.addCube(cube);

            const layer = store.getState().layers[0];
            expect(layer.cubeIds).toContain('cube-1');
        });

        it('should set isDirty to true', () => {
            const cube = createMockCube('cube-1');
            store.addCube(cube);

            expect(store.getState().isDirty).toBe(true);
        });

        it('should increment cube count', () => {
            store.addCube(createMockCube('cube-1'));
            store.addCube(createMockCube('cube-2'));

            expect(store.getCubeCount()).toBe(2);
        });
    });

    describe('removeCube()', () => {
        it('should remove cube from store', () => {
            store.addCube(createMockCube('cube-1'));
            store.removeCube('cube-1');

            expect(store.getCube('cube-1')).toBeUndefined();
        });

        it('should remove cube id from layer', () => {
            store.addCube(createMockCube('cube-1'));
            store.removeCube('cube-1');

            const layer = store.getState().layers[0];
            expect(layer.cubeIds).not.toContain('cube-1');
        });

        it('should do nothing for non-existent cube', () => {
            expect(() => store.removeCube('non-existent')).not.toThrow();
        });

        it('should set isDirty to true', () => {
            store.addCube(createMockCube('cube-1'));
            store.markClean();
            store.removeCube('cube-1');

            expect(store.getState().isDirty).toBe(true);
        });
    });

    describe('updateCube()', () => {
        it('should update cube properties', () => {
            store.addCube(createMockCube('cube-1', 'Original'));
            store.updateCube('cube-1', { name: 'Updated' });

            expect(store.getCube('cube-1')?.name).toBe('Updated');
        });

        it('should not affect other properties', () => {
            store.addCube(createMockCube('cube-1'));
            store.updateCube('cube-1', { name: 'Updated' });

            expect(store.getCube('cube-1')?.visible).toBe(true);
        });

        it('should do nothing for non-existent cube', () => {
            expect(() => store.updateCube('non-existent', { name: 'Test' })).not.toThrow();
        });
    });

    describe('getCube()', () => {
        it('should return cube if exists', () => {
            const cube = createMockCube('cube-1');
            store.addCube(cube);

            expect(store.getCube('cube-1')).toEqual(cube);
        });

        it('should return undefined if not exists', () => {
            expect(store.getCube('non-existent')).toBeUndefined();
        });
    });

    describe('getAllCubes()', () => {
        it('should return all cubes', () => {
            store.addCube(createMockCube('cube-1'));
            store.addCube(createMockCube('cube-2'));
            store.addCube(createMockCube('cube-3'));

            const cubes = store.getAllCubes();
            expect(cubes).toHaveLength(3);
        });

        it('should return empty array when no cubes', () => {
            expect(store.getAllCubes()).toHaveLength(0);
        });
    });

    describe('setName()', () => {
        it('should set scene name', () => {
            store.setName('My Project');
            expect(store.getState().name).toBe('My Project');
        });

        it('should set isDirty to true', () => {
            store.setName('My Project');
            expect(store.getState().isDirty).toBe(true);
        });
    });

    describe('reset()', () => {
        it('should reset to initial state', () => {
            store.addCube(createMockCube('cube-1'));
            store.setName('Modified');
            store.reset();

            expect(store.getCubeCount()).toBe(0);
            expect(store.getState().name).toBe('Untitled Project');
        });

        it('should clear isDirty', () => {
            store.addCube(createMockCube('cube-1'));
            store.reset();

            expect(store.getState().isDirty).toBe(false);
        });
    });

    describe('markClean()', () => {
        it('should set isDirty to false', () => {
            store.addCube(createMockCube('cube-1'));
            expect(store.getState().isDirty).toBe(true);

            store.markClean();
            expect(store.getState().isDirty).toBe(false);
        });
    });
});
