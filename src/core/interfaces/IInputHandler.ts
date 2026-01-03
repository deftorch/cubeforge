/**
 * IInputHandler - Interface for all input handlers in the Input Dispatcher system
 * 
 * Handlers are processed in priority order (highest first).
 * Return `true` from event methods to consume the event and stop propagation.
 */
export interface IInputHandler {
    /** Unique identifier for this handler */
    readonly id: string;

    /** 
     * Priority level (higher = processed first)
     * Recommended ranges:
     * - 90-100: Modal operators (transform gizmo drag)
     * - 70-89: Active tools (BoxSelect, CircleSelect)
     * - 40-69: Default interactions (click-to-select)
     * - 10-39: Navigation (OrbitControls)
     * - 0-9: Fallback handlers
     */
    readonly priority: number;

    /** Whether this handler is currently enabled */
    enabled: boolean;

    /**
     * If true, this handler operates in "modal" mode.
     * When a modal handler is active, it blocks ALL lower-priority handlers
     * until it's deactivated.
     */
    readonly isModal?: boolean;

    // ============================================
    // MOUSE EVENTS
    // Return true if event was consumed (stops propagation)
    // ============================================

    onMouseDown?(event: MouseEvent): boolean;
    onMouseMove?(event: MouseEvent): boolean;
    onMouseUp?(event: MouseEvent): boolean;
    onClick?(event: MouseEvent): boolean;
    onDoubleClick?(event: MouseEvent): boolean;
    onWheel?(event: WheelEvent): boolean;
    onContextMenu?(event: MouseEvent): boolean;

    // ============================================
    // KEYBOARD EVENTS
    // ============================================

    onKeyDown?(event: KeyboardEvent): boolean;
    onKeyUp?(event: KeyboardEvent): boolean;

    // ============================================
    // DRAG EVENTS
    // ============================================

    onDragEnter?(event: DragEvent): boolean;
    onDragOver?(event: DragEvent): boolean;
    onDragLeave?(event: DragEvent): boolean;
    onDrop?(event: DragEvent): boolean;

    // ============================================
    // LIFECYCLE
    // ============================================

    /** Called when handler is registered to dispatcher */
    onRegister?(): void;

    /** Called when handler is unregistered from dispatcher */
    onUnregister?(): void;

    /** Cleanup resources */
    dispose?(): void;
}

/**
 * Priority constants for common handler types
 */
export const InputPriority = {
    /** Modal operations like transform gizmo drag */
    MODAL: 95,
    /** Active selection tools */
    TOOL: 75,
    /** Default click-to-select */
    SELECTION: 50,
    /** Camera navigation controls */
    NAVIGATION: 20,
    /** Fallback handlers */
    FALLBACK: 5,
} as const;
