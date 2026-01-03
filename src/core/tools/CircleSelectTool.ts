import * as THREE from 'three';
import { getSceneManager } from '@/core/scene/SceneManager';
import { selectionActions } from '@/stores/selectionStore';

/**
 * CircleSelectTool - Paint selection with adjustable radius
 */
export class CircleSelectTool {
    private isActive = false;
    private isPainting = false;
    private radius = 50; // pixels
    private minRadius = 10;
    private maxRadius = 200;

    // Circle cursor overlay
    private overlayElement: HTMLDivElement | null = null;
    private containerElement: HTMLElement | null = null;

    // Raycaster for point selection
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();

    // Track already selected this paint session
    private paintedIds: Set<string> = new Set();

    constructor() { }

    /**
     * Initialize the circle select tool
     */
    init(container: HTMLElement): void {
        this.containerElement = container;

        // Create circle cursor overlay
        this.overlayElement = document.createElement('div');
        this.overlayElement.className = 'circle-select-overlay';
        this.overlayElement.style.cssText = `
      position: absolute;
      border: 2px solid #00aaff;
      background: rgba(0, 170, 255, 0.1);
      border-radius: 50%;
      pointer-events: none;
      display: none;
      z-index: 100;
      transform: translate(-50%, -50%);
    `;
        this.updateOverlaySize();
        container.appendChild(this.overlayElement);
    }

    /**
     * Activate circle select mode
     */
    activate(): void {
        this.isActive = true;
        this.paintedIds.clear();
        if (this.containerElement) {
            this.containerElement.style.cursor = 'none';
        }
        this.showOverlay();
    }

    /**
     * Deactivate circle select mode
     */
    deactivate(): void {
        this.isActive = false;
        this.isPainting = false;
        this.paintedIds.clear();
        if (this.containerElement) {
            this.containerElement.style.cursor = 'default';
        }
        this.hideOverlay();
    }

    /**
     * Check if circle select is active
     */
    isCircleSelectActive(): boolean {
        return this.isActive;
    }

    /**
     * Adjust radius with scroll
     */
    adjustRadius(delta: number): void {
        this.radius = Math.max(this.minRadius, Math.min(this.maxRadius, this.radius + delta));
        this.updateOverlaySize();
    }

    /**
     * Handle mouse down - start painting selection
     */
    onMouseDown(event: MouseEvent): boolean {
        if (!this.isActive) return false;

        // Right-click to deselect mode
        if (event.button === 2) {
            this.isPainting = true;
            this.selectAtPoint(event, true); // Remove mode
            return true;
        }

        // Left-click to add
        if (event.button === 0) {
            this.isPainting = true;
            this.selectAtPoint(event, false); // Add mode
            return true;
        }

        return false;
    }

    /**
     * Handle mouse move - continue painting
     */
    onMouseMove(event: MouseEvent): boolean {
        if (!this.isActive) return false;

        // Update cursor position
        this.updateOverlayPosition(event);

        if (this.isPainting) {
            this.selectAtPoint(event, event.buttons === 2);
        }

        return true;
    }

    /**
     * Handle mouse up - stop painting
     */
    onMouseUp(_event: MouseEvent): boolean {
        if (!this.isActive) return false;

        this.isPainting = false;
        this.paintedIds.clear();

        return true;
    }

    /**
     * Handle scroll - adjust radius
     */
    onWheel(event: WheelEvent): boolean {
        if (!this.isActive) return false;

        event.preventDefault();
        const delta = event.deltaY > 0 ? -5 : 5;
        this.adjustRadius(delta);

        return true;
    }

    /**
     * Handle escape - exit circle select
     */
    onEscape(): boolean {
        if (!this.isActive) return false;

        this.deactivate();
        return true;
    }

    /**
     * Update overlay position to follow cursor
     */
    private updateOverlayPosition(event: MouseEvent): void {
        if (!this.overlayElement || !this.containerElement) return;

        const rect = this.containerElement.getBoundingClientRect();
        this.overlayElement.style.left = `${event.clientX - rect.left}px`;
        this.overlayElement.style.top = `${event.clientY - rect.top}px`;
    }

    /**
     * Update overlay size
     */
    private updateOverlaySize(): void {
        if (!this.overlayElement) return;

        this.overlayElement.style.width = `${this.radius * 2}px`;
        this.overlayElement.style.height = `${this.radius * 2}px`;
    }

    /**
     * Show overlay
     */
    private showOverlay(): void {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'block';
        }
    }

    /**
     * Hide overlay
     */
    private hideOverlay(): void {
        if (this.overlayElement) {
            this.overlayElement.style.display = 'none';
        }
    }

    /**
     * Select objects within circle radius at point
     */
    private selectAtPoint(event: MouseEvent, removeMode: boolean): void {
        const sceneManager = getSceneManager();
        const camera = sceneManager.camera;
        const meshes = sceneManager.getAllMeshes();

        if (!this.containerElement) return;

        const rect = this.containerElement.getBoundingClientRect();
        const centerX = event.clientX - rect.left;
        const centerY = event.clientY - rect.top;

        // Check each mesh if its screen position is within circle
        meshes.forEach(mesh => {
            const cubeId = mesh.userData.cubeId;
            if (!cubeId) return;

            // Skip if already processed in this paint session
            if (this.paintedIds.has(cubeId)) return;

            // Get mesh center in screen space
            const meshCenter = new THREE.Vector3();
            mesh.getWorldPosition(meshCenter);

            const screenPos = meshCenter.clone().project(camera);
            const screenX = (screenPos.x + 1) / 2 * rect.width;
            const screenY = (-screenPos.y + 1) / 2 * rect.height;

            // Check if within circle radius
            const distance = Math.sqrt(
                Math.pow(screenX - centerX, 2) + Math.pow(screenY - centerY, 2)
            );

            if (distance <= this.radius) {
                this.paintedIds.add(cubeId);

                if (removeMode) {
                    selectionActions.removeFromSelection(cubeId);
                } else {
                    selectionActions.addToSelection(cubeId);
                }
            }
        });
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
let circleSelectToolInstance: CircleSelectTool | null = null;

export function getCircleSelectTool(): CircleSelectTool {
    if (!circleSelectToolInstance) {
        circleSelectToolInstance = new CircleSelectTool();
    }
    return circleSelectToolInstance;
}
