import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for CircleSelectTool selection logic
 * Mocked to test core logic without DOM/Canvas dependencies
 */

interface Cube {
    id: string;
    screenPosition: { x: number; y: number };
    locked: boolean;
    visible: boolean;
}

// Testable CircleSelect logic
class TestCircleSelectLogic {
    private centerX = 0;
    private centerY = 0;
    private radius = 50;

    setCenter(x: number, y: number): void {
        this.centerX = x;
        this.centerY = y;
    }

    setRadius(radius: number): void {
        this.radius = Math.max(10, Math.min(200, radius)); // Clamp between 10-200
    }

    getRadius(): number {
        return this.radius;
    }

    getCenter(): { x: number; y: number } {
        return { x: this.centerX, y: this.centerY };
    }

    isPointInCircle(x: number, y: number): boolean {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        return distance <= this.radius;
    }

    getDistanceFromCenter(x: number, y: number): number {
        const dx = x - this.centerX;
        const dy = y - this.centerY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    selectObjectsInRadius(cubes: Cube[]): string[] {
        const selectedIds: string[] = [];

        for (const cube of cubes) {
            if (cube.locked || !cube.visible) continue;

            if (this.isPointInCircle(cube.screenPosition.x, cube.screenPosition.y)) {
                selectedIds.push(cube.id);
            }
        }

        return selectedIds;
    }

    adjustRadius(delta: number): void {
        this.setRadius(this.radius + delta);
    }
}

describe('CircleSelectTool', () => {
    let tool: TestCircleSelectLogic;

    beforeEach(() => {
        tool = new TestCircleSelectLogic();
    });

    describe('center and radius', () => {
        it('should set center position', () => {
            tool.setCenter(100, 200);
            expect(tool.getCenter()).toEqual({ x: 100, y: 200 });
        });

        it('should set radius', () => {
            tool.setRadius(75);
            expect(tool.getRadius()).toBe(75);
        });

        it('should clamp radius to minimum', () => {
            tool.setRadius(5);
            expect(tool.getRadius()).toBe(10);
        });

        it('should clamp radius to maximum', () => {
            tool.setRadius(300);
            expect(tool.getRadius()).toBe(200);
        });

        it('should adjust radius with delta', () => {
            tool.setRadius(50);
            tool.adjustRadius(10);
            expect(tool.getRadius()).toBe(60);

            tool.adjustRadius(-20);
            expect(tool.getRadius()).toBe(40);
        });
    });

    describe('isPointInCircle()', () => {
        beforeEach(() => {
            tool.setCenter(100, 100);
            tool.setRadius(50);
        });

        it('should return true for point inside circle', () => {
            expect(tool.isPointInCircle(100, 100)).toBe(true); // center
            expect(tool.isPointInCircle(120, 120)).toBe(true); // inside
        });

        it('should return true for point on edge', () => {
            expect(tool.isPointInCircle(150, 100)).toBe(true); // exactly on edge
        });

        it('should return false for point outside circle', () => {
            expect(tool.isPointInCircle(200, 200)).toBe(false);
            expect(tool.isPointInCircle(0, 0)).toBe(false);
        });
    });

    describe('getDistanceFromCenter()', () => {
        beforeEach(() => {
            tool.setCenter(0, 0);
        });

        it('should calculate correct distance', () => {
            expect(tool.getDistanceFromCenter(3, 4)).toBe(5); // 3-4-5 triangle
            expect(tool.getDistanceFromCenter(0, 0)).toBe(0);
        });

        it('should handle negative coordinates', () => {
            expect(tool.getDistanceFromCenter(-3, -4)).toBe(5);
        });
    });

    describe('selectObjectsInRadius()', () => {
        const cubes: Cube[] = [
            { id: 'cube-1', screenPosition: { x: 100, y: 100 }, locked: false, visible: true },
            { id: 'cube-2', screenPosition: { x: 200, y: 200 }, locked: false, visible: true },
            { id: 'cube-3', screenPosition: { x: 110, y: 110 }, locked: false, visible: true },
            { id: 'cube-4', screenPosition: { x: 105, y: 105 }, locked: true, visible: true },
            { id: 'cube-5', screenPosition: { x: 95, y: 95 }, locked: false, visible: false },
        ];

        beforeEach(() => {
            tool.setCenter(100, 100);
            tool.setRadius(30);
        });

        it('should select cubes inside circle', () => {
            const selected = tool.selectObjectsInRadius(cubes);

            expect(selected).toContain('cube-1');
            expect(selected).toContain('cube-3');
            expect(selected).not.toContain('cube-2');
        });

        it('should not select locked cubes', () => {
            const selected = tool.selectObjectsInRadius(cubes);
            expect(selected).not.toContain('cube-4');
        });

        it('should not select hidden cubes', () => {
            const selected = tool.selectObjectsInRadius(cubes);
            expect(selected).not.toContain('cube-5');
        });

        it('should return empty array when no cubes in radius', () => {
            tool.setCenter(500, 500);
            const selected = tool.selectObjectsInRadius(cubes);
            expect(selected).toHaveLength(0);
        });

        it('should select more cubes with larger radius', () => {
            tool.setRadius(200);
            const selected = tool.selectObjectsInRadius(cubes);

            // Should now include cube-2 which is at (200, 200)
            expect(selected).toContain('cube-2');
        });
    });
});
