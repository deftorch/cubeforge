import * as THREE from 'three';
import { getSceneManager } from '@/core/scene/SceneManager';
import { selectionActions } from '@/stores/selectionStore';
import type { GridPlane } from '@/core/viewport/InfiniteGrid';

export type ViewPreset =
    | 'front' | 'back'
    | 'right' | 'left'
    | 'top' | 'bottom'
    | 'camera' | 'user';

export type ProjectionType = 'perspective' | 'orthographic';

/**
 * ViewController - Camera view presets and navigation
 */
export class ViewController {
    private animationDuration = 300; // ms
    private currentPreset: ViewPreset = 'user';
    private projectionType: ProjectionType = 'perspective';
    private isAnimating = false;

    // Default view distance
    private viewDistance = 10;

    constructor() { }

    /**
     * Get current view preset
     */
    getCurrentPreset(): ViewPreset {
        return this.currentPreset;
    }

    /**
     * Get current projection type
     */
    getProjectionType(): ProjectionType {
        return this.projectionType;
    }

    /**
     * Set view to preset
     */
    setView(preset: ViewPreset, animate: boolean = true): void {
        const sceneManager = getSceneManager();

        // Calculate target based on current focus point
        const focusPoint = sceneManager.orbitControls.target.clone();

        let position: THREE.Vector3;

        switch (preset) {
            case 'front':
                position = focusPoint.clone().add(new THREE.Vector3(0, 0, this.viewDistance));
                break;
            case 'back':
                position = focusPoint.clone().add(new THREE.Vector3(0, 0, -this.viewDistance));
                break;
            case 'right':
                position = focusPoint.clone().add(new THREE.Vector3(this.viewDistance, 0, 0));
                break;
            case 'left':
                position = focusPoint.clone().add(new THREE.Vector3(-this.viewDistance, 0, 0));
                break;
            case 'top':
                position = focusPoint.clone().add(new THREE.Vector3(0, this.viewDistance, 0.001)); // Small offset to avoid gimbal lock
                break;
            case 'bottom':
                position = focusPoint.clone().add(new THREE.Vector3(0, -this.viewDistance, 0.001));
                break;
            case 'camera':
                // Reset to default camera position
                position = new THREE.Vector3(8, 6, 8);
                focusPoint.set(0, 0, 0);
                break;
            case 'user':
            default:
                return; // Don't change for user view
        }

        this.currentPreset = preset;

        // Update grid plane based on view preset
        this.updateGridPlane(preset);

        if (animate) {
            this.animateTo(position, focusPoint);
        } else {
            sceneManager.camera.position.copy(position);
            sceneManager.orbitControls.target.copy(focusPoint);
            sceneManager.orbitControls.update();
        }
    }

    /**
     * Update grid plane based on view preset
     */
    private updateGridPlane(preset: ViewPreset): void {
        const sceneManager = getSceneManager();

        let gridPlane: GridPlane;

        switch (preset) {
            case 'front':
            case 'back':
                gridPlane = 'xy'; // Front/Back view shows XY plane
                break;
            case 'right':
            case 'left':
                gridPlane = 'yz'; // Left/Right view shows YZ plane
                break;
            case 'top':
            case 'bottom':
            case 'camera':
            case 'user':
            default:
                gridPlane = 'xz'; // Top/Bottom and default views show XZ floor
                break;
        }

        sceneManager.infiniteGrid.setPlane(gridPlane);
    }

    /**
     * Toggle between orthographic and perspective projection
     */
    toggleProjection(): void {
        // Note: Three.js OrbitControls work with PerspectiveCamera
        // For true orthographic, we would need to swap cameras
        // For now, we simulate by adjusting FOV
        const sceneManager = getSceneManager();

        if (this.projectionType === 'perspective') {
            this.projectionType = 'orthographic';
            // Simulate orthographic with very low FOV
            sceneManager.camera.fov = 1;
            sceneManager.camera.updateProjectionMatrix();

            // Move camera back to compensate
            const distance = sceneManager.camera.position.distanceTo(sceneManager.orbitControls.target);
            const direction = sceneManager.camera.position.clone()
                .sub(sceneManager.orbitControls.target)
                .normalize();
            sceneManager.camera.position.copy(
                sceneManager.orbitControls.target.clone().add(direction.multiplyScalar(distance * 50))
            );
        } else {
            this.projectionType = 'perspective';
            sceneManager.camera.fov = 50;
            sceneManager.camera.updateProjectionMatrix();

            // Move camera closer
            const direction = sceneManager.camera.position.clone()
                .sub(sceneManager.orbitControls.target)
                .normalize();
            sceneManager.camera.position.copy(
                sceneManager.orbitControls.target.clone().add(direction.multiplyScalar(this.viewDistance))
            );
        }

        sceneManager.orbitControls.update();
    }

    /**
     * Zoom to fit selected objects
     */
    zoomToSelection(): void {
        const sceneManager = getSceneManager();
        const selectedIds = selectionActions.getSelectedIds();

        if (selectedIds.length === 0) {
            this.zoomToAll();
            return;
        }

        // Calculate bounding box of selection
        const box = new THREE.Box3();

        selectedIds.forEach(id => {
            const mesh = sceneManager.getMesh(id);
            if (mesh) {
                box.expandByObject(mesh);
            }
        });

        this.zoomToBox(box);
    }

    /**
     * Zoom to fit all objects
     */
    zoomToAll(): void {
        const sceneManager = getSceneManager();
        const meshes = sceneManager.getAllMeshes();

        if (meshes.length === 0) {
            // Reset to default view
            this.setView('camera');
            return;
        }

        // Calculate bounding box of all objects
        const box = new THREE.Box3();

        meshes.forEach(mesh => {
            box.expandByObject(mesh);
        });

        this.zoomToBox(box);
    }

    /**
     * Zoom to fit a bounding box
     */
    private zoomToBox(box: THREE.Box3): void {
        const sceneManager = getSceneManager();

        if (box.isEmpty()) return;

        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);

        // Calculate distance to fit box in view
        const fov = sceneManager.camera.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2)) * 1.5; // 1.5x padding

        // Get current view direction
        const direction = sceneManager.camera.position.clone()
            .sub(sceneManager.orbitControls.target)
            .normalize();

        const newPosition = center.clone().add(direction.multiplyScalar(distance));

        this.animateTo(newPosition, center);
        this.currentPreset = 'user';
    }

    /**
     * Animate camera to target position
     */
    private animateTo(position: THREE.Vector3, target: THREE.Vector3): void {
        const sceneManager = getSceneManager();

        if (this.isAnimating) return;

        const startPosition = sceneManager.camera.position.clone();
        const startTarget = sceneManager.orbitControls.target.clone();

        const startTime = performance.now();
        this.isAnimating = true;

        const animate = () => {
            const elapsed = performance.now() - startTime;
            const t = Math.min(elapsed / this.animationDuration, 1);

            // Easing function (ease out cubic)
            const eased = 1 - Math.pow(1 - t, 3);

            // Interpolate position
            sceneManager.camera.position.lerpVectors(startPosition, position, eased);

            // Interpolate target
            const newTarget = new THREE.Vector3().lerpVectors(startTarget, target, eased);
            sceneManager.orbitControls.target.copy(newTarget);

            sceneManager.orbitControls.update();

            if (t < 1) {
                requestAnimationFrame(animate);
            } else {
                this.isAnimating = false;
            }
        };

        animate();
    }

    /**
     * Reset view to default
     */
    resetView(): void {
        this.setView('camera');
        this.projectionType = 'perspective';

        const sceneManager = getSceneManager();
        sceneManager.camera.fov = 50;
        sceneManager.camera.updateProjectionMatrix();
    }
}

// Singleton
let viewControllerInstance: ViewController | null = null;

export function getViewController(): ViewController {
    if (!viewControllerInstance) {
        viewControllerInstance = new ViewController();
    }
    return viewControllerInstance;
}
