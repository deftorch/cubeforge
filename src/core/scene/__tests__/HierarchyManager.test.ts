import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as THREE from 'three';
import { HierarchyManager, getHierarchyManager } from '../HierarchyManager';
import type { ISceneManager } from '@/core/interfaces';

// Mock sceneActions
vi.mock('@/stores/sceneStore', () => ({
    sceneActions: {
        getCube: vi.fn(),
        getAllCubes: vi.fn(),
        updateCube: vi.fn(),
    },
}));

// Mock historyActions
vi.mock('@/stores/historyStore', () => ({
    historyActions: {
        execute: vi.fn((cmd) => cmd.execute?.()),
    },
}));

// Mock generateUUID
vi.mock('@/utils', () => ({
    generateUUID: vi.fn(() => 'mock-uuid'),
}));

import { sceneActions } from '@/stores/sceneStore';

// Helper to create mock mesh
const createMockMesh = (id: string): THREE.Mesh => {
    const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial()
    );
    mesh.name = id;
    mesh.userData.cubeId = id;
    return mesh;
};

// Mock SceneManager
const createMockSceneManager = (): ISceneManager => {
    const meshes = new Map<string, THREE.Mesh>();
    const scene = new THREE.Scene();

    return {
        scene,
        camera: new THREE.PerspectiveCamera(),
        renderer: {} as THREE.WebGLRenderer,
        addMesh: vi.fn((id, mesh) => {
            meshes.set(id, mesh);
            scene.add(mesh);
        }),
        removeMesh: vi.fn((id) => {
            const mesh = meshes.get(id);
            if (mesh) {
                scene.remove(mesh);
                meshes.delete(id);
            }
        }),
        getMesh: vi.fn((id) => meshes.get(id)),
        getAllMeshes: vi.fn(() => Array.from(meshes.values())),
        attachTransformControls: vi.fn(),
        detachTransformControls: vi.fn(),
        setTransformMode: vi.fn(),
        setTransformSpace: vi.fn(),
        setGridVisible: vi.fn(),
        focusOn: vi.fn(),
        resetCamera: vi.fn(),
        getCanvas: vi.fn(() => document.createElement('canvas')),
    };
};

describe('HierarchyManager', () => {
    let manager: HierarchyManager;
    let mockSceneManager: ISceneManager;

    beforeEach(() => {
        vi.clearAllMocks();
        manager = new HierarchyManager();
        mockSceneManager = createMockSceneManager();
    });

    describe('getChildren', () => {
        it('should return empty array when no children', () => {
            vi.mocked(sceneActions.getAllCubes).mockReturnValue([
                { id: 'parent', name: 'Parent', parentId: undefined } as any,
            ]);

            const children = manager.getChildren('parent');

            expect(children).toEqual([]);
        });

        it('should return direct children only', () => {
            const cubes = [
                { id: 'parent', name: 'Parent', parentId: undefined },
                { id: 'child1', name: 'Child 1', parentId: 'parent' },
                { id: 'child2', name: 'Child 2', parentId: 'parent' },
                { id: 'grandchild', name: 'Grandchild', parentId: 'child1' },
            ] as any[];

            vi.mocked(sceneActions.getAllCubes).mockReturnValue(cubes);

            const children = manager.getChildren('parent');

            expect(children).toHaveLength(2);
            expect(children.map(c => c.id)).toEqual(['child1', 'child2']);
        });
    });

    describe('getDescendants', () => {
        it('should return all descendants recursively', () => {
            const cubes = [
                { id: 'parent', name: 'Parent', parentId: undefined },
                { id: 'child1', name: 'Child 1', parentId: 'parent' },
                { id: 'child2', name: 'Child 2', parentId: 'parent' },
                { id: 'grandchild1', name: 'Grandchild 1', parentId: 'child1' },
                { id: 'grandchild2', name: 'Grandchild 2', parentId: 'child1' },
            ] as any[];

            vi.mocked(sceneActions.getAllCubes).mockReturnValue(cubes);

            const descendants = manager.getDescendants('parent');

            expect(descendants).toHaveLength(4);
            expect(descendants.map(d => d.id)).toContain('child1');
            expect(descendants.map(d => d.id)).toContain('child2');
            expect(descendants.map(d => d.id)).toContain('grandchild1');
            expect(descendants.map(d => d.id)).toContain('grandchild2');
        });
    });

    describe('attachMeshToParentOrScene', () => {
        it('should attach to parent mesh if parentId provided', () => {
            const parentMesh = createMockMesh('parent');
            const childMesh = createMockMesh('child');

            mockSceneManager.addMesh('parent', parentMesh);

            manager.attachMeshToParentOrScene(childMesh, 'parent', mockSceneManager);

            expect(parentMesh.children).toContain(childMesh);
        });

        it('should attach to scene if no parentId', () => {
            const mesh = createMockMesh('cube');

            manager.attachMeshToParentOrScene(mesh, undefined, mockSceneManager);

            expect(mockSceneManager.addMesh).toHaveBeenCalledWith('cube', mesh);
        });

        it('should attach to scene if parent not found', () => {
            const mesh = createMockMesh('cube');

            // Parent doesn't exist
            manager.attachMeshToParentOrScene(mesh, 'nonexistent', mockSceneManager);

            expect(mockSceneManager.addMesh).toHaveBeenCalledWith('cube', mesh);
        });
    });

    describe('getHierarchyManager singleton', () => {
        it('should return the same instance', () => {
            const instance1 = getHierarchyManager();
            const instance2 = getHierarchyManager();

            expect(instance1).toBe(instance2);
        });
    });
});
