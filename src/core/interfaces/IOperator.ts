import type { IInputHandler, InputHandlerResult } from './IInputHandler';

/**
 * OperatorResult - Result of operator lifecycle methods
 * 
 * Based on Blender's operator return values:
 * - FINISHED: Operator completed successfully
 * - CANCELLED: Operator was cancelled/aborted
 * - RUNNING_MODAL: Operator is now in modal state, receiving events
 */
export type OperatorResult = 'FINISHED' | 'CANCELLED' | 'RUNNING_MODAL';

/**
 * OperatorType - Classification of operator behavior
 * 
 * - INSTANT: Execute immediately and finish (e.g., delete, duplicate)
 * - MODAL: Runs continuously, processing events (e.g., transform, box select)
 * - GESTURE: Recognizes a specific input pattern (e.g., draw tool)
 */
export type OperatorType = 'INSTANT' | 'MODAL' | 'GESTURE';

/**
 * IOperator - Interface for operators with standardized lifecycle
 * 
 * Operators extend IInputHandler with additional lifecycle methods:
 * - invoke(): Called when operator is activated
 * - execute(): Performs the actual operation
 * - cancel(): Called when operation is cancelled
 * 
 * This pattern is inspired by Blender's operator system.
 * 
 * @example
 * ```typescript
 * class BoxSelectOperator implements IOperator {
 *   invoke(): OperatorResult {
 *     this.startSelection();
 *     return 'RUNNING_MODAL'; // Enter modal state
 *   }
 *   
 *   execute(): OperatorResult {
 *     this.applySelection();
 *     return 'FINISHED';
 *   }
 *   
 *   cancel(): void {
 *     this.clearSelection();
 *   }
 * }
 * ```
 */
export interface IOperator extends IInputHandler {
    /** Classification of this operator's behavior */
    readonly operatorType: OperatorType;

    /** Human-readable name for UI and logging */
    readonly operatorName: string;

    /**
     * Called when the operator is activated (e.g., via shortcut or menu)
     * 
     * @returns 
     * - RUNNING_MODAL: Operator is now active and receiving events
     * - FINISHED: Operator completed immediately (instant operators)
     * - CANCELLED: Operator could not start
     */
    invoke(): OperatorResult;

    /**
     * Performs the actual operation
     * Called either immediately (instant) or when modal operation completes
     * 
     * @returns FINISHED or CANCELLED
     */
    execute(): OperatorResult;

    /**
     * Cancels the operation and cleans up
     * Called when user presses Escape or operation is aborted
     */
    cancel(): void;

    /**
     * Optional: Get data for undo system
     * Called before execute() to capture state for potential undo
     */
    getUndoData?(): unknown;

    /**
     * Optional: Restore state from undo data
     * Called when user undoes this operation
     */
    restoreFromUndo?(data: unknown): void;
}

/**
 * Helper to check if a handler is an operator
 */
export function isOperator(handler: IInputHandler): handler is IOperator {
    return 'operatorType' in handler &&
        'invoke' in handler &&
        'execute' in handler &&
        'cancel' in handler;
}
