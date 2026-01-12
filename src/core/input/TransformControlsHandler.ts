import type { IInputHandler } from '@/core/interfaces';
import { InputPriority } from '@/core/interfaces';
import type { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { InputDispatcher } from './InputDispatcher';
import type { OrbitControlsHandler } from './OrbitControlsHandler';
import { InputLogger, type ComponentLogger } from '@/core/input/InputLogger';

/**
 * TransformControlsHandler - Handler for transform gizmo interactions
 * 
 * Implements IInputHandler for integration with InputDispatcher.
 * Priority: MODAL (95) - highest priority when dragging.
 * 
 * When the user drags a transform gizmo, this handler:
 * 1. Sets itself as modal to block other handlers
 * 2. Disables OrbitControls during the drag
 * 3. Releases modal status when drag ends
 */
export class TransformControlsHandler implements IInputHandler {
    readonly id = 'transform-gizmo';
    readonly priority = InputPriority.MODAL;
    readonly isModal = true;
    enabled = true;

    private transformControls: TransformControls;
    private dispatcher: InputDispatcher | null = null;
    private orbitControlsHandler: OrbitControlsHandler | null = null;
    private isDragging = false;
    private logger: ComponentLogger = InputLogger.create('TransformControls');

    // Callbacks for external integration
    private onDragStartCallback: ((objectId: string) => void) | null = null;
    private onDragEndCallback: ((objectId: string) => void) | null = null;
    private onDragChangeCallback: (() => void) | null = null;

    constructor(transformControls: TransformControls) {
        this.transformControls = transformControls;
        this.setupTransformControlsListeners();
    }

    /**
     * Set the InputDispatcher for modal control
     */
    setDispatcher(dispatcher: InputDispatcher): void {
        this.dispatcher = dispatcher;
    }

    /**
     * Set the OrbitControlsHandler for disabling during drag
     */
    setOrbitControlsHandler(handler: OrbitControlsHandler): void {
        this.orbitControlsHandler = handler;
    }

    /**
     * Set callback for drag start
     */
    onDragStart(callback: (objectId: string) => void): void {
        this.onDragStartCallback = callback;
    }

    /**
     * Set callback for drag end
     */
    onDragEnd(callback: (objectId: string) => void): void {
        this.onDragEndCallback = callback;
    }

    /**
     * Set callback for drag change (during drag)
     */
    onDragChange(callback: () => void): void {
        this.onDragChangeCallback = callback;
    }

    /**
     * Check if currently dragging
     */
    getIsDragging(): boolean {
        return this.isDragging;
    }

    /**
     * Setup listeners for TransformControls events
     */
    private setupTransformControlsListeners(): void {
        this.transformControls.addEventListener('dragging-changed', (event: any) => {
            const isDragging = event.value;

            if (isDragging) {
                this.handleDragStart();
            } else {
                this.handleDragEnd();
            }
        });

        this.transformControls.addEventListener('change', () => {
            if (this.isDragging) {
                this.onDragChangeCallback?.();
            }
        });
    }

    /**
     * Handle drag start
     */
    private handleDragStart(): void {
        this.isDragging = true;

        // Set this handler as modal - blocks lower priority handlers
        this.dispatcher?.setModalHandler(this);

        // Disable orbit controls
        this.orbitControlsHandler?.disable();

        // Get the object being transformed
        const object = this.transformControls.object;
        const objectId = object?.userData?.cubeId;

        this.logger.debug(`Drag started`, { objectId });

        if (objectId) {
            this.onDragStartCallback?.(objectId);
        }
    }

    /**
     * Handle drag end
     */
    private handleDragEnd(): void {
        this.isDragging = false;

        // Release modal status
        this.dispatcher?.setModalHandler(null);

        // Re-enable orbit controls
        this.orbitControlsHandler?.enable();

        // Get the object that was transformed
        const object = this.transformControls.object;
        const objectId = object?.userData?.cubeId;

        this.logger.debug(`Drag ended`);

        if (objectId) {
            this.onDragEndCallback?.(objectId);
        }
    }

    // ============================================
    // IInputHandler EVENT METHODS
    // ============================================

    /**
     * Handle mouse down
     * TransformControls has its own event handling, we just track state
     */
    onMouseDown(_event: MouseEvent): boolean {
        // TransformControls handles its own events
        // If we're dragging, consume the event
        return this.isDragging;
    }

    onMouseMove(_event: MouseEvent): boolean {
        return this.isDragging;
    }

    onMouseUp(_event: MouseEvent): boolean {
        return this.isDragging;
    }

    /**
     * Handle escape to cancel transform
     */
    onKeyDown(event: KeyboardEvent): boolean {
        if (this.isDragging && event.key === 'Escape') {
            // Reset the transform by canceling
            this.transformControls.reset();
            return true;
        }
        return false;
    }

    dispose(): void {
        this.transformControls.dispose();
    }
}
