
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SceneSynchronizer } from '../SceneSynchronizer';
import type { IEventBus, ISceneManager } from '@/core/interfaces';
import type { MeshFactory } from '../MeshFactory';
import type { ViewportShading } from '@/core/viewport/ViewportShading';
import * as THREE from 'three';

describe('SceneSynchronizer', () => {
    let synchronizer: SceneSynchronizer;
    let mockEventBus: IEventBus;
    let mockSceneManager: any;
    let mockMeshFactory: any;
    let mockViewportShading: any;
    let mockMesh: THREE.Mesh;

    beforeEach(() => {
        // Mock dependencies
        mockEventBus = {
            on: vi.fn(),
            emit: vi.fn(),
            off: vi.fn(),
        };

        mockSceneManager = {
            addMesh: vi.fn(),
            removeMesh: vi.fn(),
            getMesh: vi.fn(),
            detachTransformControls: vi.fn(),
            scene: {
                add: vi.fn(),
            }
        };

        mockMesh = new THREE.Mesh();
        mockMesh.name = 'test-cube';

        mockMeshFactory = {
            createMesh: vi.fn().mockReturnValue(mockMesh),
        };

        mockViewportShading = {
            applyToMesh: vi.fn(),
            removeMesh: vi.fn(),
            setObjectVisible: vi.fn(),
        };

        synchronizer = new SceneSynchronizer(
            mockEventBus,
            mockSceneManager,
            mockMeshFactory,
            mockViewportShading
        );
    });

    it('should register event listeners on init', () => {
        expect(mockEventBus.on).toHaveBeenCalledWith('cube:created', expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith('cube:deleted', expect.any(Function));
        expect(mockEventBus.on).toHaveBeenCalledWith('cube:visibility-changed', expect.any(Function));
    });

    describe('handleCubeCreated', () => {
        it('should create mesh and add to scene', () => {
            // Simulate event callback
            const callback = (mockEventBus.on as any).mock.calls.find((call: any) => call[0] === 'cube:created')[1];

            const cube = { id: 'test-cube', name: 'Cube 1' };
            callback({ cube });

            expect(mockMeshFactory.createMesh).toHaveBeenCalledWith(cube);
            expect(mockSceneManager.addMesh).toHaveBeenCalledWith('test-cube', mockMesh);
            expect(mockViewportShading.applyToMesh).toHaveBeenCalledWith(mockMesh);
        });

        it('should add to parent mesh if parentId provided', () => {
            const callback = (mockEventBus.on as any).mock.calls.find((call: any) => call[0] === 'cube:created')[1];

            const parentMesh = { add: vi.fn() };
            mockSceneManager.getMesh.mockReturnValue(parentMesh);

            const cube = { id: 'test-cube', parentId: 'parent-cube' };
            callback({ cube });

            expect(mockSceneManager.getMesh).toHaveBeenCalledWith('parent-cube');
            expect(parentMesh.add).toHaveBeenCalledWith(mockMesh);
        });
    });

    describe('handleCubeDeleted', () => {
        it('should remove mesh and cleanup', () => {
            const callback = (mockEventBus.on as any).mock.calls.find((call: any) => call[0] === 'cube:deleted')[1];

            callback({ cubeIds: ['test-cube'] });

            expect(mockSceneManager.removeMesh).toHaveBeenCalledWith('test-cube');
            expect(mockSceneManager.detachTransformControls).toHaveBeenCalled();
            expect(mockViewportShading.removeMesh).toHaveBeenCalledWith('test-cube');
        });
    });

    describe('handleVisibilityChanged', () => {
        it('should toggle mesh visibility', () => {
            const callback = (mockEventBus.on as any).mock.calls.find((call: any) => call[0] === 'cube:visibility-changed')[1];

            mockSceneManager.getMesh.mockReturnValue(mockMesh);

            callback({ cubeId: 'test-cube', visible: false });

            expect(mockMesh.visible).toBe(false);
            expect(mockViewportShading.setObjectVisible).toHaveBeenCalledWith('test-cube', false);
        });
    });
});
