import * as THREE from 'three';
import type { ISceneManager } from '@/core/interfaces';
import { getHierarchyManager } from '@/core/scene/HierarchyManager';
import { selectionActions } from '@/stores/selectionStore';
import { sceneActions, sceneStore } from '@/stores/sceneStore';
import { uiStore } from '@/stores/uiStore';
import { eventBus } from '@/core/events';

/**
 * SelectionManager - Handles cube selection via raycasting
 */
export class SelectionManager {
    private raycaster: THREE.Raycaster;
    private mouse: THREE.Vector2;

    // Selection visual
    private selectionOutlines: Map<string, THREE.LineSegments> = new Map();
    private isVisible: boolean = true;

    constructor(
        private sceneManager: ISceneManager,
        private hierarchyManager: ReturnType<typeof getHierarchyManager>
    ) {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.setupEventListeners();
    }

    /**
     * Setup event listeners for external selection changes (e.g., from UI)
     */
    private setupEventListeners(): void {
        eventBus.on('selection:changed', () => {
            this.updateSelectionVisuals();
            this.attachTransformToSelection();
        });
    }

    /**
     * Update mouse position from event
     */
    private updateMousePosition(event: MouseEvent, canvas: HTMLCanvasElement): void {
        const rect = canvas.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    }

    /**
     * Raycast to find intersected cube
     */
    raycast(event: MouseEvent): string | null {
        const canvas = this.sceneManager.getCanvas();

        this.updateMousePosition(event, canvas);
        this.raycaster.setFromCamera(this.mouse, this.sceneManager.camera);

        // Get all selectable meshes
        const meshes = this.sceneManager.getAllMeshes();
        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            const cubeId = intersects[0].object.userData.cubeId;
            if (cubeId) {
                const cube = sceneStore.cubes[cubeId];
                if (cube && !cube.locked) {
                    return cubeId;
                }
            }
        }

        return null;
    }

    /**
     * Handle click selection
     */
    handleClick(event: MouseEvent): void {
        const previousIds = selectionActions.getSelectedIds();
        const cubeId = this.raycast(event);

        if (cubeId) {
            if (event.shiftKey) {
                // Add to selection
                selectionActions.toggleSelection(cubeId);
            } else {
                // Replace selection
                selectionActions.select(cubeId);
            }

            // Attach transform controls
            this.attachTransformToSelection();
        } else {
            // Clicked on empty space
            if (!event.shiftKey) {
                selectionActions.clearSelection();
                this.sceneManager.detachTransformControls();

                // Emit cleared event
                if (previousIds.length > 0) {
                    eventBus.emit('selection:cleared', {});
                }
            }
        }

        // Emit selection changed event
        const newIds = selectionActions.getSelectedIds();
        if (JSON.stringify(previousIds) !== JSON.stringify(newIds)) {
            eventBus.emit('selection:changed', {
                selectedIds: newIds,
                previousIds: previousIds,
            });
        }

        // Update selection visuals
        this.updateSelectionVisuals();
    }

    /**
     * Handle mouse move for hover effect
     */
    handleMouseMove(event: MouseEvent): void {
        const cubeId = this.raycast(event);
        selectionActions.setHovered(cubeId);

        // Emit hover event
        eventBus.emit('selection:hovered', { cubeId });

        // Update cursor
        const canvas = this.sceneManager.getCanvas();
        canvas.style.cursor = cubeId ? 'pointer' : 'default';
    }

    /**
     * Select all cubes
     */
    selectAll(): void {
        const previousIds = selectionActions.getSelectedIds();
        const cubes = sceneActions.getAllCubes();
        const newIds = cubes.map(c => c.id);

        selectionActions.selectAll(newIds);

        // Emit event
        eventBus.emit('selection:changed', {
            selectedIds: newIds,
            previousIds: previousIds,
        });

        this.updateSelectionVisuals();
    }

    /**
     * Clear selection
     */
    clearSelection(): void {
        const previousIds = selectionActions.getSelectedIds();

        selectionActions.clearSelection();
        this.sceneManager.detachTransformControls();

        // Emit events
        if (previousIds.length > 0) {
            eventBus.emit('selection:cleared', {});
            eventBus.emit('selection:changed', {
                selectedIds: [],
                previousIds: previousIds,
            });
        }

        this.updateSelectionVisuals();
    }

    /**
     * Attach transform controls to first selected item
     */
    private attachTransformToSelection(): void {
        const selectedIds = selectionActions.getSelectedIds();
        if (selectedIds.length === 0) return;

        this.sceneManager.attachTransformControls(selectedIds[0]);
    }

    /**
     * Update selection visual outlines
     * In Object Mode: Shows outlines for selected cubes AND their descendants
     * In Edit Mode: Shows outlines ONLY for directly selected cubes
     */
    /**
     * Set outlines visibility
     */
    setOutlinesVisible(visible: boolean): void {
        this.isVisible = visible;
        this.updateSelectionVisuals();
    }

    /**
     * Update selection visual outlines
     * In Object Mode: Shows outlines for selected cubes AND their descendants
     * In Edit Mode: Shows outlines ONLY for directly selected cubes
     */
    private updateSelectionVisuals(): void {
        const directlySelectedIds = new Set(selectionActions.getSelectedIds());

        // Check interaction mode
        const isEditMode = uiStore.interactionMode === 'edit';

        // Build the full set of IDs that should have outlines
        let outlineIds = new Set<string>();

        // Only populate if visible
        if (this.isVisible) {
            outlineIds = new Set<string>(directlySelectedIds);
            if (!isEditMode) {
                // Object Mode: Include all descendants of selected cubes
                for (const cubeId of directlySelectedIds) {
                    const descendants = this.getDescendants(cubeId);
                    descendants.forEach(id => outlineIds.add(id));
                }
            }
        }

        // Remove outlines for cubes that should no longer have them
        for (const [cubeId, outline] of this.selectionOutlines) {
            if (!outlineIds.has(cubeId)) {
                this.sceneManager.scene.remove(outline);
                outline.geometry.dispose();
                this.selectionOutlines.delete(cubeId);
            }
        }

        // Add/update outlines for all cubes that should have them
        for (const cubeId of outlineIds) {
            const mesh = this.sceneManager.getMesh(cubeId);
            if (!mesh) continue;

            if (!this.selectionOutlines.has(cubeId)) {
                // Create new outline
                const outline = this.createOutline(mesh);
                this.sceneManager.scene.add(outline);
                this.selectionOutlines.set(cubeId, outline);
            } else {
                // Update existing outline with world coordinates
                const outline = this.selectionOutlines.get(cubeId)!;
                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();

                mesh.getWorldPosition(worldPos);
                mesh.getWorldQuaternion(worldQuat);
                mesh.getWorldScale(worldScale);

                outline.position.copy(worldPos);
                outline.quaternion.copy(worldQuat);
                outline.scale.copy(worldScale).multiplyScalar(1.01);
            }
        }
    }

    /**
     * Get all descendants of a cube (recursive)
     * @delegate HierarchyManager
     */
    private getDescendants(cubeId: string): string[] {
        return this.hierarchyManager.getDescendants(cubeId).map(c => c.id);
    }

    /**
     * Create selection outline for a mesh
     */
    private createOutline(mesh: THREE.Mesh): THREE.LineSegments {
        const edges = new THREE.EdgesGeometry(mesh.geometry);
        const lineMaterial = new THREE.LineBasicMaterial({
            color: 0x00aaff, // Bright blue
            linewidth: 2,
            depthTest: false, // Make visible through objects
            depthWrite: false,
        });

        const outline = new THREE.LineSegments(edges, lineMaterial);
        outline.renderOrder = 999; // Draw on top

        // Use WORLD coordinates (critical for child meshes)
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        const worldScale = new THREE.Vector3();

        mesh.getWorldPosition(worldPos);
        mesh.getWorldQuaternion(worldQuat);
        mesh.getWorldScale(worldScale);

        outline.position.copy(worldPos);
        outline.quaternion.copy(worldQuat);
        outline.scale.copy(worldScale).multiplyScalar(1.01); // Slightly larger

        return outline;
    }

    /**
     * Sync outline positions with meshes (call after transform)
     */
    syncOutlines(): void {
        for (const [cubeId, outline] of this.selectionOutlines) {
            const mesh = this.sceneManager.getMesh(cubeId);
            if (mesh) {
                // Use WORLD coordinates
                const worldPos = new THREE.Vector3();
                const worldQuat = new THREE.Quaternion();
                const worldScale = new THREE.Vector3();

                mesh.getWorldPosition(worldPos);
                mesh.getWorldQuaternion(worldQuat);
                mesh.getWorldScale(worldScale);

                outline.position.copy(worldPos);
                outline.quaternion.copy(worldQuat);
                outline.scale.copy(worldScale).multiplyScalar(1.01);
            }
        }
    }

    /**
     * Cleanup
     */
    dispose(): void {
        for (const [, outline] of this.selectionOutlines) {
            this.sceneManager.scene.remove(outline);
            outline.geometry.dispose();
            (outline.material as THREE.Material).dispose();
        }

        this.selectionOutlines.clear();
    }
}

// Singleton instance management
let selectionManagerInstance: SelectionManager | null = null;

export function setGlobalSelectionManager(instance: SelectionManager): void {
    selectionManagerInstance = instance;
}

export function getSelectionManager(): SelectionManager {
    if (!selectionManagerInstance) {
        throw new Error('SelectionManager has not been initialized. Ensure CoreContext is initialized.');
    }
    return selectionManagerInstance;
}
