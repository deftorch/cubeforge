import * as THREE from 'three';
import { getSceneManager } from '@/core/scene/SceneManager';
import { selectionActions } from '@/stores/selectionStore';
import { Cursor3D } from './Cursor3D';

export type PivotMode =
    | 'median'           // Center of selection
    | 'active'           // Active/last selected object
    | 'cursor'           // 3D Cursor position
    | 'individual'       // Each object's origin
    | 'boundingBox';     // Bounding box center

/**
 * PivotController - Manages pivot point for transforms
 * 
 * Provides different pivot modes similar to Blender:
 * - Median: Center of all selected objects
 * - Active: Origin of the active (last selected) object
 * - Cursor: Uses `Cursor3D` position
 * - Individual: Each object uses its own origin
 * - Bounding Box: Center of the bounding box of selection
 */
export class PivotController {
    private mode: PivotMode = 'median';
    private cursor3D: Cursor3D;

    constructor() {
        this.cursor3D = new Cursor3D();
    }

    /**
     * Get current pivot mode
     */
    getMode(): PivotMode {
        return this.mode;
    }

    /**
     * Set pivot mode
     */
    setMode(mode: PivotMode): void {
        this.mode = mode;
    }

    /**
     * Cycle through pivot modes
     */
    cycleMode(): void {
        const modes: PivotMode[] = ['median', 'active', 'cursor', 'individual', 'boundingBox'];
        const currentIndex = modes.indexOf(this.mode);
        this.mode = modes[(currentIndex + 1) % modes.length];
    }

    /**
     * Get 3D cursor
     */
    getCursor(): Cursor3D {
        return this.cursor3D;
    }

    /**
     * Calculate pivot point for selection
     */
    getPivotPoint(): THREE.Vector3 {
        const sceneManager = getSceneManager();
        const selectedIds = selectionActions.getSelectedIds();

        if (selectedIds.length === 0) {
            return new THREE.Vector3(0, 0, 0);
        }

        switch (this.mode) {
            case 'cursor':
                return this.cursor3D.getPosition();

            case 'active': {
                // Use last selected object
                const lastId = selectedIds[selectedIds.length - 1];
                const mesh = sceneManager.getMesh(lastId);
                return mesh ? mesh.position.clone() : new THREE.Vector3();
            }

            case 'individual':
                // Individual mode - return origin (actual pivot handled per-object)
                return new THREE.Vector3();

            case 'boundingBox': {
                // Bounding box center
                const box = new THREE.Box3();
                selectedIds.forEach(id => {
                    const mesh = sceneManager.getMesh(id);
                    if (mesh) {
                        box.expandByObject(mesh);
                    }
                });
                return box.getCenter(new THREE.Vector3());
            }

            case 'median':
            default: {
                // Center of selected objects
                const center = new THREE.Vector3();
                selectedIds.forEach(id => {
                    const mesh = sceneManager.getMesh(id);
                    if (mesh) {
                        center.add(mesh.position);
                    }
                });
                return center.divideScalar(selectedIds.length);
            }
        }
    }

    /**
     * Get mode display name
     */
    getModeDisplayName(): string {
        const names: Record<PivotMode, string> = {
            median: 'Median Point',
            active: 'Active Element',
            cursor: '3D Cursor',
            individual: 'Individual Origins',
            boundingBox: 'Bounding Box Center',
        };
        return names[this.mode];
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        this.cursor3D.dispose();
    }
}

// Singleton
let pivotControllerInstance: PivotController | null = null;

export function getPivotController(): PivotController {
    if (!pivotControllerInstance) {
        pivotControllerInstance = new PivotController();
    }
    return pivotControllerInstance;
}

// Export for resetting in tests
export function resetPivotController(): void {
    if (pivotControllerInstance) {
        pivotControllerInstance.dispose();
        pivotControllerInstance = null;
    }
}
