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
     * Get direct children of a cube
     */
    getChildren(parentId: string): Cube[] {
        const allCubes = sceneActions.getAllCubes();
        return allCubes.filter(c => c.parentId === parentId);
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
