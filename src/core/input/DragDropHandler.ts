import * as THREE from 'three';
import type { IInputHandler } from '@/core/interfaces';
import { InputPriority } from '@/core/interfaces';
import { selectionActions } from '@/stores/selectionStore';
import { uiActions } from '@/stores/uiStore';
import type { SceneManager } from '@/core/scene/SceneManager';
import type { CubeManager } from '@/core/scene/CubeManager';
import { InputLogger, type ComponentLogger } from './InputLogger';

/**
 * DragDropHandler - Manages drag and drop operations in the viewport
 * 
 * Handles:
 * - Dragging new cubes from toolbar (application/cube-forge-create)
 * - Dragging existing cubes from hierarchy (application/cube-forge-move)
 * - Visual feedback (Ghost Cube)
 */
export class DragDropHandler implements IInputHandler {
    readonly id = 'drag-drop';
    readonly priority = InputPriority.TOOL; // High priority to handle drops over other tools
    enabled = true;

    private logger: ComponentLogger = InputLogger.create('DragDropHandler');

    // Ghost cube for visual feedback
    private ghostCube: THREE.Mesh | null = null;

    constructor(
        private sceneManager: SceneManager,
        private cubeManager: CubeManager
    ) {
        this.logger.debug('Initialized');
    }

    // ============================================
    // GHOST CUBE MANAGEMENT
    // ============================================

    private createGhostCube(): void {
        if (this.ghostCube) return;

        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
            color: 0x4a9eff,
            transparent: true,
            opacity: 0.4,
            wireframe: false,
        });
        this.ghostCube = new THREE.Mesh(geometry, material);
        this.ghostCube.name = '__ghost_cube__';

        // Add wireframe overlay
        const wireframeGeometry = new THREE.EdgesGeometry(geometry);
        const wireframeMaterial = new THREE.LineBasicMaterial({
            color: 0x4a9eff,
            transparent: true,
            opacity: 0.8,
        });
        const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
        wireframe.name = '__ghost_wireframe__';
        this.ghostCube.add(wireframe);

        this.sceneManager.scene.add(this.ghostCube);
        this.logger.debug('Ghost cube created');
    }

    private removeGhostCube(): void {
        if (this.ghostCube) {
            this.sceneManager.scene.remove(this.ghostCube);
            this.ghostCube.geometry.dispose();
            if (Array.isArray(this.ghostCube.material)) {
                this.ghostCube.material.forEach(m => m.dispose());
            } else {
                (this.ghostCube.material as THREE.Material).dispose();
            }

            // Dispose children
            this.ghostCube.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(m => m.dispose());
                    } else {
                        (child.material as THREE.Material).dispose();
                    }
                } else if (child instanceof THREE.LineSegments) {
                    child.geometry.dispose();
                    (child.material as THREE.Material).dispose();
                }
            });

            this.ghostCube = null;
            this.logger.debug('Ghost cube removed');
        }
    }

    private updateGhostPosition(clientX: number, clientY: number): void {
        if (!this.ghostCube) return;
        const worldPosition = this.sceneManager.screenToWorld(clientX, clientY);
        this.ghostCube.position.copy(worldPosition);
    }

    // ============================================
    // EVENT HANDLERS
    // ============================================

    /**
     * Handle drag enter - Show ghost cube for creation
     */
    onDragEnter(event: DragEvent): boolean {
        // Only handle cube creation from toolbar
        const isCreate = event.dataTransfer?.types.includes('application/cube-forge-create');

        if (isCreate) {
            this.createGhostCube();
            this.updateGhostPosition(event.clientX, event.clientY);
            return true;
        }

        return false;
    }

    /**
     * Handle drag over - Update position
     */
    onDragOver(event: DragEvent): boolean {
        // Only handle cube creation from toolbar
        const isCreate = event.dataTransfer?.types.includes('application/cube-forge-create');

        if (isCreate) {
            event.preventDefault();
            if (event.dataTransfer) {
                event.dataTransfer.dropEffect = 'copy';
            }

            if (!this.ghostCube) this.createGhostCube();
            this.updateGhostPosition(event.clientX, event.clientY);
            return true;
        }

        return false;
    }

    /**
     * Handle drag leave - Cleanup ghost
     */
    onDragLeave(_event: DragEvent): boolean {
        // We rely on the drop handler or subsequent logic to cleanup primarily,
        // but here we can clean if leaving the window/area.
        // For simplicity in the unified handler (which receives events for the canvas),
        // we might not want to remove immediately unless we are sure we left the viewport.
        // However, standard behavior is remove on leave.
        this.removeGhostCube();
        return false;
    }

    /**
     * Handle drop - Execute action (only create new cubes from toolbar)
     */
    onDrop(event: DragEvent): boolean {
        this.removeGhostCube();

        const createType = event.dataTransfer?.getData('application/cube-forge-create');

        // Check for create type - handle both data payload and simple type presence
        const hasCreateType = event.dataTransfer?.types.includes('application/cube-forge-create');
        const createData = event.dataTransfer?.getData('application/cube-forge-create');

        // Only handle cube creation from toolbar
        if (createType === 'create-cube' || hasCreateType) {
            event.preventDefault();
            let worldPosition = this.sceneManager.screenToWorld(event.clientX, event.clientY);

            // Validate position - fix for invisible cubes if raycast fails (NaN coordinates)
            if (isNaN(worldPosition.x) || isNaN(worldPosition.y) || isNaN(worldPosition.z)) {
                this.logger.warn('Invalid drop coordinates, falling back to usage origin', {
                    clientX: event.clientX,
                    clientY: event.clientY
                });
                worldPosition = new THREE.Vector3(0, 1, 0); // Default slightly above ground
            }

            this.logger.debug('Processing drop', { createData, hasCreateType, pos: worldPosition });

            const cube = this.cubeManager.createCubeWithUndo({
                transform: {
                    position: worldPosition,
                    rotation: new THREE.Euler(0, 0, 0),
                    scale: new THREE.Vector3(1, 1, 1),
                }
            });

            selectionActions.select(cube.id);
            uiActions.setStatus(`Created ${cube.name} at (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})`);

            this.logger.debug('Cube created via drop', { cubeId: cube.id });
            return true;
        }

        return false;
    }

    dispose(): void {
        this.removeGhostCube();
        this.logger.debug('Disposed');
    }
}
