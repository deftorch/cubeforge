import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for BoxSelectTool selection logic
 * Mocked to test core logic without DOM/Canvas dependencies
 */

interface Bounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;
}

interface Cube {
    id: string;
    screenPosition: { x: number; y: number };
    locked: boolean;
    visible: boolean;
}

// Testable BoxSelect logic
class TestBoxSelectLogic {
    private startPosition = { x: 0, y: 0 };
    private endPosition = { x: 0, y: 0 };
    private isSelecting = false;

    startSelection(x: number, y: number): void {
        this.startPosition = { x, y };
        this.endPosition = { x, y };
        this.isSelecting = true;
    }

    updateSelection(x: number, y: number): void {
        if (!this.isSelecting) return;
        this.endPosition = { x, y };
    }

    endSelection(): Bounds {
        this.isSelecting = false;
        return this.getBounds();
    }

    getBounds(): Bounds {
        return {
            minX: Math.min(this.startPosition.x, this.endPosition.x),
            minY: Math.min(this.startPosition.y, this.endPosition.y),
            maxX: Math.max(this.startPosition.x, this.endPosition.x),
            maxY: Math.max(this.startPosition.y, this.endPosition.y),
        };
    }

    isPointInBounds(x: number, y: number, bounds: Bounds): boolean {
        return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
    }

    selectObjectsInBounds(cubes: Cube[], bounds: Bounds): string[] {
        const selectedIds: string[] = [];

        for (const cube of cubes) {
            // Skip locked or hidden cubes
            if (cube.locked || !cube.visible) continue;

            if (this.isPointInBounds(cube.screenPosition.x, cube.screenPosition.y, bounds)) {
                selectedIds.push(cube.id);
            }
        }

        return selectedIds;
    }

    isActive(): boolean {
        return this.isSelecting;
    }
}

describe('BoxSelectTool', () => {
    let tool: TestBoxSelectLogic;

    beforeEach(() => {
        tool = new TestBoxSelectLogic();
    });

    describe('selection bounds', () => {
        it('should calculate bounds correctly for left-to-right drag', () => {
            tool.startSelection(10, 20);
            tool.updateSelection(100, 80);
            const bounds = tool.endSelection();

            expect(bounds).toEqual({
                minX: 10,
                minY: 20,
                maxX: 100,
                maxY: 80,
            });
        });

        it('should calculate bounds correctly for right-to-left drag', () => {
            tool.startSelection(100, 80);
            tool.updateSelection(10, 20);
            const bounds = tool.endSelection();

            expect(bounds).toEqual({
                minX: 10,
                minY: 20,
                maxX: 100,
                maxY: 80,
            });
        });

        it('should handle diagonal drags', () => {
            tool.startSelection(50, 100);
            tool.updateSelection(10, 20);
            const bounds = tool.endSelection();

            expect(bounds.minX).toBe(10);
            expect(bounds.maxY).toBe(100);
        });
    });

    describe('isPointInBounds()', () => {
        const bounds: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };

        it('should return true for point inside bounds', () => {
            expect(tool.isPointInBounds(50, 50, bounds)).toBe(true);
        });

        it('should return true for point on edge', () => {
            expect(tool.isPointInBounds(0, 0, bounds)).toBe(true);
            expect(tool.isPointInBounds(100, 100, bounds)).toBe(true);
        });

        it('should return false for point outside bounds', () => {
            expect(tool.isPointInBounds(-1, 50, bounds)).toBe(false);
            expect(tool.isPointInBounds(50, 101, bounds)).toBe(false);
        });
    });

    describe('selectObjectsInBounds()', () => {
        const cubes: Cube[] = [
            { id: 'cube-1', screenPosition: { x: 50, y: 50 }, locked: false, visible: true },
            { id: 'cube-2', screenPosition: { x: 150, y: 50 }, locked: false, visible: true },
            { id: 'cube-3', screenPosition: { x: 50, y: 150 }, locked: false, visible: true },
            { id: 'cube-4', screenPosition: { x: 25, y: 25 }, locked: true, visible: true },
            { id: 'cube-5', screenPosition: { x: 75, y: 75 }, locked: false, visible: false },
        ];

        it('should select cubes inside bounds', () => {
            const bounds: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
            const selected = tool.selectObjectsInBounds(cubes, bounds);

            expect(selected).toContain('cube-1');
            expect(selected).not.toContain('cube-2');
            expect(selected).not.toContain('cube-3');
        });

        it('should not select locked cubes', () => {
            const bounds: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
            const selected = tool.selectObjectsInBounds(cubes, bounds);

            expect(selected).not.toContain('cube-4');
        });

        it('should not select hidden cubes', () => {
            const bounds: Bounds = { minX: 0, minY: 0, maxX: 100, maxY: 100 };
            const selected = tool.selectObjectsInBounds(cubes, bounds);

            expect(selected).not.toContain('cube-5');
        });

        it('should return empty array when no cubes in bounds', () => {
            const bounds: Bounds = { minX: 200, minY: 200, maxX: 300, maxY: 300 };
            const selected = tool.selectObjectsInBounds(cubes, bounds);

            expect(selected).toHaveLength(0);
        });
    });

    describe('selection state', () => {
        it('should track active state', () => {
            expect(tool.isActive()).toBe(false);

            tool.startSelection(0, 0);
            expect(tool.isActive()).toBe(true);

            tool.endSelection();
            expect(tool.isActive()).toBe(false);
        });

        it('should not update when not active', () => {
            tool.updateSelection(100, 100);
            const bounds = tool.getBounds();

            expect(bounds).toEqual({ minX: 0, minY: 0, maxX: 0, maxY: 0 });
        });
    });
});
