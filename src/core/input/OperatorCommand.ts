import type { IOperator } from '@/core/interfaces';
import type { Command } from '@/stores/historyStore';

/**
 * OperatorUndoData - Captures state for undo/redo
 */
export interface OperatorUndoData {
    operatorId: string;
    operatorName: string;
    data: unknown;
    timestamp: number;
}

/**
 * createOperatorCommand - Creates a Command from an operator execution
 * 
 * Bridges the IOperator interface with the historyStore Command pattern.
 * Captures undo data from the operator and creates execute/undo functions.
 * 
 * @example
 * ```typescript
 * const command = createOperatorCommand(boxSelectOperator, undoData);
 * historyActions.execute(command);
 * ```
 */
export function createOperatorCommand(
    operator: IOperator,
    undoData: OperatorUndoData
): Command {
    return {
        id: `${operator.id}-${undoData.timestamp}`,
        description: operator.operatorName,
        timestamp: undoData.timestamp,
        execute: () => {
            // Re-execute is handled by restoring forward state
            // For most operators, this is a no-op since we're restoring state
            console.log(`Re-executing: ${operator.operatorName}`);
        },
        undo: () => {
            if (operator.restoreFromUndo) {
                operator.restoreFromUndo(undoData.data);
            } else {
                console.warn(
                    `Operator "${operator.id}" does not implement restoreFromUndo`
                );
            }
        },
    };
}

/**
 * captureOperatorUndoData - Captures undo data from an operator
 * 
 * @returns OperatorUndoData or null if operator doesn't support undo
 */
export function captureOperatorUndoData(operator: IOperator): OperatorUndoData | null {
    if (!operator.getUndoData) {
        return null;
    }

    return {
        operatorId: operator.id,
        operatorName: operator.operatorName,
        data: operator.getUndoData(),
        timestamp: Date.now(),
    };
}
