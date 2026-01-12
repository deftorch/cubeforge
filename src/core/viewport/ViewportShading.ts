import * as THREE from 'three';
import { getSceneManager } from '@/core/scene/SceneManager';

export type ShadingMode = 'solid' | 'wireframe' | 'material' | 'rendered';

/**
 * Stores original material properties for restoration
 */
interface OriginalMaterialState {
    opacity: number;
    transparent: boolean;
    depthWrite: boolean;
    metalness: number;
    roughness: number;
}

/**
 * ViewportShading - Controls viewport rendering modes
 * 
 * Fixes:
 * - Properly restores material state when switching between modes
 * - Material mode has distinct visual appearance
 * - X-Ray is independent from shading mode
 * - New cubes inherit current render mode via applyToMesh()
 */
export class ViewportShading {
    private currentMode: ShadingMode = 'solid';
    private xRayEnabled = false;

    // Overlay state
    private wireframeOverlayEnabled = false;
    private wireframeOverlayOpacity = 0.5;
    private geometryOpacity = 1.0;

    // Store original material state for restoration
    private originalStates: Map<string, OriginalMaterialState> = new Map();
    // Shading mode wireframes (green)
    private wireframeMaterials: Map<string, THREE.LineSegments> = new Map();
    // Overlay wireframes (black/white)
    private overlayWireframes: Map<string, THREE.LineSegments> = new Map();

    constructor() { }

    /**
     * Get current shading mode
     */
    getMode(): ShadingMode {
        return this.currentMode;
    }

    /**
     * Is X-Ray enabled
     */
    isXRayEnabled(): boolean {
        return this.xRayEnabled;
    }

    /**
     * Set shading mode
     */
    setMode(mode: ShadingMode): void {
        if (mode === this.currentMode) return;

        // Restore from previous mode first
        this.restoreFromCurrentMode();

        this.currentMode = mode;

        // Apply new mode to all meshes
        const sceneManager = getSceneManager();
        const meshes = sceneManager.getAllMeshes();
        meshes.forEach(mesh => this.applyModeToMesh(mesh, mode));
    }

    /**
     * Toggle wireframe mode
     */
    toggleWireframe(): void {
        if (this.currentMode === 'wireframe') {
            this.setMode('solid');
        } else {
            this.setMode('wireframe');
        }
    }

    /**
     * Toggle X-Ray mode (transparency for selection through objects)
     * X-Ray is independent of shading mode
     */
    toggleXRay(): void {
        this.xRayEnabled = !this.xRayEnabled;
        this.applyXRayToAll();
    }

    /**
     * Set X-Ray mode
     */
    setXRay(enabled: boolean): void {
        if (this.xRayEnabled === enabled) return;
        this.xRayEnabled = enabled;
        this.applyXRayToAll();
    }

    /**
     * Set Wireframe Overlay (renders visible wireframe ON TOP of current shading)
     */
    setWireframeOverlay(enabled: boolean, opacity: number): void {
        this.wireframeOverlayEnabled = enabled;
        this.wireframeOverlayOpacity = opacity;

        const sceneManager = getSceneManager();
        const meshes = sceneManager.getAllMeshes();

        if (enabled) {
            // Create/update overlays for all meshes
            meshes.forEach(mesh => this.updateOverlayWireframe(mesh));
        } else {
            // Remove all overlays
            this.overlayWireframes.forEach((wireframe) => {
                sceneManager.scene.remove(wireframe);
                wireframe.geometry.dispose();
                (wireframe.material as THREE.Material).dispose();
            });
            this.overlayWireframes.clear();
        }
    }

    /**
     * Set Geometry Opacity (global opacity for solid geometry)
     */
    setGeometryOpacity(opacity: number): void {
        if (this.geometryOpacity === opacity) return;
        this.geometryOpacity = opacity;

        const sceneManager = getSceneManager();
        const meshes = sceneManager.getAllMeshes();
        meshes.forEach(mesh => this.applyModeToMesh(mesh, this.currentMode));
    }

    /**
     * Apply current shading mode and x-ray to a single mesh
     * Call this when creating new cubes to inherit current render mode
     */
    applyToMesh(mesh: THREE.Mesh): void {
        // Save original state if not already saved
        this.saveOriginalState(mesh);

        // Apply current shading mode
        this.applyModeToMesh(mesh, this.currentMode);

        // Apply x-ray if enabled (after shading mode, so it stacks properly)
        if (this.xRayEnabled) {
            this.applyXRayToMesh(mesh);
        }

        // Apply wireframe overlay if enabled
        if (this.wireframeOverlayEnabled) {
            this.updateOverlayWireframe(mesh);
        }
    }

    /**
     * Save original material state for a mesh
     */
    private saveOriginalState(mesh: THREE.Mesh): void {
        const cubeId = mesh.userData.cubeId;
        if (!cubeId || this.originalStates.has(cubeId)) return;

        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            this.originalStates.set(cubeId, {
                opacity: mesh.material.opacity,
                transparent: mesh.material.transparent,
                depthWrite: mesh.material.depthWrite,
                metalness: mesh.material.metalness,
                roughness: mesh.material.roughness,
            });
        }
    }

    /**
     * Restore original material state for a mesh
     */
    private restoreOriginalState(mesh: THREE.Mesh): void {
        const cubeId = mesh.userData.cubeId;
        if (!cubeId) return;

        const original = this.originalStates.get(cubeId);
        if (original && mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.opacity = original.opacity;
            mesh.material.transparent = original.transparent;
            mesh.material.depthWrite = original.depthWrite;
            mesh.material.metalness = original.metalness;
            mesh.material.roughness = original.roughness;
            mesh.material.needsUpdate = true;
        }
    }

    /**
     * Apply X-Ray transparency to all meshes
     */
    private applyXRayToAll(): void {
        const sceneManager = getSceneManager();
        const meshes = sceneManager.getAllMeshes();

        meshes.forEach(mesh => {
            if (this.xRayEnabled) {
                this.applyXRayToMesh(mesh);
            } else {
                this.removeXRayFromMesh(mesh);
            }
        });
    }

    /**
     * Apply X-Ray effect to a single mesh
     */
    private applyXRayToMesh(mesh: THREE.Mesh): void {
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            // X-Ray makes mesh semi-transparent
            mesh.material.transparent = true;
            mesh.material.opacity = 0.5;
            mesh.material.depthWrite = false;
            mesh.material.needsUpdate = true;
        }
    }

    /**
     * Remove X-Ray effect from a mesh, respecting current shading mode
     */
    private removeXRayFromMesh(mesh: THREE.Mesh): void {
        // When removing x-ray, we need to respect the current shading mode
        // Re-apply the mode to get correct opacity/transparency
        this.applyModeToMesh(mesh, this.currentMode);
    }

    /**
     * Restore materials from current mode before switching
     */
    private restoreFromCurrentMode(): void {
        const sceneManager = getSceneManager();

        switch (this.currentMode) {
            case 'wireframe':
                // Remove wireframe overlays
                this.wireframeMaterials.forEach((wireframe) => {
                    sceneManager.scene.remove(wireframe);
                    wireframe.geometry.dispose();
                    (wireframe.material as THREE.Material).dispose();
                });
                this.wireframeMaterials.clear();

                // Restore mesh visibility and original material state
                sceneManager.getAllMeshes().forEach(mesh => {
                    mesh.visible = true;
                    this.restoreOriginalState(mesh);
                    // Re-apply X-Ray if still enabled after restoring
                    if (this.xRayEnabled) {
                        this.applyXRayToMesh(mesh);
                    }
                });
                break;

            case 'material':
                // Restore original metalness/roughness
                sceneManager.getAllMeshes().forEach(mesh => {
                    this.restoreOriginalState(mesh);
                    // Re-apply X-Ray if still enabled after restoring
                    if (this.xRayEnabled) {
                        this.applyXRayToMesh(mesh);
                    }
                });
                break;

            case 'solid':
            case 'rendered':
                // No special restoration needed
                break;
        }
    }

    /**
     * Apply shading mode to a single mesh
     */
    private applyModeToMesh(mesh: THREE.Mesh, mode: ShadingMode): void {
        // Save original state before modifying
        this.saveOriginalState(mesh);

        switch (mode) {
            case 'solid':
                this.applySolidToMesh(mesh);
                break;
            case 'wireframe':
                this.applyWireframeToMesh(mesh);
                break;
            case 'material':
                this.applyMaterialToMesh(mesh);
                break;
            case 'rendered':
                this.applyRenderedToMesh(mesh);
                break;
        }
    }

    /**
     * Apply solid shading to a mesh (default, fully opaque)
     */
    private applySolidToMesh(mesh: THREE.Mesh): void {
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.wireframe = false;
            mesh.material.flatShading = false;

            // Restore to fully opaque (unless x-ray is enabled)
            if (!this.xRayEnabled) {
                const original = this.originalStates.get(mesh.userData.cubeId);
                // Use geometry opacity from overlays
                const baseOpacity = original?.opacity ?? 1.0;
                mesh.material.opacity = baseOpacity * this.geometryOpacity;

                // Enable transparency if opacity < 1.0
                const isTransparent = (original?.transparent ?? false) || this.geometryOpacity < 1.0;
                mesh.material.transparent = isTransparent;

                // Disable depth write if transparent to avoid occlusion issues,
                // but usually we want it enabled for solid unless very transparent
                mesh.material.depthWrite = original?.depthWrite ?? (!isTransparent || this.geometryOpacity > 0.9);
            }
            mesh.material.needsUpdate = true;
        }
    }

    /**
     * Apply wireframe mode to a mesh
     */
    private applyWireframeToMesh(mesh: THREE.Mesh): void {
        const cubeId = mesh.userData.cubeId;
        if (!cubeId) return;

        const sceneManager = getSceneManager();

        // Create wireframe overlay if not exists
        if (!this.wireframeMaterials.has(cubeId)) {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x00ff00, // Green wireframe like Blender
                linewidth: 1,
            });

            const wireframe = new THREE.LineSegments(edges, lineMaterial);

            // Use world transform for child cubes (they have local position relative to parent)
            mesh.updateMatrixWorld(true);
            wireframe.position.setFromMatrixPosition(mesh.matrixWorld);
            wireframe.quaternion.setFromRotationMatrix(mesh.matrixWorld);
            const worldScale = new THREE.Vector3();
            mesh.getWorldScale(worldScale);
            wireframe.scale.copy(worldScale);

            sceneManager.scene.add(wireframe);
            this.wireframeMaterials.set(cubeId, wireframe);
        }

        // Make original mesh semi-transparent (visible behind wireframe)
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.transparent = true;
            // Use higher opacity if X-Ray is active, otherwise very transparent
            mesh.material.opacity = this.xRayEnabled ? 0.5 : 0.1;
            mesh.material.depthWrite = false;
            mesh.material.needsUpdate = true;
        }
    }

    /**
     * Apply material preview mode to a mesh
     * Enhanced material view with tweaked properties for better visualization
     */
    private applyMaterialToMesh(mesh: THREE.Mesh): void {
        if (mesh.material instanceof THREE.MeshStandardMaterial) {
            mesh.material.wireframe = false;
            mesh.material.flatShading = false;

            // Material mode: slightly increase metalness and reduce roughness
            // for better material preview with more reflections
            mesh.material.metalness = Math.min(1.0, (mesh.material.metalness || 0) + 0.2);
            mesh.material.roughness = Math.max(0.1, (mesh.material.roughness || 0.5) - 0.2);

            // Ensure not transparent unless x-ray is enabled
            if (!this.xRayEnabled) {
                mesh.material.opacity = 1.0;
                mesh.material.transparent = false;
                mesh.material.depthWrite = true;
            }
            mesh.material.needsUpdate = true;
        }
    }

    /**
     * Apply rendered mode to a mesh (best quality, same as material for now)
     */
    private applyRenderedToMesh(mesh: THREE.Mesh): void {
        // Rendered mode - same as material for now
        // Could add post-processing effects in the future
        this.applyMaterialToMesh(mesh);
    }

    /**
     * Update wireframe positions (call after transform)
     */
    updateWireframes(): void {
        if (this.currentMode !== 'wireframe') return;

        const sceneManager = getSceneManager();

        this.wireframeMaterials.forEach((wireframe, cubeId) => {
            const mesh = sceneManager.getMesh(cubeId);
            if (mesh) {
                // Use world transform for child cubes
                mesh.updateMatrixWorld(true);
                wireframe.position.setFromMatrixPosition(mesh.matrixWorld);
                wireframe.quaternion.setFromRotationMatrix(mesh.matrixWorld);
                const worldScale = new THREE.Vector3();
                mesh.getWorldScale(worldScale);
                wireframe.scale.copy(worldScale);
            }
        });
    }

    /**
     * Create or update overlay wireframe for a mesh
     */
    private updateOverlayWireframe(mesh: THREE.Mesh): void {
        const cubeId = mesh.userData.cubeId;
        if (!cubeId) return;

        const sceneManager = getSceneManager();

        // Check if we need to remove existing one first (e.g. geometry change)
        // For now, simpler to reuse or recreate if missing

        let wireframe = this.overlayWireframes.get(cubeId);

        if (!wireframe) {
            const edges = new THREE.EdgesGeometry(mesh.geometry);
            const lineMaterial = new THREE.LineBasicMaterial({
                color: 0x000000, // Black wireframe for overlay
                linewidth: 1,
                transparent: true,
                opacity: this.wireframeOverlayOpacity,
                depthTest: true,
            });

            wireframe = new THREE.LineSegments(edges, lineMaterial);
            sceneManager.scene.add(wireframe);
            this.overlayWireframes.set(cubeId, wireframe);
        } else {
            // Update opacity
            const mat = wireframe.material as THREE.LineBasicMaterial;
            mat.opacity = this.wireframeOverlayOpacity;
            mat.needsUpdate = true;
        }

        // Sync transform
        mesh.updateMatrixWorld(true);
        wireframe.position.setFromMatrixPosition(mesh.matrixWorld);
        wireframe.quaternion.setFromRotationMatrix(mesh.matrixWorld);
        const worldScale = new THREE.Vector3();
        mesh.getWorldScale(worldScale);
        wireframe.scale.copy(worldScale);

        wireframe.visible = mesh.visible;
    }

    /**
     * Remove a mesh from tracking (call when cube is deleted)
     */
    removeMesh(cubeId: string): void {
        const sceneManager = getSceneManager();

        // Implement shading wireframe removal
        const wireframe = this.wireframeMaterials.get(cubeId);
        if (wireframe) {
            sceneManager.scene.remove(wireframe);
            wireframe.geometry.dispose();
            (wireframe.material as THREE.Material).dispose();
            this.wireframeMaterials.delete(cubeId);
        }

        // Implement overlay wireframe removal
        const overlay = this.overlayWireframes.get(cubeId);
        if (overlay) {
            sceneManager.scene.remove(overlay);
            overlay.geometry.dispose();
            (overlay.material as THREE.Material).dispose();
            this.overlayWireframes.delete(cubeId);
        }

        // Remove original state
        this.originalStates.delete(cubeId);
    }

    /**
     * Refresh shading for a specific mesh (e.g., after material change)
     */
    refreshMesh(cubeId: string): void {
        const sceneManager = getSceneManager();
        const mesh = sceneManager.getMesh(cubeId);
        if (!mesh) return;

        // Update saved original state and re-apply current mode
        this.originalStates.delete(cubeId); // Clear old state
        this.applyToMesh(mesh);

        if (this.wireframeOverlayEnabled) {
            // Recreate overlay as geometry might have changed
            const overlay = this.overlayWireframes.get(cubeId);
            if (overlay) {
                sceneManager.scene.remove(overlay);
                overlay.geometry.dispose();
                this.overlayWireframes.delete(cubeId);
            }
            this.updateOverlayWireframe(mesh);
        }
    }

    /**
     * Set object visibility (including wireframe)
     */
    setObjectVisible(cubeId: string, visible: boolean): void {
        const sceneManager = getSceneManager();
        const mesh = sceneManager.getMesh(cubeId);

        // Update mesh visibility
        if (mesh) {
            mesh.visible = visible;
        }

        // Update shading wireframe visibility
        const wireframe = this.wireframeMaterials.get(cubeId);
        if (wireframe) {
            wireframe.visible = visible;
        }

        // Update overlay wireframe visibility
        const overlay = this.overlayWireframes.get(cubeId);
        if (overlay) {
            overlay.visible = visible && this.wireframeOverlayEnabled;
        }
    }

    /**
     * Get shading mode display name
     */
    getModeDisplayName(): string {
        const names: Record<ShadingMode, string> = {
            solid: 'Solid',
            wireframe: 'Wireframe',
            material: 'Material',
            rendered: 'Rendered',
        };
        return names[this.currentMode];
    }
}

// Singleton
let viewportShadingInstance: ViewportShading | null = null;

export function getViewportShading(): ViewportShading {
    if (!viewportShadingInstance) {
        viewportShadingInstance = new ViewportShading();
    }
    return viewportShadingInstance;
}
