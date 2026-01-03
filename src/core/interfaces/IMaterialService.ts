import type { CubeMaterial } from '@/types';

/**
 * Interface for MaterialService
 * Handles material operations with undo/redo support
 */
export interface IMaterialService {
    /**
     * Update cube material and sync with Three.js mesh
     * For live preview during color picker changes
     */
    updateMaterial(cubeId: string, material: Partial<CubeMaterial>): void;

    /**
     * Update material with undo support
     * For committing changes from UI inputs
     */
    updateMaterialWithUndo(
        cubeId: string,
        material: Partial<CubeMaterial>,
        previousMaterial?: Partial<CubeMaterial>
    ): void;
}
