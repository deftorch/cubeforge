import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for ViewportShading mode management
 * Using mock objects to avoid Three.js dependencies
 */

type ShadingMode = 'solid' | 'wireframe' | 'material' | 'rendered';

interface MockMaterial {
    wireframe: boolean;
    transparent: boolean;
    opacity: number;
    depthWrite: boolean;
    metalness: number;
    roughness: number;
}

interface MockMesh {
    id: string;
    material: MockMaterial;
    visible: boolean;
}

// Testable ViewportShading logic
class TestViewportShading {
    private mode: ShadingMode = 'solid';
    private xRayEnabled = false;
    private originalStates: Map<string, MockMaterial> = new Map();
    private meshes: Map<string, MockMesh> = new Map();

    getMode(): ShadingMode {
        return this.mode;
    }

    setMode(mode: ShadingMode): void {
        // Restore original state before switching
        this.restoreOriginalStates();
        this.mode = mode;
        this.applyModeToAll();
    }

    isXRayEnabled(): boolean {
        return this.xRayEnabled;
    }

    setXRay(enabled: boolean): void {
        this.xRayEnabled = enabled;
        this.applyXRayToAll();
    }

    toggleXRay(): void {
        this.setXRay(!this.xRayEnabled);
    }

    toggleWireframe(): void {
        if (this.mode === 'wireframe') {
            this.setMode('solid');
        } else {
            this.setMode('wireframe');
        }
    }

    addMesh(id: string, mesh: MockMesh): void {
        this.meshes.set(id, mesh);
        this.saveOriginalState(id, mesh.material);
        this.applyModeToMesh(mesh);
        if (this.xRayEnabled) {
            this.applyXRayToMesh(mesh);
        }
    }

    removeMesh(id: string): void {
        this.meshes.delete(id);
        this.originalStates.delete(id);
    }

    private saveOriginalState(id: string, material: MockMaterial): void {
        this.originalStates.set(id, { ...material });
    }

    private restoreOriginalStates(): void {
        for (const [id, mesh] of this.meshes) {
            const original = this.originalStates.get(id);
            if (original) {
                mesh.material.wireframe = original.wireframe;
                mesh.material.transparent = original.transparent;
                mesh.material.opacity = original.opacity;
            }
        }
    }

    private applyModeToAll(): void {
        for (const mesh of this.meshes.values()) {
            this.applyModeToMesh(mesh);
        }
    }

    private applyModeToMesh(mesh: MockMesh): void {
        switch (this.mode) {
            case 'solid':
                mesh.material.wireframe = false;
                mesh.material.opacity = 1;
                mesh.material.transparent = false;
                break;
            case 'wireframe':
                mesh.material.wireframe = true;
                break;
            case 'material':
                mesh.material.wireframe = false;
                mesh.material.metalness = 0.3;
                mesh.material.roughness = 0.5;
                break;
            case 'rendered':
                mesh.material.wireframe = false;
                break;
        }
    }

    private applyXRayToAll(): void {
        for (const mesh of this.meshes.values()) {
            if (this.xRayEnabled) {
                this.applyXRayToMesh(mesh);
            } else {
                this.removeXRayFromMesh(mesh);
            }
        }
    }

    private applyXRayToMesh(mesh: MockMesh): void {
        mesh.material.transparent = true;
        mesh.material.opacity = 0.5;
        mesh.material.depthWrite = false;
    }

    private removeXRayFromMesh(mesh: MockMesh): void {
        const original = this.originalStates.get(mesh.id);
        if (original && !this.xRayEnabled) {
            mesh.material.transparent = original.transparent;
            mesh.material.opacity = original.opacity;
            mesh.material.depthWrite = true;
        }
    }

    getModeDisplayName(): string {
        const names: Record<ShadingMode, string> = {
            solid: 'Solid',
            wireframe: 'Wireframe',
            material: 'Material Preview',
            rendered: 'Rendered',
        };
        return names[this.mode];
    }

    getMesh(id: string): MockMesh | undefined {
        return this.meshes.get(id);
    }
}

// Helper to create mock mesh with material
function createMockMesh(id: string): MockMesh {
    return {
        id,
        material: {
            wireframe: false,
            transparent: false,
            opacity: 1,
            depthWrite: true,
            metalness: 0.1,
            roughness: 0.7,
        },
        visible: true,
    };
}

describe('ViewportShading', () => {
    let shading: TestViewportShading;

    beforeEach(() => {
        shading = new TestViewportShading();
    });

    describe('shading modes', () => {
        it('should start in solid mode', () => {
            expect(shading.getMode()).toBe('solid');
        });

        it('should set wireframe mode', () => {
            shading.setMode('wireframe');
            expect(shading.getMode()).toBe('wireframe');
        });

        it('should set material mode', () => {
            shading.setMode('material');
            expect(shading.getMode()).toBe('material');
        });

        it('should toggle wireframe mode', () => {
            shading.toggleWireframe();
            expect(shading.getMode()).toBe('wireframe');

            shading.toggleWireframe();
            expect(shading.getMode()).toBe('solid');
        });
    });

    describe('applying modes to meshes', () => {
        it('should apply solid mode', () => {
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);
            shading.setMode('solid');

            expect(mesh.material.wireframe).toBe(false);
            expect(mesh.material.opacity).toBe(1);
        });

        it('should apply wireframe mode', () => {
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);
            shading.setMode('wireframe');

            expect(mesh.material.wireframe).toBe(true);
        });

        it('should apply mode to newly added mesh', () => {
            shading.setMode('wireframe');
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);

            expect(mesh.material.wireframe).toBe(true);
        });
    });

    describe('X-Ray mode', () => {
        it('should start with X-Ray disabled', () => {
            expect(shading.isXRayEnabled()).toBe(false);
        });

        it('should enable X-Ray', () => {
            shading.setXRay(true);
            expect(shading.isXRayEnabled()).toBe(true);
        });

        it('should toggle X-Ray', () => {
            shading.toggleXRay();
            expect(shading.isXRayEnabled()).toBe(true);

            shading.toggleXRay();
            expect(shading.isXRayEnabled()).toBe(false);
        });

        it('should apply X-Ray transparency to mesh', () => {
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);
            shading.setXRay(true);

            expect(mesh.material.transparent).toBe(true);
            expect(mesh.material.opacity).toBe(0.5);
        });

        it('should remove X-Ray when disabled', () => {
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);
            shading.setXRay(true);
            shading.setXRay(false);

            expect(mesh.material.transparent).toBe(false);
            expect(mesh.material.opacity).toBe(1);
        });

        it('should apply X-Ray to newly added mesh when enabled', () => {
            shading.setXRay(true);
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);

            expect(mesh.material.transparent).toBe(true);
            expect(mesh.material.opacity).toBe(0.5);
        });
    });

    describe('mode display names', () => {
        it('should return correct display name for solid', () => {
            shading.setMode('solid');
            expect(shading.getModeDisplayName()).toBe('Solid');
        });

        it('should return correct display name for wireframe', () => {
            shading.setMode('wireframe');
            expect(shading.getModeDisplayName()).toBe('Wireframe');
        });

        it('should return correct display name for material', () => {
            shading.setMode('material');
            expect(shading.getModeDisplayName()).toBe('Material Preview');
        });
    });

    describe('mesh management', () => {
        it('should add mesh', () => {
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);

            expect(shading.getMesh('cube-1')).toBe(mesh);
        });

        it('should remove mesh', () => {
            const mesh = createMockMesh('cube-1');
            shading.addMesh('cube-1', mesh);
            shading.removeMesh('cube-1');

            expect(shading.getMesh('cube-1')).toBeUndefined();
        });
    });
});
