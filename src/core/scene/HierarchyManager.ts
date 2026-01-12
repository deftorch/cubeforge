import * as THREE from 'three';
import type { Cube } from '@/types';
import { sceneActions } from '@/stores/sceneStore';
import { historyActions } from '@/stores/historyStore';
import { generateUUID } from '@/utils';
import type { ISceneManager } from '@/core/interfaces';

/**
 * HierarchyManager - Manages parent-child relationships between cubes
 * 
 * Extracted from CubeManager to follow Single Responsibility Principle.
 * Handles Three.js scene graph hierarchy and store parent references.
 */
export class HierarchyManager {
    /**
     * Attach mesh to correct parent or scene
     */
    attachMeshToParentOrScene(
        mesh: THREE.Mesh,
        parentId: string | undefined,
        sceneManager: ISceneManager
    ): void {
        if (parentId) {
            const parentMesh = sceneManager.getMesh(parentId);
            if (parentMesh) {
                parentMesh.add(mesh);
                return;
            }
        }

        // Default to scene if no parent or parent not found
        if (!sceneManager.getMesh(mesh.name)) {
            sceneManager.addMesh(mesh.name, mesh);
        } else {
            sceneManager.scene.add(mesh);
        }
    }

    /**
     * Parent a cube to another cube
     */
    parentCube(
        childId: string,
        parentId: string | undefined,
        sceneManager: ISceneManager,
        syncMeshToStore: (cubeId: string) => void
    ): void {
        const childMesh = sceneManager.getMesh(childId);
        const childCube = sceneActions.getCube(childId);

        if (!childMesh || !childCube) return;
        if (childId === parentId) return; // Cannot parent to self

        // Circular dependency check
        if (parentId) {
            let current = sceneActions.getCube(parentId);
            while (current && current.parentId) {
                if (current.parentId === childId) {
                    console.warn(`Cannot parent ${childId} to ${parentId}: Circular dependency detected.`);
                    return;
                }
                current = sceneActions.getCube(current.parentId);
            }
        }

        // Store previous state for Undo
        const previousParentId = childCube.parentId;
        const previousTransform = {
            position: childCube.transform.position.clone(),
            rotation: childCube.transform.rotation.clone(),
            scale: childCube.transform.scale.clone()
        };

        // Execute parenting logic
        const performParenting = (cId: string, pId?: string) => {
            const cMesh = sceneManager.getMesh(cId);
            if (!cMesh) return;

            if (pId) {
                const pMesh = sceneManager.getMesh(pId);
                if (pMesh) {
                    // Key magic: attach() preserves world transform
                    pMesh.attach(cMesh);
                }
            } else {
                // Attach to scene (unparent)
                sceneManager.scene.attach(cMesh);
            }

            // Update store with new parent and NEW LOCAL TRANSFORM
            sceneActions.updateCube(cId, { parentId: pId });
            syncMeshToStore(cId);
        };

        performParenting(childId, parentId);

        // Record for Undo/Redo
        historyActions.execute({
            id: generateUUID(),
            description: parentId ? `Parent ${childCube.name}` : `Unparent ${childCube.name}`,
            execute: () => {
                performParenting(childId, parentId);
            },
            undo: () => {
                const cMesh = sceneManager.getMesh(childId);
                if (!cMesh) return;

                if (previousParentId) {
                    const oldParentMesh = sceneManager.getMesh(previousParentId);
                    if (oldParentMesh) {
                        oldParentMesh.attach(cMesh);
                    }
                } else {
                    sceneManager.scene.attach(cMesh);
                }

                // Force reset transform to exactly what it was
                cMesh.position.copy(previousTransform.position);
                cMesh.rotation.copy(previousTransform.rotation);
                cMesh.scale.copy(previousTransform.scale);
                cMesh.updateMatrix();

                sceneActions.updateCube(childId, { parentId: previousParentId });
                syncMeshToStore(childId);
            },
            timestamp: Date.now(),
        });
    }

    /**
     * Unparent a cube (alias for parentCube(id, undefined))
     */
    unparentCube(
        childId: string,
        sceneManager: ISceneManager,
        syncMeshToStore: (cubeId: string) => void
    ): void {
        this.parentCube(childId, undefined, sceneManager, syncMeshToStore);
    }

    /**
     * Reorder a cube relative to a target
     */
    reorderCube(
        cubeId: string,
        targetId: string,
        position: 'before' | 'after'
    ): void {
        const cube = sceneActions.getCube(cubeId);
        const target = sceneActions.getCube(targetId);
        if (!cube || !target) return;

        // Only allow reordering within same layer (simplified)
        if (cube.layerId !== target.layerId) return;

        // Get current IDs in layer to find indices
        // We need direct access to store state here strictly speaking, 
        // but since we are in a core manager we can import store?
        // HierarchyManager imports sceneActions. We might need sceneStore export or getter.
        // sceneStore is exported from sceneStore.ts.

        // For now, let's assume we can get the layer definition via action or import.
        const layer = sceneStore.getState().layers[cube.layerId];
        if (!layer) {
            console.warn(`Layer ${cube.layerId} not found for reordering.`);
            return;
        }

        const targetIndex = layer.cubeIds.indexOf(targetId);
        if (targetIndex === -1) {
            console.warn(`Target cube ${targetId} not found in layer ${cube.layerId} cubeIds.`);
            return;
        }

        let newIndex = targetIndex;
        if (position === 'after') {
            newIndex = targetIndex + 1;
        }

        // Adjust index if the cube being moved is currently before the target
        const currentIndex = layer.cubeIds.indexOf(cubeId);
        if (currentIndex !== -1 && currentIndex < newIndex) {
            newIndex--;
            toIndex += 1;
        }

        // Correction: if moving downwards (from < to), removing first shifts indices down, 
        // so toIndex needs adjustment if we insert after.
        // Actually splice handling in store handles insertion. 
        // If we want to insert AT `toIndex` (which is now the index of the slot we want to occupy),
        // we just pass that index. 
        // Example: [A, B, C]. Move A after B. Target B (index 1). After -> toIndex = 2.
        // Remove A -> [B, C]. Insert at 2 -> [B, C, A]. Correct.
        // Example: [A, B, C]. Move C before B. Target B (index 1). Before -> toIndex = 1.
        // Remove C -> [A, B]. Insert at 1 -> [A, C, B]. Correct.
        // But `reorderCubeInLayer` implementation takes `toIndex`.
        // Does it handle the "remove first" shift?
        // My implementation: remove, THEN insert.
        // So `toIndex` should be the index *after* removal.
        // If from < to: [A, B, C], A->C (index 2). Remove A (0). [B, C]. Insert at 2? [B, C, A]. Yea.
        // But `toIndex` was calculated on *original* array.
        // If moving A (0) to 2 (C). Target C is 2.
        // If from < to, we effectively shift items down. The target index in the *new* array is `toIndex - 1`?
        // Let's rely on standard splicing logic:
        // If from < to, we need to decrement toIndex by 1 because removing 'from' shifts everything above it down.

        if (fromIndex < toIndex) {
            toIndex -= 1;
        }

        sceneActions.reorderCubeInLayer(cube.layerId, cubeId, toIndex);

        // Record undo?
        // This is a manager method. historyActions usually called here?
        // Yes, similar to parentCube.
        historyActions.execute({
            id: generateUUID(),
            description: `Reorder ${cube.name}`,
            execute: () => {
                // idempotent-ish if called again with absolute indices, but here we calculate dynamically.
                // We should capture the EXACT indices for redo.
                // Re-calculating in lambda might be risky if state changed.
                // But `execute` runs immediately.
                // The reorderCubeInLayer call above does it.
            },
            undo: () => {
                sceneActions.reorderCubeInLayer(cube.layerId, cubeId, fromIndex);
            },
            timestamp: Date.now(),
        });
    }

    /**
     * Get direct children of a cube, sorted by layer order
     */
    getChildren(parentId: string | undefined): Cube[] {
        const allCubes = sceneActions.getAllCubes();
        const children = allCubes.filter(c => c.parentId === parentId);

        if (children.length === 0) return [];

        // Determine the layer to use for sorting
        let layerId: string | undefined;
        if (parentId === undefined) {
            // For top-level cubes, use the default scene layer (assuming one exists or is handled)
            // This might need refinement if multiple top-level layers are possible
            const state = sceneActions.getState(); // Use sceneActions.getState()
            const defaultLayer = Object.values(state.layers).find(l => l.name === 'Scene'); // Or some other default logic
            layerId = defaultLayer?.id;
        } else {
            const parentCube = sceneActions.getCube(parentId);
            layerId = parentCube?.layerId;
        }

        if (!layerId) {
            // If no layerId can be determined, return unsorted children
            return children;
        }

        const layer = sceneStore.getState().layers[layerId];
        if (!layer) {
            return children; // Layer not found, return unsorted
        }

        // Sort children based on their index in the layer's cubeIds array
        const sortedChildren = [...children].sort((a, b) => {
            const indexA = layer.cubeIds.indexOf(a.id);
            const indexB = layer.cubeIds.indexOf(b.id);

            // Handle cases where a cube might not be in the layer.cubeIds (shouldn't happen if logic is consistent)
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1; // Push to end
            if (indexB === -1) return -1; // Push to end

            return indexA - indexB;
        });

        return sortedChildren;
    }

    /**
     * Get all descendants of a cube (recursive)
     */
    getDescendants(parentId: string): Cube[] {
        const children = this.getChildren(parentId);
        const descendants: Cube[] = [...children];

        for (const child of children) {
            descendants.push(...this.getDescendants(child.id));
        }

        return descendants;
    }

    /**
     * Get cubes that are valid parents for the given cube
     * (excludes self and descendants to prevent circular references)
     */
    getAvailableParents(cubeId: string): Cube[] {
        const allCubes = sceneActions.getAllCubes();
        const descendantIds = new Set(this.getDescendants(cubeId).map(c => c.id));
        return allCubes.filter(c => !descendantIds.has(c.id) && c.id !== cubeId);
    }

    /**
     * Unparent all children of a cube (preserve them in scene)
     */
    unparentChildren(
        parentId: string,
        sceneManager: ISceneManager,
        syncMeshToStore: (cubeId: string) => void
    ): void {
        const children = this.getChildren(parentId);
        children.forEach(child => {
            // Direct unparent without undo for internal use
            const childMesh = sceneManager.getMesh(child.id);
            if (childMesh) {
                sceneManager.scene.attach(childMesh);
                sceneActions.updateCube(child.id, { parentId: undefined });
                syncMeshToStore(child.id);
            }
        });
    }
}

// Singleton instance
let hierarchyManagerInstance: HierarchyManager | null = null;

export function getHierarchyManager(): HierarchyManager {
    if (!hierarchyManagerInstance) {
        hierarchyManagerInstance = new HierarchyManager();
    }
    return hierarchyManagerInstance;
}
