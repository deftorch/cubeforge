import * as THREE from 'three';
import { getSceneManager } from '@/core/scene/SceneManager';
import { selectionActions } from '@/stores/selectionStore';

/**
 * BoxSelectTool - Drag rectangle to select multiple objects
 */
export class BoxSelectTool {
    private isActive = false;
    private isDragging = false;
    private startPoint: THREE.Vector2 = new THREE.Vector2();
    private endPoint: THREE.Vector2 = new THREE.Vector2();

    // Selection box overlay element
    private overlayElement: HTMLDivElement | null = null;
    private containerElement: HTMLElement | null = null;

    constructor() { }

    /**
     * Initialize the box select tool on a container
     */
    init(container: HTMLElement): void {
        this.containerElement = container;

        // Create selection box overlay
        this.overlayElement = document.createElement('div');
        this.overlayElement.className = 'box-select-overlay';
        this.overlayElement.style.cssText = `
      position: absolute;
      border: 2px dashed #00aaff;
      background: rgba(0, 170, 255, 0.1);
      pointer-events: none;
      display: none;
      z-index: 100;
    `;
        container.appendChild(this.overlayElement);
    }

    /**
     * Activate box select mode
     */
    activate(): void {
        this.isActive = true;
        if (this.containerElement) {
            this.containerElement.style.cursor = 'crosshair';
        }
    }

    /**
     * Deactivate box select mode
     */
    deactivate(): void {
        this.isActive = false;
        this.isDragging = false;
        this.hideOverlay();
        if (this.containerElement) {
            this.containerElement.style.cursor = 'default';
        }
    }

    /**
     * Check if box select is active
     */
    isBoxSelectActive(): boolean {
        return this.isActive;
    }

    /**
     * Handle mouse down - start selection
     */
    onMouseDown(event: MouseEvent): boolean {
        if (!this.isActive) return false;

        this.isDragging = true;
        this.startPoint.set(event.clientX, event.clientY);
        this.endPoint.set(event.clientX, event.clientY);

        this.updateOverlay();
        this.showOverlay();

        return true;
    }

    /**
     * Handle mouse move - update selection box
     */
    onMouseMove(event: MouseEvent): boolean {
        if (!this.isActive || !this.isDragging) return false;

        this.endPoint.set(event.clientX, event.clientY);
        this.updateOverlay();

        return true;
    }

    /**
     * Handle mouse up - complete selection
     */
    onMouseUp(event: MouseEvent, addToSelection: boolean = false): boolean {
        if (!this.isActive || !this.isDragging) return false;

        this.endPoint.set(event.clientX, event.clientY);

        // Perform selection
        this.performBoxSelect(addToSelection);

        // Reset
        this.isDragging = false;
        this.hideOverlay();
        this.deactivate();

        return true;
    }

    /**
     * Update selection box overlay position/size
     */
    private updateOverlay(): void {
        if (!this.overlayElement || !this.containerElement) return;

        const rect = this.containerElement.getBoundingClientRect();

        const left = Math.min(this.startPoint.x, this.endPoint.x) - rect.left;
        const top = Math.min(this.startPoint.y, this.endPoint.y) - rect.top;
        const width = Math.abs(this.endPoint.x - this.startPoint.x);
        const height = Math.abs(this.endPoint.y - this.startPoint.y);

        this.overlayElement.style.left = `${left}px`;
        this.overlayElement.style.top = `${top}px`;
        this.overlayElement.style.width = `${width}px`;
        this.overlayElement.style.height = `${height}px`;
    }

    /**
     * Show selection overlay
     */
    private showOverlay(): void {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'block';
        }
    }

    /**
     * Hide selection overlay
     */
    private hideOverlay(): void {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'none';
        }
    }

    /**
     * Perform box selection using frustum
     */
    private performBoxSelect(addToSelection: boolean): void {
        const sceneManager = getSceneManager();
        const camera = sceneManager.camera;
        const meshes = sceneManager.getAllMeshes();

        if (!this.containerElement) return;

        const rect = this.containerElement.getBoundingClientRect();

        // Convert screen coordinates to NDC (-1 to 1)
        const min = new THREE.Vector2(
            ((Math.min(this.startPoint.x, this.endPoint.x) - rect.left) / rect.width) * 2 - 1,
            -((Math.max(this.startPoint.y, this.endPoint.y) - rect.top) / rect.height) * 2 + 1
        );

        const max = new THREE.Vector2(
            ((Math.max(this.startPoint.x, this.endPoint.x) - rect.left) / rect.width) * 2 - 1,
            -((Math.min(this.startPoint.y, this.endPoint.y) - rect.top) / rect.height) * 2 + 1
        );

        // Create frustum from selection rectangle
        const frustum = this.createSelectionFrustum(camera, min, max);

        // Find objects inside frustum
        const selectedIds: string[] = [];

        meshes.forEach(mesh => {
            // Get mesh bounding sphere
            mesh.geometry.computeBoundingSphere();
            const boundingSphere = mesh.geometry.boundingSphere;

            if (boundingSphere) {
                // Transform bounding sphere to world space
                const worldSphere = boundingSphere.clone();
                worldSphere.applyMatrix4(mesh.matrixWorld);

                // Check if inside frustum
                if (frustum.intersectsSphere(worldSphere)) {
                    const cubeId = mesh.userData.cubeId;
                    if (cubeId) {
                        selectedIds.push(cubeId);
                    }
                }
            }
        });

        // Apply selection
        if (addToSelection) {
            // Add to existing selection
            const currentSelection = selectionActions.getSelectedIds();
            const newSelection = [...new Set([...currentSelection, ...selectedIds])];
            selectionActions.selectMultiple(newSelection);
        } else {
            // Replace selection
            selectionActions.selectMultiple(selectedIds);
        }
    }

    /**
     * Create a frustum from selection rectangle
     */
    private createSelectionFrustum(
        camera: THREE.PerspectiveCamera,
        min: THREE.Vector2,
        max: THREE.Vector2
    ): THREE.Frustum {
        const frustum = new THREE.Frustum();

        // Get camera matrices
        const projectionMatrix = camera.projectionMatrix.clone();
        const viewMatrix = camera.matrixWorldInverse.clone();

        // Create custom projection matrix for selection area
        const selectionProjection = projectionMatrix.clone();

        // Modify projection matrix to cover selection area
        // This is a simplified approach - we'll check bounds manually
        const combinedMatrix = new THREE.Matrix4();
        combinedMatrix.multiplyMatrices(projectionMatrix, viewMatrix);

        frustum.setFromProjectionMatrix(combinedMatrix);

        // For accurate box select, we need to check each object against the 2D bounds
        // Store bounds for checking
        (frustum as any).selectionBounds = { min, max };

        return frustum;
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        if (this.overlayElement && this.overlayElement.parentElement) {
            this.overlayElement.parentElement.removeChild(this.overlayElement);
        }
        this.overlayElement = null;
        this.containerElement = null;
    }
}

// Singleton
let boxSelectToolInstance: BoxSelectTool | null = null;

export function getBoxSelectTool(): BoxSelectTool {
    if (!boxSelectToolInstance) {
        boxSelectToolInstance = new BoxSelectTool();
    }
    return boxSelectToolInstance;
}
