import * as THREE from 'three';
import type { ISceneManager, ITransformService } from '@/core/interfaces';
import { sceneActions } from '@/stores/sceneStore';
import { historyActions } from '@/stores/historyStore';
import { uiStore } from '@/stores/uiStore';
import { generateUUID } from '@/utils';
import { getHierarchyManager } from '@/core/scene/HierarchyManager';
import { eventBus } from '@/core/events';

/**
 * TransformService - Handles all transform operations with undo/redo support
 * 
 * Extracted from CubeManager to follow Single Responsibility Principle.
 * Manages transform state tracking, mesh synchronization, and Edit Mode behavior.
 */
export class TransformService implements ITransformService {
    constructor(
        private sceneManager: ISceneManager,
        private hierarchyManager: ReturnType<typeof getHierarchyManager>,
        private meshFactory: ReturnType<typeof getMeshFactory>
    ) { }

    // State for tracking transforms during drag
    private transformStartState: Map<string, Transform> = new Map();

    // Store for children detached during Edit Mode transform
    private editModeDetachedChildren: Map<string, {
        childId: string;
        worldPos: THREE.Vector3;
        worldQuat: THREE.Quaternion;
        worldScale: THREE.Vector3;
    }[]> = new Map();

    /**
     * Start tracking a transform operation
     * In Edit Mode: Temporarily detach children to prevent them from moving
     */
    startTransform(cubeId: string): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        this.transformStartState.set(cubeId, {
            position: cube.transform.position.clone(),
            rotation: cube.transform.rotation.clone(),
            scale: cube.transform.scale.clone(),
        });

        // Emit event
        eventBus.emit('transform:started', { cubeId });

        // Edit Mode: Detach children to isolate parent transform
        if (uiStore.interactionMode === 'edit') {
            const children = this.hierarchyManager.getChildren(cubeId);
            const detachedInfo: typeof this.editModeDetachedChildren extends Map<string, infer T> ? T : never = [];

            for (const child of children) {
                const childMesh = this.sceneManager.getMesh(child.id);
                if (childMesh) {
                    // Store world transform
                    const worldPos = new THREE.Vector3();
                    const worldQuat = new THREE.Quaternion();
                    const worldScale = new THREE.Vector3();
                    childMesh.getWorldPosition(worldPos);
                    childMesh.getWorldQuaternion(worldQuat);
                    childMesh.getWorldScale(worldScale);

                    detachedInfo.push({ childId: child.id, worldPos, worldQuat, worldScale });

                    // Detach to scene root (preserves world position via attach)
                    this.sceneManager.scene.attach(childMesh);
                }
            }

            this.editModeDetachedChildren.set(cubeId, detachedInfo);
        }
    }

    /**
     * End transform operation and record undo command
     * In Edit Mode: Reattach previously detached children to their parent
     */
    endTransform(cubeId: string): void {
        // Edit Mode: Reattach children after transform
        const detachedChildren = this.editModeDetachedChildren.get(cubeId);
        if (detachedChildren && detachedChildren.length > 0) {
            const parentMesh = this.sceneManager.getMesh(cubeId);

            for (const info of detachedChildren) {
                const childMesh = this.sceneManager.getMesh(info.childId);
                if (childMesh && parentMesh) {
                    // Reattach to parent (preserves world position)
                    parentMesh.attach(childMesh);
                }
            }

            this.editModeDetachedChildren.delete(cubeId);
        }

        const startState = this.transformStartState.get(cubeId);
        if (!startState) return;

        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        const endState = {
            position: cube.transform.position.clone(),
            rotation: cube.transform.rotation.clone(),
            scale: cube.transform.scale.clone(),
        };

        // Emit event
        eventBus.emit('transform:ended', { cubeId });

        // Check if anything actually changed
        if (startState.position.equals(endState.position) &&
            startState.rotation.equals(endState.rotation) &&
            startState.scale.equals(endState.scale)) {
            this.transformStartState.delete(cubeId);
            return;
        }

        // Record command
        historyActions.execute({
            id: generateUUID(),
            description: `Transform ${cube.name}`,
            execute: () => {
                this.updateTransform(cubeId, endState);
            },
            undo: () => {
                this.updateTransform(cubeId, startState);
            },
            timestamp: Date.now(),
        });

        this.transformStartState.delete(cubeId);
    }

    /**
     * Update cube transform and sync with Three.js
     */
    updateTransform(cubeId: string, transform: Partial<Transform>): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        // Update store
        sceneActions.updateCubeTransform(cubeId, transform);

        // Sync with Three.js mesh
        const mesh = this.sceneManager.getMesh(cubeId);
        if (mesh) {
            this.meshFactory.updateMeshTransform(mesh, transform);
        }

        // Emit event
        eventBus.emit('cube:transformed', { cubeId, transform });
    }

    /**
     * Sync mesh transform from Three.js back to store
     * (Called after gizmo manipulation)
     */
    syncMeshToStore(cubeId: string): void {
        const mesh = this.sceneManager.getMesh(cubeId);
        if (!mesh) return;

        sceneActions.updateCubeTransform(cubeId, {
            position: mesh.position.clone(),
            rotation: mesh.rotation.clone(),
            scale: mesh.scale.clone(),
        });
    }

    /**
     * Update transform with undo support
     * For committing changes from UI inputs
     */
    updateTransformWithUndo(
        cubeId: string,
        transform: Partial<Transform>,
        previousTransform: Partial<Transform>,
        description: string
    ): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        // Apply the transform
        this.updateTransform(cubeId, transform);

        // Record undo
        historyActions.execute({
            id: generateUUID(),
            description,
            execute: () => {
                this.updateTransform(cubeId, transform);
            },
            undo: () => {
                this.updateTransform(cubeId, previousTransform);
            },
            timestamp: Date.now(),
        });
    }
}

// Singleton instance management
let transformServiceInstance: TransformService | null = null;

export function setGlobalTransformService(instance: TransformService): void {
    transformServiceInstance = instance;
}

export function getTransformService(): TransformService {
    if (!transformServiceInstance) {
        throw new Error('TransformService has not been initialized. Ensure CoreContext is initialized.');
    }
    return transformServiceInstance;
}

// Export for resetting in tests
export function resetTransformService(): void {
    transformServiceInstance = null;
}
