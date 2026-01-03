import * as THREE from 'three';
import { getSceneManager } from '@/core/scene/SceneManager';
import { selectionActions } from '@/stores/selectionStore';

/**
 * Cursor3D - 3D cursor for precise placement
 * 
 * Similar to Blender's 3D cursor, allows users to place a reference point
 * in the scene for pivot operations and object placement.
 */
export class Cursor3D {
    private position: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
    private mesh: THREE.Group | null = null;
    private visible = true;

    // Raycaster for cursor placement  
    private raycaster = new THREE.Raycaster();
    private mouse = new THREE.Vector2();
    private groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

    constructor() {
        this.createCursorMesh();
    }

    /**
     * Create the 3D cursor visual
     */
    private createCursorMesh(): void {
        const sceneManager = getSceneManager();

        this.mesh = new THREE.Group();

        // Create crosshair
        const size = 0.3;

        // X axis (red)
        const xGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-size, 0, 0),
            new THREE.Vector3(size, 0, 0),
        ]);
        const xLine = new THREE.Line(xGeom, new THREE.LineBasicMaterial({ color: 0xff4444 }));
        this.mesh.add(xLine);

        // Y axis (green)
        const yGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, -size, 0),
            new THREE.Vector3(0, size, 0),
        ]);
        const yLine = new THREE.Line(yGeom, new THREE.LineBasicMaterial({ color: 0x44ff44 }));
        this.mesh.add(yLine);

        // Z axis (blue)
        const zGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, -size),
            new THREE.Vector3(0, 0, size),
        ]);
        const zLine = new THREE.Line(zGeom, new THREE.LineBasicMaterial({ color: 0x4444ff }));
        this.mesh.add(zLine);

        // Center circle
        const circleGeom = new THREE.RingGeometry(0.08, 0.1, 16);
        const circleMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            side: THREE.DoubleSide,
        });
        const circle = new THREE.Mesh(circleGeom, circleMat);
        circle.rotation.x = -Math.PI / 2;
        this.mesh.add(circle);

        this.mesh.position.copy(this.position);
        sceneManager.scene.add(this.mesh);
    }

    /**
     * Get cursor position
     */
    getPosition(): THREE.Vector3 {
        return this.position.clone();
    }

    /**
     * Set cursor position
     */
    setPosition(pos: THREE.Vector3): void {
        this.position.copy(pos);
        if (this.mesh) {
            this.mesh.position.copy(pos);
        }
    }

    /**
     * Place cursor at mouse position (raycasting)
     */
    placeAtMouse(event: MouseEvent): void {
        const sceneManager = getSceneManager();
        const canvas = sceneManager.getCanvas();
        const rect = canvas.getBoundingClientRect();

        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, sceneManager.camera);

        // Try to hit an object first
        const meshes = sceneManager.getAllMeshes();
        const intersects = this.raycaster.intersectObjects(meshes);

        if (intersects.length > 0) {
            // Place on object surface
            this.setPosition(intersects[0].point);
        } else {
            // Fall back to ground plane
            const intersection = new THREE.Vector3();
            this.raycaster.ray.intersectPlane(this.groundPlane, intersection);
            if (intersection) {
                this.setPosition(intersection);
            }
        }
    }

    /**
     * Place cursor at world origin
     */
    resetToOrigin(): void {
        this.setPosition(new THREE.Vector3(0, 0, 0));
    }

    /**
     * Place cursor at selection center
     */
    placeAtSelection(): void {
        const sceneManager = getSceneManager();
        const selectedIds = selectionActions.getSelectedIds();

        if (selectedIds.length === 0) return;

        const center = new THREE.Vector3();

        selectedIds.forEach(id => {
            const mesh = sceneManager.getMesh(id);
            if (mesh) {
                center.add(mesh.position);
            }
        });

        center.divideScalar(selectedIds.length);
        this.setPosition(center);
    }

    /**
     * Toggle visibility
     */
    toggleVisibility(): void {
        this.visible = !this.visible;
        if (this.mesh) {
            this.mesh.visible = this.visible;
        }
    }

    /**
     * Set visibility  
     */
    setVisible(visible: boolean): void {
        this.visible = visible;
        if (this.mesh) {
            this.mesh.visible = visible;
        }
    }

    /**
     * Dispose cursor
     */
    dispose(): void {
        if (this.mesh) {
            const sceneManager = getSceneManager();
            sceneManager.scene.remove(this.mesh);

            this.mesh.traverse(child => {
                if (child instanceof THREE.Line || child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (child.material instanceof THREE.Material) {
                        child.material.dispose();
                    }
                }
            });

            this.mesh = null;
        }
    }
}
