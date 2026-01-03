import type { CubeMaterial } from '@/types';
import type { IMaterialService } from '@/core/interfaces';
import { sceneActions } from '@/stores/sceneStore';
import { historyActions } from '@/stores/historyStore';
import { generateUUID } from '@/utils';
import { getSceneManager } from '@/core/scene/SceneManager';
import { getMeshFactory } from '@/core/scene/MeshFactory';
import { eventBus } from '@/core/events';

/**
 * MaterialService - Handles all material operations with undo/redo support
 * 
 * Extracted from CubeManager to follow Single Responsibility Principle.
 * Manages material updates and mesh synchronization.
 */
export class MaterialService implements IMaterialService {
    /**
     * Update cube material and sync with Three.js mesh
     * For live preview during color picker changes
     */
    updateMaterial(cubeId: string, material: Partial<CubeMaterial>): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        // Update store
        sceneActions.updateCubeMaterial(cubeId, material);

        // Sync with Three.js mesh
        const sceneManager = getSceneManager();
        const mesh = sceneManager.getMesh(cubeId);
        if (mesh) {
            getMeshFactory().updateMeshMaterial(mesh, material);
        }

        // Emit event
        eventBus.emit('cube:material-changed', { cubeId, material });
    }

    /**
     * Update material with undo support
     * For committing changes from UI inputs
     */
    updateMaterialWithUndo(
        cubeId: string,
        material: Partial<CubeMaterial>,
        previousMaterial?: Partial<CubeMaterial>
    ): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        const oldMaterial = previousMaterial
            ? { ...cube.material, ...previousMaterial }
            : { ...cube.material };

        this.updateMaterial(cubeId, material);

        historyActions.execute({
            id: generateUUID(),
            description: 'Change Material',
            execute: () => this.updateMaterial(cubeId, material),
            undo: () => this.updateMaterial(cubeId, oldMaterial),
            timestamp: Date.now(),
        });
    }
}

// Singleton instance
let materialServiceInstance: MaterialService | null = null;

export function getMaterialService(): MaterialService {
    if (!materialServiceInstance) {
        materialServiceInstance = new MaterialService();
    }
    return materialServiceInstance;
}

// Export for resetting in tests
export function resetMaterialService(): void {
    materialServiceInstance = null;
}
