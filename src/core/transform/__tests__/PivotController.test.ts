import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for PivotController pivot point calculation
 * Using mock objects to avoid Three.js dependencies
 */

type PivotMode = 'median' | 'active' | 'cursor' | 'individual' | 'bounding_box';

interface Vector3 {
    x: number;
    y: number;
    z: number;
}

interface MockMesh {
    id: string;
    position: Vector3;
}

// Testable Cursor3D logic
class TestCursor3D {
    private position: Vector3 = { x: 0, y: 0, z: 0 };
    private visible = true;

    getPosition(): Vector3 {
        return { ...this.position };
    }

    setPosition(pos: Vector3): void {
        this.position = { ...pos };
    }

    resetToOrigin(): void {
        this.position = { x: 0, y: 0, z: 0 };
    }

    isVisible(): boolean {
        return this.visible;
    }

    setVisible(visible: boolean): void {
        this.visible = visible;
    }

    toggleVisibility(): void {
        this.visible = !this.visible;
    }
}

// Testable PivotController logic
class TestPivotController {
    private mode: PivotMode = 'median';
    private cursor: TestCursor3D = new TestCursor3D();

    getMode(): PivotMode {
        return this.mode;
    }

    setMode(mode: PivotMode): void {
        this.mode = mode;
    }

    cycleMode(): void {
        const modes: PivotMode[] = ['median', 'active', 'cursor', 'individual', 'bounding_box'];
        const currentIndex = modes.indexOf(this.mode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.mode = modes[nextIndex];
    }

    getCursor(): TestCursor3D {
        return this.cursor;
    }

    /**
     * Calculate pivot point based on mode and selection
     */
    getPivotPoint(meshes: MockMesh[], activeMeshId: string | null): Vector3 {
        if (meshes.length === 0) {
            return this.cursor.getPosition();
        }

        switch (this.mode) {
            case 'median':
                return this.calculateMedianPoint(meshes);
            case 'active':
                return this.getActiveMeshPosition(meshes, activeMeshId);
            case 'cursor':
                return this.cursor.getPosition();
            case 'bounding_box':
                return this.calculateBoundingBoxCenter(meshes);
            case 'individual':
            default:
                return this.calculateMedianPoint(meshes);
        }
    }

    private calculateMedianPoint(meshes: MockMesh[]): Vector3 {
        const sum = { x: 0, y: 0, z: 0 };
        for (const mesh of meshes) {
            sum.x += mesh.position.x;
            sum.y += mesh.position.y;
            sum.z += mesh.position.z;
        }
        return {
            x: sum.x / meshes.length,
            y: sum.y / meshes.length,
            z: sum.z / meshes.length,
        };
    }

    private getActiveMeshPosition(meshes: MockMesh[], activeMeshId: string | null): Vector3 {
        const activeMesh = meshes.find(m => m.id === activeMeshId);
        if (activeMesh) {
            return { ...activeMesh.position };
        }
        return this.calculateMedianPoint(meshes);
    }

    private calculateBoundingBoxCenter(meshes: MockMesh[]): Vector3 {
        let minX = Infinity, minY = Infinity, minZ = Infinity;
        let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

        for (const mesh of meshes) {
            minX = Math.min(minX, mesh.position.x);
            minY = Math.min(minY, mesh.position.y);
            minZ = Math.min(minZ, mesh.position.z);
            maxX = Math.max(maxX, mesh.position.x);
            maxY = Math.max(maxY, mesh.position.y);
            maxZ = Math.max(maxZ, mesh.position.z);
        }

        return {
            x: (minX + maxX) / 2,
            y: (minY + maxY) / 2,
            z: (minZ + maxZ) / 2,
        };
    }

    getModeDisplayName(): string {
        const names: Record<PivotMode, string> = {
            median: 'Median Point',
            active: 'Active Element',
            cursor: '3D Cursor',
            individual: 'Individual Origins',
            bounding_box: 'Bounding Box Center',
        };
        return names[this.mode];
    }
}

describe('PivotController', () => {
    let controller: TestPivotController;

    beforeEach(() => {
        controller = new TestPivotController();
    });

    describe('pivot modes', () => {
        it('should start in median mode', () => {
            expect(controller.getMode()).toBe('median');
        });

        it('should set pivot mode', () => {
            controller.setMode('cursor');
            expect(controller.getMode()).toBe('cursor');
        });

        it('should cycle through modes', () => {
            expect(controller.getMode()).toBe('median');

            controller.cycleMode();
            expect(controller.getMode()).toBe('active');

            controller.cycleMode();
            expect(controller.getMode()).toBe('cursor');

            controller.cycleMode();
            expect(controller.getMode()).toBe('individual');

            controller.cycleMode();
            expect(controller.getMode()).toBe('bounding_box');

            controller.cycleMode();
            expect(controller.getMode()).toBe('median'); // wraps around
        });
    });

    describe('getPivotPoint()', () => {
        const meshes: MockMesh[] = [
            { id: 'cube-1', position: { x: 0, y: 0, z: 0 } },
            { id: 'cube-2', position: { x: 10, y: 0, z: 0 } },
            { id: 'cube-3', position: { x: 10, y: 10, z: 0 } },
        ];

        it('should calculate median point', () => {
            controller.setMode('median');
            const pivot = controller.getPivotPoint(meshes, null);

            expect(pivot.x).toBeCloseTo(6.67, 1);
            expect(pivot.y).toBeCloseTo(3.33, 1);
            expect(pivot.z).toBe(0);
        });

        it('should return active mesh position', () => {
            controller.setMode('active');
            const pivot = controller.getPivotPoint(meshes, 'cube-2');

            expect(pivot).toEqual({ x: 10, y: 0, z: 0 });
        });

        it('should fall back to median when active mesh not found', () => {
            controller.setMode('active');
            const pivot = controller.getPivotPoint(meshes, 'non-existent');

            expect(pivot.x).toBeCloseTo(6.67, 1);
        });

        it('should return cursor position in cursor mode', () => {
            controller.setMode('cursor');
            controller.getCursor().setPosition({ x: 5, y: 5, z: 5 });
            const pivot = controller.getPivotPoint(meshes, null);

            expect(pivot).toEqual({ x: 5, y: 5, z: 5 });
        });

        it('should calculate bounding box center', () => {
            controller.setMode('bounding_box');
            const pivot = controller.getPivotPoint(meshes, null);

            expect(pivot).toEqual({ x: 5, y: 5, z: 0 });
        });

        it('should return cursor position when no meshes', () => {
            controller.getCursor().setPosition({ x: 1, y: 2, z: 3 });
            const pivot = controller.getPivotPoint([], null);

            expect(pivot).toEqual({ x: 1, y: 2, z: 3 });
        });
    });

    describe('mode display names', () => {
        it('should return correct display names', () => {
            controller.setMode('median');
            expect(controller.getModeDisplayName()).toBe('Median Point');

            controller.setMode('active');
            expect(controller.getModeDisplayName()).toBe('Active Element');

            controller.setMode('cursor');
            expect(controller.getModeDisplayName()).toBe('3D Cursor');
        });
    });
});

describe('Cursor3D', () => {
    let cursor: TestCursor3D;

    beforeEach(() => {
        cursor = new TestCursor3D();
    });

    describe('position', () => {
        it('should start at origin', () => {
            expect(cursor.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
        });

        it('should set position', () => {
            cursor.setPosition({ x: 5, y: 10, z: 15 });
            expect(cursor.getPosition()).toEqual({ x: 5, y: 10, z: 15 });
        });

        it('should reset to origin', () => {
            cursor.setPosition({ x: 100, y: 100, z: 100 });
            cursor.resetToOrigin();
            expect(cursor.getPosition()).toEqual({ x: 0, y: 0, z: 0 });
        });
    });

    describe('visibility', () => {
        it('should start visible', () => {
            expect(cursor.isVisible()).toBe(true);
        });

        it('should set visibility', () => {
            cursor.setVisible(false);
            expect(cursor.isVisible()).toBe(false);
        });

        it('should toggle visibility', () => {
            cursor.toggleVisibility();
            expect(cursor.isVisible()).toBe(false);

            cursor.toggleVisibility();
            expect(cursor.isVisible()).toBe(true);
        });
    });
});
