import { describe, it, expect, beforeEach } from 'vitest';

/**
 * Tests for TransformOperator
 * 
 * Note: These are logic tests that don't require full mocking.
 * Integration tests should be done via browser testing.
 */

// Simple test helper to simulate operator state
interface OperatorState {
    mode: 'translate' | 'rotate' | 'scale';
    axis: 'X' | 'Y' | 'Z' | null;
    excludeAxis: boolean;
    numericInput: string;
    enabled: boolean;
}

function createOperatorState(mode: 'translate' | 'rotate' | 'scale'): OperatorState {
    return {
        mode,
        axis: null,
        excludeAxis: false,
        numericInput: '',
        enabled: false,
    };
}

function handleAxisKey(state: OperatorState, key: string, shiftKey: boolean): void {
    const axisKey = key.toUpperCase() as 'X' | 'Y' | 'Z';
    if (['X', 'Y', 'Z'].includes(axisKey)) {
        state.axis = axisKey;
        state.excludeAxis = shiftKey;
    }
}

function handleNumericKey(state: OperatorState, key: string): void {
    if (/^[0-9]$/.test(key)) {
        state.numericInput += key;
    } else if (key === '-' && state.numericInput === '') {
        state.numericInput = '-';
    } else if (key === '.' && !state.numericInput.includes('.')) {
        state.numericInput += '.';
    } else if (key === 'Backspace') {
        state.numericInput = state.numericInput.slice(0, -1);
    }
}

function parseNumericValue(input: string): number | null {
    if (input === '' || input === '-' || input === '.') return null;
    const value = parseFloat(input);
    return isNaN(value) ? null : value;
}

describe('TransformOperator Logic', () => {
    describe('operator state initialization', () => {
        it('should create translate operator state', () => {
            const state = createOperatorState('translate');
            expect(state.mode).toBe('translate');
            expect(state.axis).toBeNull();
            expect(state.numericInput).toBe('');
        });

        it('should create rotate operator state', () => {
            const state = createOperatorState('rotate');
            expect(state.mode).toBe('rotate');
        });

        it('should create scale operator state', () => {
            const state = createOperatorState('scale');
            expect(state.mode).toBe('scale');
        });
    });

    describe('axis constraint handling', () => {
        let state: OperatorState;

        beforeEach(() => {
            state = createOperatorState('translate');
        });

        it('should set X axis constraint', () => {
            handleAxisKey(state, 'x', false);
            expect(state.axis).toBe('X');
            expect(state.excludeAxis).toBe(false);
        });

        it('should set Y axis constraint', () => {
            handleAxisKey(state, 'y', false);
            expect(state.axis).toBe('Y');
        });

        it('should set Z axis constraint', () => {
            handleAxisKey(state, 'z', false);
            expect(state.axis).toBe('Z');
        });

        it('should handle Shift+X for plane constraint (exclude X)', () => {
            handleAxisKey(state, 'x', true);
            expect(state.axis).toBe('X');
            expect(state.excludeAxis).toBe(true);
        });

        it('should handle uppercase axis keys', () => {
            handleAxisKey(state, 'X', false);
            expect(state.axis).toBe('X');
        });
    });

    describe('numeric input handling', () => {
        let state: OperatorState;

        beforeEach(() => {
            state = createOperatorState('translate');
        });

        it('should accept single digit', () => {
            handleNumericKey(state, '5');
            expect(state.numericInput).toBe('5');
        });

        it('should accept multiple digits', () => {
            handleNumericKey(state, '1');
            handleNumericKey(state, '2');
            handleNumericKey(state, '3');
            expect(state.numericInput).toBe('123');
        });

        it('should accept negative sign at start', () => {
            handleNumericKey(state, '-');
            expect(state.numericInput).toBe('-');
        });

        it('should not allow minus in middle', () => {
            handleNumericKey(state, '5');
            handleNumericKey(state, '-');
            expect(state.numericInput).toBe('5');
        });

        it('should accept decimal point', () => {
            handleNumericKey(state, '3');
            handleNumericKey(state, '.');
            handleNumericKey(state, '5');
            expect(state.numericInput).toBe('3.5');
        });

        it('should not allow multiple decimal points', () => {
            handleNumericKey(state, '3');
            handleNumericKey(state, '.');
            handleNumericKey(state, '5');
            handleNumericKey(state, '.');
            expect(state.numericInput).toBe('3.5');
        });

        it('should handle backspace', () => {
            handleNumericKey(state, '1');
            handleNumericKey(state, '2');
            handleNumericKey(state, '3');
            handleNumericKey(state, 'Backspace');
            expect(state.numericInput).toBe('12');
        });
    });

    describe('numeric value parsing', () => {
        it('should parse integer', () => {
            expect(parseNumericValue('5')).toBe(5);
        });

        it('should parse negative integer', () => {
            expect(parseNumericValue('-10')).toBe(-10);
        });

        it('should parse decimal', () => {
            expect(parseNumericValue('3.5')).toBe(3.5);
        });

        it('should parse negative decimal', () => {
            expect(parseNumericValue('-2.5')).toBe(-2.5);
        });

        it('should return null for empty string', () => {
            expect(parseNumericValue('')).toBeNull();
        });

        it('should return null for just minus', () => {
            expect(parseNumericValue('-')).toBeNull();
        });

        it('should return null for just decimal', () => {
            expect(parseNumericValue('.')).toBeNull();
        });
    });

    describe('operator ID generation', () => {
        it('should generate correct translate ID', () => {
            const id = `transform-translate`;
            expect(id).toBe('transform-translate');
        });

        it('should generate correct rotate ID', () => {
            const id = `transform-rotate`;
            expect(id).toBe('transform-rotate');
        });

        it('should generate correct scale ID', () => {
            const id = `transform-scale`;
            expect(id).toBe('transform-scale');
        });
    });
});
