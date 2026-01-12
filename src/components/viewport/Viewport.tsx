import { Component, onMount, onCleanup, createEffect } from 'solid-js';

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
        canvas.addEventListener('contextmenu', handleContextMenu);

        // Global Input Listeners
        window.addEventListener('keydown', handleKeyDown);

        // ============================================
        // DRAG AND DROP HANDLERS (for create cube from toolbar + move from hierarchy)
        // ============================================

        const handleDragEnter = (event: DragEvent) => {
            inputDispatcher.dispatchDragEnter(event);
        };

        const handleDragOver = (event: DragEvent) => {
            inputDispatcher.dispatchDragOver(event);
        };

        const handleDragLeave = (event: DragEvent) => {
            inputDispatcher.dispatchDragLeave(event);
        };

        const handleDrop = (event: DragEvent) => {
            inputDispatcher.dispatchDrop(event);
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
            window.removeEventListener('keydown', handleKeyDown);
            canvas.removeEventListener('contextmenu', handleContextMenu);
            // removeGhostCube(); // Logic moved to DragDropHandler
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

    // React to overlay changes
    createEffect(() => {
        // Grid & Floor
        sceneManager.setGridOverlays(uiStore.overlays);

        // Selection Outlines
        selectionManager.setOutlinesVisible(uiStore.overlays.showOutlineSelected);

        // Wireframe Overlay
        getViewportShading().setWireframeOverlay(
            uiStore.overlays.showWireframe,
            uiStore.overlays.wireframeOpacity
        );

        // Origins
        sceneManager.setOriginsVisible(uiStore.overlays.showOrigins);
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
