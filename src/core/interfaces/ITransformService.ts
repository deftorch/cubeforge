import type { Transform } from '@/types';

/**
 * Interface for TransformService
 * Handles transform operations with undo/redo support
 */
export interface ITransformService {
    /**
     * Start tracking a transform operation
     * Called when user starts dragging a gizmo
     */
    startTransform(cubeId: string): void;

    /**
     * End transform operation and record undo command
     * Called when user releases the gizmo
     */
    endTransform(cubeId: string): void;

    /**
     * Update cube transform and sync with Three.js mesh
     * For live preview during input changes
     */
    updateTransform(cubeId: string, transform: Partial<Transform>): void;

    /**
     * Sync mesh transform from Three.js back to store
     * Called after gizmo manipulation
     */
    syncMeshToStore(cubeId: string): void;

    /**
     * Update transform with undo support
     * For committing changes from UI inputs
     */
    updateTransformWithUndo(
        cubeId: string,
        transform: Partial<Transform>,
        previousTransform: Partial<Transform>,
        description: string
    ): void;
}
