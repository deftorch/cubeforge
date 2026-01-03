
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CubeManager } from '../CubeManager';
import type { Cube } from '@/types';
import type { ISceneManager, ITransformService, IMaterialService, IEventBus } from '@/core/interfaces';
import { HierarchyManager } from '../HierarchyManager';
import { sceneActions } from '@/stores/sceneStore';

// Mock store actions to avoid side effects
vi.mock('@/stores/sceneStore', () => ({
    sceneActions: {
        addCube: vi.fn(),
        removeCube: vi.fn(),
        updateCube: vi.fn(),
        getCube: vi.fn(),
        getAllCubes: vi.fn(),
    }
}));

vi.mock('@/stores/historyStore', () => ({
    historyActions: {
        execute: vi.fn(),
    }
}));

describe('CubeManager', () => {
    let manager: CubeManager;
    let mockSceneManager: any;
    let mockHierarchyManager: any;
    let mockTransformService: any;
    let mockMaterialService: any;
    let mockEventBus: any;

    beforeEach(() => {
        // Mock dependencies
        mockSceneManager = {
            addMesh: vi.fn(),
            removeMesh: vi.fn(),
            getMesh: vi.fn(),
            detachTransformControls: vi.fn(),
            scene: { attach: vi.fn() }
        };

        mockHierarchyManager = {
            getChildren: vi.fn().mockReturnValue([]),
            parentCube: vi.fn(),
        };

        mockTransformService = {
            syncMeshToStore: vi.fn(),
            updateTransform: vi.fn(),
        };

        mockMaterialService = {
            updateMaterial: vi.fn(),
        };

        mockEventBus = {
            emit: vi.fn(),
            on: vi.fn(),
        };

        manager = new CubeManager(
            mockSceneManager,
            mockHierarchyManager,
            mockTransformService,
            mockMaterialService,
            mockEventBus
        );
    });

    describe('createCube()', () => {
        it('should create cube, add to store, and emit event', () => {
            const cube = manager.createCube();

            expect(cube.id).toBeDefined();
            expect(sceneActions.addCube).toHaveBeenCalledWith(cube);
            expect(mockEventBus.emit).toHaveBeenCalledWith('cube:created', { cube });
        });

        it('should NOT create mesh directly (delegated to SceneSynchronizer)', () => {
            manager.createCube();
            // Assuming MeshFactory was removed from CubeManager, we can't test it here.
            // But we can verify SceneManager.addMesh is NOT called.
            expect(mockSceneManager.addMesh).not.toHaveBeenCalled();
        });
    });

    describe('deleteCube()', () => {
        it('should delete cube and emit event', () => {
            const cube = {
                id: 'test-cube',
                name: 'Cube 1',
                transform: {
                    position: { clone: vi.fn() },
                    rotation: { clone: vi.fn() },
                    scale: { clone: vi.fn() }
                },
                material: {}
            } as unknown as Cube;
            (sceneActions.getCube as any).mockReturnValue(cube);

            manager.deleteCube('test-cube');

            expect(sceneActions.removeCube).toHaveBeenCalledWith('test-cube');
            expect(mockEventBus.emit).toHaveBeenCalledWith('cube:deleted', { cubeIds: ['test-cube'] });
        });

        it('should handle hierarchy (unparent children)', () => {
            const cube = {
                id: 'parent-cube',
                transform: {
                    position: { clone: vi.fn() },
                    rotation: { clone: vi.fn() },
                    scale: { clone: vi.fn() }
                },
                material: {}
            } as unknown as Cube;
            const child = { id: 'child-cube' } as Cube;
            (sceneActions.getCube as any).mockReturnValue(cube);
            mockHierarchyManager.getChildren.mockReturnValue([child]);

            // We need to mock getMesh for child to simulate unparenting logic if it was still in CubeManager
            // BUT we refactored deleteCubeInternal to preserve HierarchyManager.unparentChildren logic maybe?
            // In CubeManager.ts we just looped over children and attached to scene.

            mockSceneManager.getMesh.mockReturnValue({}); // Child mesh exists

            manager.deleteCube('parent-cube');

            expect(mockHierarchyManager.getChildren).toHaveBeenCalledWith('parent-cube');
            // Check if child unparenting logic executed (removed parentId)
            expect(sceneActions.updateCube).toHaveBeenCalledWith('child-cube', { parentId: undefined });
        });
    });

    describe('setVisible()', () => {
        it('should update store and emit event', () => {
            manager.setVisible('test-cube', false);

            expect(sceneActions.updateCube).toHaveBeenCalledWith('test-cube', { visible: false });
            expect(mockEventBus.emit).toHaveBeenCalledWith('cube:visibility-changed', {
                cubeId: 'test-cube',
                visible: false
            });
        });
    });
});
