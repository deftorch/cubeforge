import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Test for Hierarchy Logic
 * Mocking dependencies to test logic in isolation.
 */

// Basic Mock Interfaces
interface Transform {
    position: { x: number; y: number; z: number };
    rotation: { x: number; y: number; z: number };
    scale: { x: number; y: number; z: number };
}

interface Cube {
    id: string;
    parentId?: string;
    transform: Transform;
    name: string;
}

// Mock SceneManager interaction
const mockSceneManager = {
    getMesh: vi.fn(),
    addMesh: vi.fn(),
    scene: {
        attach: vi.fn(),
        add: vi.fn(),
    },
};

// Mock Mesh to simulate Three.js Object3D behavior (simplified)
class MockMesh {
    id: string;
    name: string;
    parent: MockMesh | null = null;
    children: MockMesh[] = [];

    position = { x: 0, y: 0, z: 0, copy: vi.fn() };
    rotation = { x: 0, y: 0, z: 0, copy: vi.fn() };
    scale = { x: 1, y: 1, z: 1, copy: vi.fn() };

    constructor(id: string) {
        this.id = id;
        this.name = id;
    }

    attach(child: MockMesh) {
        // Remove from old parent
        if (child.parent) {
            child.parent.children = child.parent.children.filter(c => c !== child);
        }
        // Add to new parent
        this.children.push(child);
        child.parent = this;
    }

    add(child: MockMesh) {
        this.attach(child);
    }
}

// Testable Wrapper for Hierarchy Logic
class HierarchyTester {
    cubes: Map<string, Cube> = new Map();
    meshes: Map<string, MockMesh> = new Map();

    createCube(id: string) {
        const cube: Cube = {
            id,
            name: id,
            transform: {
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                scale: { x: 1, y: 1, z: 1 }
            }
        };
        this.cubes.set(id, cube);

        const mesh = new MockMesh(id);
        this.meshes.set(id, mesh);

        mockSceneManager.getMesh.mockImplementation((id) => this.meshes.get(id));

        return cube;
    }

    getCube(id: string) {
        return this.cubes.get(id);
    }

    // SIMULATED LOGIC FROM CubeManager
    parentCube(childId: string, parentId?: string): boolean {
        const childCube = this.cubes.get(childId);
        if (!childCube) return false;

        if (childId === parentId) return false;

        // Circular check
        if (parentId) {
            let current = this.cubes.get(parentId);
            while (current && current.parentId) {
                if (current.parentId === childId) {
                    console.warn('Circular dependency');
                    return false;
                }
                current = this.cubes.get(current.parentId);
            }
        }

        const childMesh = this.meshes.get(childId);
        if (parentId) {
            const parentMesh = this.meshes.get(parentId);
            if (childMesh && parentMesh) {
                parentMesh.attach(childMesh);
            }
        } else {
            // Unparent
            if (childMesh) {
                // In real app: scene.attach(childMesh)
                childMesh.parent = null; // Simulating detach to root
            }
        }

        childCube.parentId = parentId;
        return true;
    }

    getChildren(parentId: string): Cube[] {
        return Array.from(this.cubes.values()).filter(c => c.parentId === parentId);
    }

    deleteCubeCascade(cubeId: string) {
        const children = this.getChildren(cubeId);
        children.forEach(c => this.parentCube(c.id, undefined)); // Unparent first

        this.cubes.delete(cubeId);
        this.meshes.delete(cubeId);
    }
}

describe('Hierarchy System', () => {
    let tester: HierarchyTester;

    beforeEach(() => {
        tester = new HierarchyTester();
        vi.clearAllMocks();
    });

    it('should parent a cube to another', () => {
        tester.createCube('parent');
        tester.createCube('child');

        tester.parentCube('child', 'parent');

        const child = tester.getCube('child');
        expect(child?.parentId).toBe('parent');

        const parentMesh = tester.meshes.get('parent');
        const childMesh = tester.meshes.get('child');
        expect(parentMesh?.children).toContain(childMesh);
        expect(childMesh?.parent).toBe(parentMesh);
    });

    it('should unparent a cube', () => {
        tester.createCube('parent');
        tester.createCube('child');
        tester.parentCube('child', 'parent');

        tester.parentCube('child', undefined); // Unparent

        const child = tester.getCube('child');
        expect(child?.parentId).toBeUndefined();

        const childMesh = tester.meshes.get('child');
        expect(childMesh?.parent).toBeNull();
    });

    it('should detect circular dependency (Direct)', () => {
        tester.createCube('A');
        tester.createCube('B');

        tester.parentCube('B', 'A'); // B -> A

        // Try A -> B (Should fail)
        const result = tester.parentCube('A', 'B');

        expect(result).toBe(false);
        expect(tester.getCube('A')?.parentId).toBeUndefined();
    });

    it('should detect circular dependency (Indirect)', () => {
        tester.createCube('A');
        tester.createCube('B');
        tester.createCube('C');

        tester.parentCube('B', 'A'); // B -> A
        tester.parentCube('C', 'B'); // C -> B

        // Try A -> C (Should fail because C depends on A)
        const result = tester.parentCube('A', 'C');

        expect(result).toBe(false);
    });

    it('should unparent children when deleting parent', () => {
        tester.createCube('parent');
        tester.createCube('child1');
        tester.createCube('child2');

        tester.parentCube('child1', 'parent');
        tester.parentCube('child2', 'parent');

        tester.deleteCubeCascade('parent');

        expect(tester.getCube('child1')?.parentId).toBeUndefined();
        expect(tester.getCube('child2')?.parentId).toBeUndefined();
        expect(tester.getCube('parent')).toBeUndefined();
    });
});
