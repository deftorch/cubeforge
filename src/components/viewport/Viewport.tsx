import { Component, onMount, onCleanup, createEffect } from 'solid-js';
import * as THREE from 'three';
import { useCoreContext } from '@/components/CoreProvider';
import { getViewportShading } from '@/core/viewport/ViewportShading';
import { uiStore, uiActions } from '@/stores/uiStore';
import { selectionActions, selectionStore } from '@/stores/selectionStore';
import { ViewportOverlay } from './ViewportOverlay';

/**
 * Viewport Component - 3D rendering viewport
 * 
 * Refactored to use InputDispatcher for all input handling.
 * The dispatcher routes events to handlers based on priority.
 */
export const Viewport: Component = () => {
    let containerRef: HTMLDivElement | undefined;

    // Access core managers via context
    const {
        sceneManager,
        cubeManager,
        selectionManager,
        boxSelectTool,
        circleSelectTool,
        pivotController,
        inputDispatcher,
        transformControlsHandler,
    } = useCoreContext();

    onMount(() => {
        if (!containerRef) return;

        // Mount the renderer
        sceneManager.mount(containerRef);

        // Initialize tools
        boxSelectTool.init(containerRef);
        circleSelectTool.init(containerRef);

        // Get canvas for event listeners
        const canvas = sceneManager.getCanvas();

        // ============================================
        // INPUT DISPATCHER EVENT HANDLERS
        // All events are routed through the InputDispatcher
        // which handles priority and modal blocking automatically
        // ============================================

        const handleMouseDown = (event: MouseEvent) => {
            // Special case: Shift + Right click to place 3D cursor
            // This is a viewport-specific action, not handled by dispatcher
            if (event.shiftKey && event.button === 2) {
                event.preventDefault();
                pivotController.getCursor().placeAtMouse(event);
                return;
            }

            // Dispatch to registered handlers
            inputDispatcher.dispatchMouseDown(event);
        };

        const handleClick = (event: MouseEvent) => {
            // Ignore if dragging transform controls
            if (transformControlsHandler.getIsDragging()) return;

            // Dispatch to registered handlers
            inputDispatcher.dispatchClick(event);
        };

        const handleMouseMove = (event: MouseEvent) => {
            inputDispatcher.dispatchMouseMove(event);
        };

        const handleMouseUp = (event: MouseEvent) => {
            inputDispatcher.dispatchMouseUp(event);
        };

        const handleWheel = (event: WheelEvent) => {
            inputDispatcher.dispatchWheel(event);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            inputDispatcher.dispatchKeyDown(event);
        };

        const handleContextMenu = (event: MouseEvent) => {
            // Always prevent context menu in viewport
            event.preventDefault();
            inputDispatcher.dispatchContextMenu(event);
        };

        // ============================================
        // TRANSFORM CONTROLS CALLBACKS
        // Setup callbacks via TransformControlsHandler
        // ============================================

        transformControlsHandler.onDragStart((cubeId: string) => {
            cubeManager.startTransform(cubeId);
        });

        transformControlsHandler.onDragEnd((cubeId: string) => {
            cubeManager.endTransform(cubeId);
        });

        transformControlsHandler.onDragChange(() => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                cubeManager.syncMeshToStore(selectedIds[0]);
                selectionManager.syncOutlines();
                getViewportShading().updateWireframes();
            }
        });

        // ============================================
        // EVENT LISTENERS
        // ============================================

        canvas.addEventListener('mousedown', handleMouseDown);
        canvas.addEventListener('click', handleClick);
        canvas.addEventListener('mousemove', handleMouseMove);
        canvas.addEventListener('mouseup', handleMouseUp);
        canvas.addEventListener('wheel', handleWheel);
        canvas.addEventListener('keydown', handleKeyDown);
        canvas.addEventListener('contextmenu', handleContextMenu);

        // ============================================
        // DRAG AND DROP HANDLERS (for create cube from toolbar + move from hierarchy)
        // ============================================

        // Ghost cube for drag preview
        let ghostCube: THREE.Mesh | null = null;

        const createGhostCube = () => {
            if (ghostCube) return; // Already exists

            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshBasicMaterial({
                color: 0x4a9eff,
                transparent: true,
                opacity: 0.4,
                wireframe: false,
            });
            ghostCube = new THREE.Mesh(geometry, material);
            ghostCube.name = '__ghost_cube__';

            // Add wireframe overlay for better visibility
            const wireframeMaterial = new THREE.MeshBasicMaterial({
                color: 0x4a9eff,
                wireframe: true,
                transparent: true,
                opacity: 0.8,
            });
            const wireframe = new THREE.Mesh(geometry.clone(), wireframeMaterial);
            wireframe.name = '__ghost_wireframe__';
            ghostCube.add(wireframe);

            sceneManager.scene.add(ghostCube);
        };

        const removeGhostCube = () => {
            if (ghostCube) {
                sceneManager.scene.remove(ghostCube);
                ghostCube.geometry.dispose();
                (ghostCube.material as THREE.Material).dispose();
                // Dispose wireframe child
                ghostCube.children.forEach(child => {
                    if (child instanceof THREE.Mesh) {
                        child.geometry.dispose();
                        (child.material as THREE.Material).dispose();
                    }
                });
                ghostCube = null;
            }
        };

        const updateGhostPosition = (clientX: number, clientY: number) => {
            if (!ghostCube) return;
            const worldPosition = sceneManager.screenToWorld(clientX, clientY);
            ghostCube.position.copy(worldPosition);
        };

        const handleDragEnter = (event: DragEvent) => {
            if (event.dataTransfer?.types.includes('application/cube-forge-create')) {
                createGhostCube();
                updateGhostPosition(event.clientX, event.clientY);
            }
        };

        const handleDragOver = (event: DragEvent) => {
            // Accept cube-forge-create (new cube) or cube-forge-move (existing cube)
            if (event.dataTransfer?.types.includes('application/cube-forge-create') ||
                event.dataTransfer?.types.includes('application/cube-forge-move')) {
                event.preventDefault();
                event.dataTransfer!.dropEffect = event.dataTransfer?.types.includes('application/cube-forge-create') ? 'copy' : 'move';

                // Update ghost cube position
                if (event.dataTransfer?.types.includes('application/cube-forge-create')) {
                    if (!ghostCube) createGhostCube();
                    updateGhostPosition(event.clientX, event.clientY);
                }
            }
        };

        const handleDragLeave = (event: DragEvent) => {
            // Only remove if we're actually leaving the container
            const rect = containerRef?.getBoundingClientRect();
            if (rect && (
                event.clientX < rect.left ||
                event.clientX > rect.right ||
                event.clientY < rect.top ||
                event.clientY > rect.bottom
            )) {
                removeGhostCube();
            }
        };

        const handleDrop = (event: DragEvent) => {
            event.preventDefault();

            // Remove ghost cube
            removeGhostCube();

            // Handle new cube creation
            const createType = event.dataTransfer?.getData('application/cube-forge-create');
            if (createType === 'create-cube') {
                // Calculate 3D position from mouse coordinates
                const worldPosition = sceneManager.screenToWorld(event.clientX, event.clientY);

                // Create cube at the calculated position with full transform
                const cube = cubeManager.createCubeWithUndo({
                    transform: {
                        position: worldPosition,
                        rotation: new THREE.Euler(0, 0, 0),
                        scale: new THREE.Vector3(1, 1, 1),
                    }
                });

                selectionActions.select(cube.id);
                uiActions.setStatus(`Created ${cube.name} at (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})`);
                return;
            }

            // Handle moving existing cube from hierarchy
            const moveType = event.dataTransfer?.getData('application/cube-forge-move');
            if (moveType) {
                const cubeId = moveType;
                const worldPosition = sceneManager.screenToWorld(event.clientX, event.clientY);

                // Move the cube to the new position
                cubeManager.updateTransform(cubeId, {
                    position: worldPosition,
                });

                selectionActions.select(cubeId);
                uiActions.setStatus(`Moved cube to (${worldPosition.x.toFixed(1)}, ${worldPosition.y.toFixed(1)}, ${worldPosition.z.toFixed(1)})`);
            }
        };


        // Add drop handlers to container (not canvas, to capture full area)
        containerRef?.addEventListener('dragenter', handleDragEnter);
        containerRef?.addEventListener('dragover', handleDragOver);
        containerRef?.addEventListener('dragleave', handleDragLeave);
        containerRef?.addEventListener('drop', handleDrop);

        // Handle focus
        canvas.addEventListener('focus', () => uiActions.setViewportFocused(true));
        canvas.addEventListener('blur', () => uiActions.setViewportFocused(false));

        // Make canvas focusable
        canvas.tabIndex = 0;

        // ============================================
        // CLEANUP
        // ============================================

        onCleanup(() => {
            canvas.removeEventListener('mousedown', handleMouseDown);
            canvas.removeEventListener('click', handleClick);
            canvas.removeEventListener('mousemove', handleMouseMove);
            canvas.removeEventListener('mouseup', handleMouseUp);
            canvas.removeEventListener('wheel', handleWheel);
            canvas.removeEventListener('keydown', handleKeyDown);
            canvas.removeEventListener('contextmenu', handleContextMenu);
            removeGhostCube(); // Clean up ghost cube if exists
            sceneManager.unmount();
            selectionManager.dispose();
            boxSelectTool.dispose();
            circleSelectTool.dispose();
            pivotController.dispose();
        });
    });

    // ============================================
    // REACTIVE EFFECTS
    // ============================================

    // React to transform mode changes
    createEffect(() => {
        sceneManager.setTransformMode(uiStore.transformMode);
    });

    // React to grid visibility changes
    createEffect(() => {
        sceneManager.setGridVisible(uiStore.showGrid);
    });

    // React to selection changes - attach transform controls
    createEffect(() => {
        const selectedIds = Array.from(selectionStore.selectedIds);

        if (selectedIds.length > 0) {
            sceneManager.attachTransformControls(selectedIds[0]);
        } else {
            sceneManager.detachTransformControls();
        }
    });

    // ============================================
    // RENDER
    // ============================================

    return (
        <div
            ref={containerRef}
            class="flex-1 bg-surface-900 relative overflow-hidden"
            style={{ "min-height": "400px" }}
        >
            {/* Viewport Overlay - contains all UI elements */}
            <ViewportOverlay />
        </div>
    );
};
