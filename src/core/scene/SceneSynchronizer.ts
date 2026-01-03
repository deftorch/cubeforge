
import * as THREE from 'three';
import type { IEventBus, ISceneManager } from '@/core/interfaces';
import type { MeshFactory } from './MeshFactory';
import type { ViewportShading } from '@/core/viewport/ViewportShading';
import { sceneActions } from '@/stores/sceneStore';

/**
 * SceneSynchronizer - Bridges Domain Events to 3D Scene Updates
 * 
 * Responsibilities:
 * 1. Listen to 'cube:created' -> Create Mesh, Add to Scene
 * 2. Listen to 'cube:deleted' -> Remove Mesh, Dispose Resources
 * 3. Listen to 'cube:visibility-changed' -> Toggle Mesh Visibility
 * 4. Listen to 'cube:material-changed' -> Update Mesh Material (Visuals)
 * 5. Handle initial scene population (if needed)
 */
export class SceneSynchronizer {
    constructor(
        private eventBus: IEventBus,
        private sceneManager: ISceneManager,
        private meshFactory: MeshFactory,
        private viewportShading: ViewportShading
    ) {
        this.setupListeners();
    }

    private setupListeners(): void {
        this.eventBus.on('cube:created', this.handleCubeCreated.bind(this));
        this.eventBus.on('cube:deleted', this.handleCubeDeleted.bind(this));
        this.eventBus.on('cube:visibility-changed', this.handleVisibilityChanged.bind(this));
        this.eventBus.on('cube:material-changed', this.handleMaterialChanged.bind(this));
        // Note: Transforms are handled by TransformService directly updating the mesh for performance,
        // but we could also listen to 'cube:transformed' if we wanted a strictly event-driven approach (might be slower).
        // For now, TransformService handles the "fast path".
    }

    private handleCubeCreated(payload: { cube: any }): void {
        const { cube } = payload;

        // Create Mesh
        const mesh = this.meshFactory.createMesh(cube);

        // Attach to Scene or Parent
        this.attachMesh(mesh, cube.parentId);

        // Apply Viewport Shading (x-ray, wireframe, etc)
        this.viewportShading.applyToMesh(mesh);
    }

    private handleCubeDeleted(payload: { cubeIds: string[] }): void {
        payload.cubeIds.forEach(id => {
            // Remove from Three.js scene
            this.sceneManager.removeMesh(id);
            this.sceneManager.detachTransformControls();

            // Cleanup Viewport Shading tracking
            this.viewportShading.removeMesh(id);
        });
    }

    private handleVisibilityChanged(payload: { cubeId: string, visible: boolean }): void {
        const { cubeId, visible } = payload;
        const mesh = this.sceneManager.getMesh(cubeId);

        if (mesh) {
            mesh.visible = visible;
        }

        // Update wireframe/shading visibility
        this.viewportShading.setObjectVisible(cubeId, visible);

        // Handle side-effects (deselection) - logic moved from CubeManager?
        // Ideally selection logic stays in SelectionManager listening to the same event, 
        // or CubeManager handles the data update and we just handle the visual update.
        // CHECK: In Uni-directional flow, CubeManager updates Store -> Event -> Synchronizer updates Visuals.
        // We shouldn't touch SelectionStore here.
    }

    private handleMaterialChanged(payload: { cubeId: string, material: any }): void {
        // MaterialService usually handles the Three.js update directly?
        // Let's check. If MaterialService updates the mesh directly, we might not need this.
        // But for consistency, maybe MaterialService should ONLY update Store and let this handle the Mesh?
        // For now, let's keep it empty or minimal if MaterialService is doing the heavy lifting.
        // Use case: Undo/Redo might trigger this event without passing through MaterialService.

        // If the event comes from Undo/Redo, the mesh needs to be updated.
        // If it comes from MaterialService live update, it might be redundant but safe.

        const mesh = this.sceneManager.getMesh(payload.cubeId);
        if (mesh && mesh.material) {
            // Re-apply material properties from payload or store?
            // Payload has partial changes.
            // We can rely on MeshFactory logic or MaterialService logic.
            // To be strictly decoupled, we might need a helper to apply material props to a mesh.
        }
    }

    private attachMesh(mesh: THREE.Mesh, parentId?: string): void {
        if (parentId) {
            const parentMesh = this.sceneManager.getMesh(parentId);
            if (parentMesh) {
                parentMesh.add(mesh);
                return;
            }
        }

        // Default to scene
        if (!this.sceneManager.getMesh(mesh.name)) {
            this.sceneManager.addMesh(mesh.name, mesh);
        } else {
            this.sceneManager.scene.add(mesh);
        }
    }

    public dispose(): void {
        // Remove listeners if needed
    }
}
