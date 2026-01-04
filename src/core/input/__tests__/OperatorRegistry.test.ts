import { describe, it, expect, beforeEach, vi } from 'vitest';

/**
 * Tests for OperatorRegistry
 * 
 * Tests operator registration, invocation, and lifecycle management.
 */

type OperatorResult = 'FINISHED' | 'CANCELLED' | 'RUNNING_MODAL' | 'PASS_THROUGH';

interface IOperator {
    readonly id: string;
    enabled: boolean;
    invoke(): OperatorResult;
    execute(): OperatorResult;
    cancel(): void;
}

class TestOperatorRegistry {
    private operators: Map<string, IOperator> = new Map();
    private activeOperator: IOperator | null = null;

    register(operator: IOperator): boolean {
        if (this.operators.has(operator.id)) {
            return false;
        }
        this.operators.set(operator.id, operator);
        return true;
    }

    unregister(operatorId: string): boolean {
        if (this.activeOperator?.id === operatorId) {
            this.cancel();
        }
        return this.operators.delete(operatorId);
    }

    get(operatorId: string): IOperator | undefined {
        return this.operators.get(operatorId);
    }

    invoke(operatorId: string): OperatorResult {
        const operator = this.operators.get(operatorId);
        if (!operator) {
            return 'CANCELLED';
        }

        // Cancel any active operator first
        if (this.activeOperator && this.activeOperator.id !== operatorId) {
            this.cancel();
        }

        const result = operator.invoke();

        if (result === 'RUNNING_MODAL') {
            this.activeOperator = operator;
        }

        return result;
    }

    execute(): OperatorResult {
        if (!this.activeOperator) {
            return 'CANCELLED';
        }

        const result = this.activeOperator.execute();
        this.activeOperator = null;
        return result;
    }

    cancel(): void {
        if (this.activeOperator) {
            this.activeOperator.cancel();
            this.activeOperator = null;
        }
    }

    getActiveOperator(): IOperator | null {
        return this.activeOperator;
    }

    hasOperator(operatorId: string): boolean {
        return this.operators.has(operatorId);
    }

    getOperatorCount(): number {
        return this.operators.size;
    }

    clear(): void {
        this.cancel();
        this.operators.clear();
    }
}

// Mock operator factory
function createMockOperator(id: string, invokeResult: OperatorResult = 'RUNNING_MODAL'): IOperator {
    return {
        id,
        enabled: false,
        invoke: vi.fn(() => invokeResult),
        execute: vi.fn(() => 'FINISHED'),
        cancel: vi.fn(),
    };
}

describe('OperatorRegistry', () => {
    let registry: TestOperatorRegistry;

    beforeEach(() => {
        registry = new TestOperatorRegistry();
    });

    describe('register', () => {
        it('should register a new operator', () => {
            const op = createMockOperator('test-op');
            const result = registry.register(op);

            expect(result).toBe(true);
            expect(registry.hasOperator('test-op')).toBe(true);
        });

        it('should reject duplicate operator IDs', () => {
            const op1 = createMockOperator('test-op');
            const op2 = createMockOperator('test-op');

            registry.register(op1);
            const result = registry.register(op2);

            expect(result).toBe(false);
            expect(registry.getOperatorCount()).toBe(1);
        });
    });

    describe('unregister', () => {
        it('should remove operator', () => {
            const op = createMockOperator('test-op');
            registry.register(op);

            const result = registry.unregister('test-op');

            expect(result).toBe(true);
            expect(registry.hasOperator('test-op')).toBe(false);
        });

        it('should cancel active operator when unregistering', () => {
            const op = createMockOperator('test-op');
            registry.register(op);
            registry.invoke('test-op');

            registry.unregister('test-op');

            expect(op.cancel).toHaveBeenCalled();
            expect(registry.getActiveOperator()).toBeNull();
        });
    });

    describe('invoke', () => {
        it('should invoke operator and return result', () => {
            const op = createMockOperator('test-op');
            registry.register(op);

            const result = registry.invoke('test-op');

            expect(result).toBe('RUNNING_MODAL');
            expect(op.invoke).toHaveBeenCalled();
        });

        it('should set active operator for modal result', () => {
            const op = createMockOperator('test-op', 'RUNNING_MODAL');
            registry.register(op);

            registry.invoke('test-op');

            expect(registry.getActiveOperator()).toBe(op);
        });

        it('should not set active operator for FINISHED result', () => {
            const op = createMockOperator('test-op', 'FINISHED');
            registry.register(op);

            registry.invoke('test-op');

            expect(registry.getActiveOperator()).toBeNull();
        });

        it('should return CANCELLED for unknown operator', () => {
            const result = registry.invoke('unknown-op');
            expect(result).toBe('CANCELLED');
        });

        it('should cancel previous active operator', () => {
            const op1 = createMockOperator('op1');
            const op2 = createMockOperator('op2');
            registry.register(op1);
            registry.register(op2);

            registry.invoke('op1');
            registry.invoke('op2');

            expect(op1.cancel).toHaveBeenCalled();
            expect(registry.getActiveOperator()).toBe(op2);
        });
    });

    describe('execute', () => {
        it('should execute active operator', () => {
            const op = createMockOperator('test-op');
            registry.register(op);
            registry.invoke('test-op');

            const result = registry.execute();

            expect(result).toBe('FINISHED');
            expect(op.execute).toHaveBeenCalled();
            expect(registry.getActiveOperator()).toBeNull();
        });

        it('should return CANCELLED when no active operator', () => {
            const result = registry.execute();
            expect(result).toBe('CANCELLED');
        });
    });

    describe('cancel', () => {
        it('should cancel active operator', () => {
            const op = createMockOperator('test-op');
            registry.register(op);
            registry.invoke('test-op');

            registry.cancel();

            expect(op.cancel).toHaveBeenCalled();
            expect(registry.getActiveOperator()).toBeNull();
        });

        it('should do nothing when no active operator', () => {
            expect(() => registry.cancel()).not.toThrow();
        });
    });

    describe('clear', () => {
        it('should remove all operators', () => {
            registry.register(createMockOperator('op1'));
            registry.register(createMockOperator('op2'));
            registry.register(createMockOperator('op3'));

            registry.clear();

            expect(registry.getOperatorCount()).toBe(0);
        });

        it('should cancel active operator', () => {
            const op = createMockOperator('test-op');
            registry.register(op);
            registry.invoke('test-op');

            registry.clear();

            expect(op.cancel).toHaveBeenCalled();
        });
    });
});
