/**
 * InputEventResult - Enhanced return value for input handlers
 * 
 * Provides more expressive control over event propagation compared to boolean.
 * 
 * - CONSUMED: Event was fully handled, stop propagation to other handlers
 * - PASS_THROUGH: Event was processed but should continue to other handlers
 * - IGNORED: Handler didn't process this event at all
 */
export type InputEventResult = 'CONSUMED' | 'PASS_THROUGH' | 'IGNORED';

/**
 * Helper to check if result should stop propagation
 */
export function isEventConsumed(result: InputEventResult | boolean): boolean {
    if (typeof result === 'boolean') return result;
    return result === 'CONSUMED';
}

/**
 * Helper to convert boolean to InputEventResult
 */
export function toEventResult(consumed: boolean): InputEventResult {
    return consumed ? 'CONSUMED' : 'IGNORED';
}

/**
 * Input handler result type - supports both boolean (legacy) and new result type
 */
export type InputHandlerResult = boolean | InputEventResult;

/**
 * IInputHandler - Interface for all input handlers in the Input Dispatcher system
 * 
 * Handlers are processed in priority order (highest first).
 * Return values:
 * - `true` or `'CONSUMED'`: Stop propagation to other handlers
 * - `false` or `'IGNORED'`: Handler didn't process, continue to next
 * - `'PASS_THROUGH'`: Handler processed but allows others to also handle
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
    // Return true/'CONSUMED' to stop propagation
    // Return 'PASS_THROUGH' to process but allow others
    // Return false/'IGNORED' if not handled
    // ============================================

    onMouseDown?(event: MouseEvent): InputHandlerResult;
    onMouseMove?(event: MouseEvent): InputHandlerResult;
    onMouseUp?(event: MouseEvent): InputHandlerResult;
    onClick?(event: MouseEvent): InputHandlerResult;
    onDoubleClick?(event: MouseEvent): InputHandlerResult;
    onWheel?(event: WheelEvent): InputHandlerResult;
    onContextMenu?(event: MouseEvent): InputHandlerResult;

    // ============================================
    // KEYBOARD EVENTS
    // ============================================

    onKeyDown?(event: KeyboardEvent): InputHandlerResult;
    onKeyUp?(event: KeyboardEvent): InputHandlerResult;

    // ============================================
    // DRAG EVENTS
    // ============================================

    onDragEnter?(event: DragEvent): InputHandlerResult;
    onDragOver?(event: DragEvent): InputHandlerResult;
    onDragLeave?(event: DragEvent): InputHandlerResult;
    onDrop?(event: DragEvent): InputHandlerResult;

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

