import type { IOperator, OperatorResult } from '@/core/interfaces';
import { historyActions } from '@/stores/historyStore';
import { createOperatorCommand, captureOperatorUndoData } from './OperatorCommand';
import { InputLogger, type ComponentLogger } from './InputLogger';

/**
 * OperatorRegistry - Central registry for all operators
 * 
 * Manages operator registration, lifecycle, and provides a way to
 * invoke operators by ID or type.
 * 
 * @example
 * ```typescript
 * const registry = getOperatorRegistry();
 * 
 * // Register an operator
 * registry.register(boxSelectOperator);
 * 
 * // Invoke by ID
 * registry.invoke('box-select');
 * 
 * // Get active operator
 * const active = registry.getActiveOperator();
 * ```
 */
export class OperatorRegistry {
    private operators: Map<string, IOperator> = new Map();
    private activeOperator: IOperator | null = null;
    private recordHistory = true;  // Whether to record executed operators to history
    private logger: ComponentLogger = InputLogger.create('OperatorRegistry');

    /**
     * Enable or disable history recording
     */
    setRecordHistory(enabled: boolean): void {
        this.recordHistory = enabled;
    }

    /**
     * Register an operator
     */
    register(operator: IOperator): void {
        if (this.operators.has(operator.id)) {
            this.logger.warn('Operator already registered', { operatorId: operator.id });
            return;
        }
        this.operators.set(operator.id, operator);
        this.logger.debug('Operator registered', { operatorId: operator.id });
    }

    /**
     * Unregister an operator
     */
    unregister(operatorId: string): void {
        // Cancel if this is the active operator
        if (this.activeOperator?.id === operatorId) {
            this.cancel();
        }
        this.operators.delete(operatorId);
    }

    /**
     * Get an operator by ID
     */
    get(operatorId: string): IOperator | undefined {
        return this.operators.get(operatorId);
    }

    /**
     * Get all registered operators
     */
    getAll(): IOperator[] {
        return Array.from(this.operators.values());
    }

    /**
     * Invoke an operator by ID
     * 
     * @returns The result of invoke(), or CANCELLED if not found
     */
    invoke(operatorId: string): OperatorResult {
        const operator = this.operators.get(operatorId);
        if (!operator) {
            console.warn(`OperatorRegistry: Operator "${operatorId}" not found`);
            return 'CANCELLED';
        }

        // Cancel any currently active modal operator
        if (this.activeOperator && this.activeOperator.id !== operatorId) {
            this.cancel();
        }

        this.logger.info(`Invoking operator: ${operatorId}`);
        const result = operator.invoke();

        if (result === 'RUNNING_MODAL') {
            this.activeOperator = operator;
            this.logger.debug(`Operator "${operatorId}" running modally`);
        } else if (result === 'FINISHED') {
            // Instant operator - execute immediately
            operator.execute();
            this.logger.debug(`Operator "${operatorId}" finished immediately`);
        }

        return result;
    }

    /**
     * Execute the active operator
     * If recordHistory is enabled, records a Command to historyStore
     * 
     * @returns FINISHED/CANCELLED, or CANCELLED if no active operator
     */
    execute(): OperatorResult {
        if (!this.activeOperator) {
            return 'CANCELLED';
        }

        const operatorId = this.activeOperator.id;

        // Capture undo data BEFORE executing
        const undoData = this.recordHistory
            ? captureOperatorUndoData(this.activeOperator)
            : null;

        const result = this.activeOperator.execute();

        // Record to history if execution was successful
        if (result === 'FINISHED' && undoData && this.recordHistory) {
            const command = createOperatorCommand(this.activeOperator, undoData);
            historyActions.execute(command);
        }

        if (result === 'FINISHED' || result === 'CANCELLED') {
            this.activeOperator = null;
        }

        this.logger.info(`Executed operator: ${operatorId}`, { result });
        return result;
    }

    /**
     * Cancel the active operator
     */
    cancel(): void {
        if (!this.activeOperator) return;

        const operatorId = this.activeOperator.id;
        this.activeOperator.cancel();
        this.activeOperator = null;
        this.logger.info(`Cancelled operator: ${operatorId}`);
    }

    /**
     * Get the currently active operator
     */
    getActiveOperator(): IOperator | null {
        return this.activeOperator;
    }

    /**
     * Check if there's an active modal operator
     */
    hasActiveOperator(): boolean {
        return this.activeOperator !== null;
    }

    /**
     * Dispose and cleanup
     */
    dispose(): void {
        this.cancel();
        this.operators.clear();
    }
}

// Singleton instance
let operatorRegistryInstance: OperatorRegistry | null = null;

export function getOperatorRegistry(): OperatorRegistry {
    if (!operatorRegistryInstance) {
        operatorRegistryInstance = new OperatorRegistry();
    }
    return operatorRegistryInstance;
}

/**
 * Reset the singleton (for testing)
 */
export function resetOperatorRegistry(): void {
    operatorRegistryInstance?.dispose();
    operatorRegistryInstance = null;
}
