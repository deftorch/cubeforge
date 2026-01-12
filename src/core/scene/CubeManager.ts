import * as THREE from 'three';
import type { Cube, CubeMaterial, Transform } from '@/types';
import { createDefaultTransform, createDefaultMaterial } from '@/types';
import { sceneActions } from '@/stores/sceneStore';
import { historyActions } from '@/stores/historyStore';
import { selectionActions } from '@/stores/selectionStore';
import { generateUUID } from '@/utils';
import type { ISceneManager, ITransformService, IMaterialService, IEventBus } from '@/core/interfaces';
import { getSceneManager } from './SceneManager';
import { getHierarchyManager, HierarchyManager } from './HierarchyManager';
import { getMaterialService } from './MaterialService';
import { getTransformService } from '@/core/transform/TransformService';
import { eventBus } from '@/core/events';

/**
 * CubeManager - CRUD operations for cubes
 * 
 * Refactored to delegate:
 * - Transform operations → TransformService
 * - Material operations → MaterialService
 * - Mesh creation → MeshFactory
 * - Hierarchy → HierarchyManager
 * - Events → EventBus
 */
export class CubeManager {
    private cubeCounter = 0;

    constructor(
        private sceneManager: ISceneManager,
        private hierarchyManager: HierarchyManager,
        private transformService: ITransformService,
        private materialService: IMaterialService,
        private eventBus: IEventBus,
    ) { }

    // ============================================
    // CRUD OPERATIONS
    // ============================================

    /**
     * Create a new cube
     */
    createCube(options?: Partial<Cube>): Cube {
        this.cubeCounter++;

        const cube: Cube = {
            id: options?.id ?? generateUUID(),
            name: options?.name ?? `Cube ${this.cubeCounter}`,
            transform: options?.transform ?? createDefaultTransform(),
            material: options?.material ?? createDefaultMaterial(),
            layerId: options?.layerId ?? 'default-layer',
            parentId: options?.parentId,
            visible: options?.visible ?? true,
            locked: options?.locked ?? false,
            metadata: options?.metadata,
        };

        // Add to store
        sceneActions.addCube(cube);

        // Create Three.js mesh logic moved to SceneSynchronizer
        // via 'cube:created' event

        // Emit event for other modules
        this.eventBus.emit('cube:created', { cube });

        return cube;
    }

    /**
     * Create cube with undo support
     */
    createCubeWithUndo(options?: Partial<Cube>): Cube {
        const cube = this.createCube(options);

        // Record command for undo
        historyActions.execute({
            id: generateUUID(),
            description: `Create ${cube.name}`,
            execute: () => { }, // Already executed
            undo: () => {
                this.deleteCubeInternal(cube.id);
                // Ensure visual sync
                this.eventBus.emit('cube:deleted', { cubeIds: [cube.id] });
            },
            timestamp: Date.now(),
        });

        return cube;
    }

    /**
     * Delete a cube (internal, no undo)
     */
    private deleteCubeInternal(cubeId: string): void {
        // Unparent children first (preserve them in scene)
        const children = this.hierarchyManager.getChildren(cubeId);

        children.forEach(child => {
            const childMesh = this.sceneManager.getMesh(child.id);
            if (childMesh) {
                this.sceneManager.scene.attach(childMesh);
                sceneActions.updateCube(child.id, { parentId: undefined });
                this.transformService.syncMeshToStore(child.id);
            }
        });

        // Remove from store
        sceneActions.removeCube(cubeId);
    }

    /**
     * Delete a cube with undo support
     */
    deleteCube(cubeId: string): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        // Store cube data for undo
        const cubeData: Cube = {
            ...cube,
            transform: {
                position: cube.transform.position.clone(),
                rotation: cube.transform.rotation.clone(),
                scale: cube.transform.scale.clone(),
            },
            material: { ...cube.material },
        };

        // Delete cube
        this.deleteCubeInternal(cubeId);

        // Emit event
        this.eventBus.emit('cube:deleted', { cubeIds: [cubeId] });

        // Record command for undo
        historyActions.execute({
            id: generateUUID(),
            description: `Delete ${cubeData.name}`,
            execute: () => { }, // Already executed
            undo: () => {
                sceneActions.addCube(cubeData);
                // Ensure visual sync
                this.eventBus.emit('cube:created', { cube: cubeData });
            },
            timestamp: Date.now(),
        });
    }

    /**
     * Delete multiple cubes
     */
    deleteCubes(cubeIds: string[]): void {
        if (cubeIds.length === 0) return;

        // Store all cube data for undo
        const cubesData: Cube[] = cubeIds
            .map(id => sceneActions.getCube(id))
            .filter((cube): cube is Cube => cube !== undefined)
            .map(cube => ({
                ...cube,
                transform: {
                    position: cube.transform.position.clone(),
                    rotation: cube.transform.rotation.clone(),
                    scale: cube.transform.scale.clone(),
                },
                material: { ...cube.material },
            }));

        // Delete all cubes
        cubeIds.forEach(id => this.deleteCubeInternal(id));

        // Emit event
        this.eventBus.emit('cube:deleted', { cubeIds });

        // Record command for undo
        historyActions.execute({
            id: generateUUID(),
            description: `Delete ${cubesData.length} cube(s)`,
            execute: () => { }, // Already executed
            undo: () => {
                cubesData.forEach(cube => {
                    sceneActions.addCube(cube);
                    // Ensure visual sync
                    this.eventBus.emit('cube:created', { cube });
                });
            },
            timestamp: Date.now(),
        });
    }

    /**
     * Duplicate a cube
     */
    duplicateCube(cubeId: string, offset?: THREE.Vector3): Cube | null {
        const original = sceneActions.getCube(cubeId);
        if (!original) return null;

        const newPosition = original.transform.position.clone();
        newPosition.add(offset ?? new THREE.Vector3(1, 0, 1));

        const duplicate = this.createCubeWithUndo({
            name: `${original.name} Copy`,
            transform: {
                position: newPosition,
                rotation: original.transform.rotation.clone(),
                scale: original.transform.scale.clone(),
            },
            material: { ...original.material },
            layerId: original.layerId,
            visible: original.visible,
            locked: false,
        });

        return duplicate;
    }

    /**
     * Duplicate multiple cubes
     */
    duplicateCubes(cubeIds: string[], offset?: THREE.Vector3): Cube[] {
        const duplicates: Cube[] = [];

        cubeIds.forEach(id => {
            const duplicate = this.duplicateCube(id, offset);
            if (duplicate) {
                duplicates.push(duplicate);
            }
        });

        return duplicates;
    }



    // ============================================
    // DELEGATED OPERATIONS - Transform
    // ============================================

    /**
     * Update cube transform and sync with Three.js
     * @delegate TransformService
     */
    updateTransform(cubeId: string, transform: Partial<Transform>): void {
        this.transformService.updateTransform(cubeId, transform);
    }

    /**
     * Sync mesh transform from Three.js back to store
     * @delegate TransformService
     */
    syncMeshToStore(cubeId: string): void {
        this.transformService.syncMeshToStore(cubeId);
    }

    /**
     * Start tracking a transform operation
     * @delegate TransformService
     */
    startTransform(cubeId: string): void {
        this.transformService.startTransform(cubeId);
    }

    /**
     * End transform operation and record undo command
     * @delegate TransformService
     */
    endTransform(cubeId: string): void {
        this.transformService.endTransform(cubeId);
    }

    // ============================================
    // DELEGATED OPERATIONS - Material
    // ============================================

    /**
     * Update cube material and sync with Three.js
     * @delegate MaterialService
     */
    updateMaterial(cubeId: string, material: Partial<CubeMaterial>): void {
        this.materialService.updateMaterial(cubeId, material);
    }

    /**
     * Update material with undo support
     * @delegate MaterialService
     */
    updateMaterialWithUndo(
        cubeId: string,
        material: Partial<CubeMaterial>,
        previousMaterial?: Partial<CubeMaterial>
    ): void {
        this.materialService.updateMaterialWithUndo(cubeId, material, previousMaterial);
    }

    // ============================================
    // CUBE PROPERTIES
    // ============================================

    /**
     * Set cube visibility
     */
    setVisible(cubeId: string, visible: boolean): void {
        sceneActions.updateCube(cubeId, { visible });

        // Visual update handled by SceneSynchronizer

        // If hiding, also deselect
        if (!visible) {
            if (selectionActions.isSelected(cubeId)) {
                selectionActions.removeFromSelection(cubeId);
                this.sceneManager.detachTransformControls();
            }
        }

        // Emit event
        this.eventBus.emit('cube:visibility-changed', { cubeId, visible });
    }

    /**
     * Set cube locked state
     */
    setLocked(cubeId: string, locked: boolean): void {
        sceneActions.updateCube(cubeId, { locked });

        // If locking, also deselect
        if (locked) {
            if (selectionActions.isSelected(cubeId)) {
                selectionActions.removeFromSelection(cubeId);
                this.sceneManager.detachTransformControls();
            }
        }

        // Emit event
        this.eventBus.emit('cube:locked-changed', { cubeId, locked });
    }

    /**
     * Update cube property with undo support
     */
    updateCubeWithUndo<K extends keyof Cube>(
        cubeId: string,
        changes: Partial<Pick<Cube, K>>,
        description: string,
        previousChanges?: Partial<Pick<Cube, K>>
    ): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube) return;

        // Capture previous state if not provided
        const previousState: Partial<Cube> = previousChanges || {};
        if (!previousChanges) {
            for (const key in changes) {
                (previousState as Record<string, unknown>)[key] = cube[key as keyof Cube];
            }
        }

        // Execute immediately (idempotent if already updated via live preview)
        sceneActions.updateCube(cubeId, changes);

        // Special handling for visibility/locking to sync with side effects
        if ('visible' in changes) this.setVisible(cubeId, changes.visible as boolean);
        if ('locked' in changes) this.setLocked(cubeId, changes.locked as boolean);
        if ('name' in changes) this.rename(cubeId, changes.name as string);

        // Emit event
        this.eventBus.emit('cube:updated', { cubeId, changes });

        // Record undo
        historyActions.execute({
            id: generateUUID(),
            description,
            execute: () => {
                sceneActions.updateCube(cubeId, changes);
                if ('visible' in changes) this.setVisible(cubeId, changes.visible as boolean);
                if ('locked' in changes) this.setLocked(cubeId, changes.locked as boolean);
                if ('name' in changes) this.rename(cubeId, changes.name as string);
            },
            undo: () => {
                sceneActions.updateCube(cubeId, previousState);
                if ('visible' in previousState) this.setVisible(cubeId, previousState.visible as boolean);
                if ('locked' in previousState) this.setLocked(cubeId, previousState.locked as boolean);
                if ('name' in previousState) this.rename(cubeId, previousState.name as string);

                // For other properties (transform, material), SceneSynchronizer might need convincing
                // But material changes usually go through MaterialService. 
                // Transform is handled by TransformService directly?
                // Let's ensure generic update event is fired for other props if needed
                this.eventBus.emit('cube:updated', { cubeId, changes: previousState });
            },
            timestamp: Date.now(),
        });
    }

    /**
     * Rename cube with undo
     */
    renameWithUndo(cubeId: string, name: string): void {
        const cube = sceneActions.getCube(cubeId);
        if (!cube || cube.name === name) return;

        this.updateCubeWithUndo(cubeId, { name }, `Rename to ${name}`);
    }

    /**
     * Rename cube
     */
    rename(cubeId: string, name: string): void {
        sceneActions.updateCube(cubeId, { name });
    }

    // ============================================
    // HIERARCHY
    // ============================================

    /**
     * Parent a cube to another cube
     * @delegate HierarchyManager
     */
    parentCube(childId: string, parentId?: string): void {
        this.hierarchyManager.parentCube(
            childId,
            parentId,
            this.sceneManager,
            this.transformService.syncMeshToStore.bind(this.transformService)
        );
    }

    /**
     * Unparent a cube
     */
    unparentCube(childId: string): void {
        this.parentCube(childId, undefined);
    }

    /**
     * Get children of a cube
     */
    getChildren(parentId: string): Cube[] {
        return this.hierarchyManager.getChildren(parentId);
    }
}

// Singleton instance
let cubeManagerInstance: CubeManager | null = null;

export function getCubeManager(): CubeManager {
    if (!cubeManagerInstance) {
        cubeManagerInstance = new CubeManager(
            getSceneManager(),
            getHierarchyManager(),
            getTransformService(),
            getMaterialService(),
            eventBus,
        );
    }
    return cubeManagerInstance;
}

// Export for resetting in tests
export function resetCubeManager(): void {
    cubeManagerInstance = null;
}
