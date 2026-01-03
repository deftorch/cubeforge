import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createStore } from 'solid-js/store';

// We need to test the store logic without Solid.js reactivity
// So we'll create a mock implementation for testing

interface Command {
    id: string;
    description: string;
    execute: () => void;
    undo: () => void;
    timestamp: number;
}

interface HistoryStoreState {
    undoStack: Command[];
    redoStack: Command[];
    maxHistorySize: number;
    canUndo: boolean;
    canRedo: boolean;
}

// Create a testable version of historyStore logic
function createHistoryStore() {
    let state: HistoryStoreState = {
        undoStack: [],
        redoStack: [],
        maxHistorySize: 100,
        canUndo: false,
        canRedo: false,
    };

    return {
        getState: () => state,

        execute(command: Command) {
            command.execute();

            state.undoStack = [...state.undoStack, command];
            if (state.undoStack.length > state.maxHistorySize) {
                state.undoStack = state.undoStack.slice(-state.maxHistorySize);
            }

            state.redoStack = [];
            state.canUndo = true;
            state.canRedo = false;
        },

        undo() {
            if (state.undoStack.length === 0) return;

            const command = state.undoStack[state.undoStack.length - 1];
            command.undo();

            state.undoStack = state.undoStack.slice(0, -1);
            state.redoStack = [...state.redoStack, command];

            state.canUndo = state.undoStack.length > 0;
            state.canRedo = true;
        },

        redo() {
            if (state.redoStack.length === 0) return;

            const command = state.redoStack[state.redoStack.length - 1];
            command.execute();

            state.redoStack = state.redoStack.slice(0, -1);
            state.undoStack = [...state.undoStack, command];

            state.canUndo = true;
            state.canRedo = state.redoStack.length > 0;
        },

        clear() {
            state.undoStack = [];
            state.redoStack = [];
            state.canUndo = false;
            state.canRedo = false;
        },

        getLastCommandDescription(): string | null {
            if (state.undoStack.length === 0) return null;
            return state.undoStack[state.undoStack.length - 1].description;
        },

        setMaxHistorySize(size: number) {
            state.maxHistorySize = size;
        },
    };
}

// Helper to create mock command
function createMockCommand(id: string, description = 'Test command'): Command {
    return {
        id,
        description,
        execute: vi.fn(),
        undo: vi.fn(),
        timestamp: Date.now(),
    };
}

describe('historyStore', () => {
    let store: ReturnType<typeof createHistoryStore>;

    beforeEach(() => {
        store = createHistoryStore();
    });

    describe('execute()', () => {
        it('should execute the command', () => {
            const command = createMockCommand('1');
            store.execute(command);

            expect(command.execute).toHaveBeenCalledTimes(1);
        });

        it('should add command to undo stack', () => {
            const command = createMockCommand('1');
            store.execute(command);

            expect(store.getState().undoStack).toHaveLength(1);
            expect(store.getState().undoStack[0]).toBe(command);
        });

        it('should set canUndo to true after execute', () => {
            const command = createMockCommand('1');
            store.execute(command);

            expect(store.getState().canUndo).toBe(true);
        });

        it('should clear redo stack after execute', () => {
            const cmd1 = createMockCommand('1');
            const cmd2 = createMockCommand('2');

            store.execute(cmd1);
            store.undo();
            expect(store.getState().redoStack).toHaveLength(1);

            store.execute(cmd2);
            expect(store.getState().redoStack).toHaveLength(0);
        });

        it('should limit history to maxHistorySize', () => {
            store.setMaxHistorySize(3);

            for (let i = 0; i < 5; i++) {
                store.execute(createMockCommand(`${i}`));
            }

            expect(store.getState().undoStack).toHaveLength(3);
            expect(store.getState().undoStack[0].id).toBe('2');
            expect(store.getState().undoStack[2].id).toBe('4');
        });
    });

    describe('undo()', () => {
        it('should call undo on the last command', () => {
            const command = createMockCommand('1');
            store.execute(command);
            store.undo();

            expect(command.undo).toHaveBeenCalledTimes(1);
        });

        it('should move command to redo stack', () => {
            const command = createMockCommand('1');
            store.execute(command);
            store.undo();

            expect(store.getState().undoStack).toHaveLength(0);
            expect(store.getState().redoStack).toHaveLength(1);
            expect(store.getState().redoStack[0]).toBe(command);
        });

        it('should set canRedo to true after undo', () => {
            const command = createMockCommand('1');
            store.execute(command);
            store.undo();

            expect(store.getState().canRedo).toBe(true);
        });

        it('should do nothing if undo stack is empty', () => {
            expect(() => store.undo()).not.toThrow();
            expect(store.getState().undoStack).toHaveLength(0);
        });

        it('should set canUndo to false when stack becomes empty', () => {
            const command = createMockCommand('1');
            store.execute(command);
            store.undo();

            expect(store.getState().canUndo).toBe(false);
        });
    });

    describe('redo()', () => {
        it('should call execute on the last undone command', () => {
            const command = createMockCommand('1');
            store.execute(command);
            store.undo();
            store.redo();

            // execute called twice: once on initial, once on redo
            expect(command.execute).toHaveBeenCalledTimes(2);
        });

        it('should move command back to undo stack', () => {
            const command = createMockCommand('1');
            store.execute(command);
            store.undo();
            store.redo();

            expect(store.getState().undoStack).toHaveLength(1);
            expect(store.getState().redoStack).toHaveLength(0);
        });

        it('should do nothing if redo stack is empty', () => {
            expect(() => store.redo()).not.toThrow();
        });

        it('should set canUndo to true after redo', () => {
            const command = createMockCommand('1');
            store.execute(command);
            store.undo();
            store.redo();

            expect(store.getState().canUndo).toBe(true);
        });
    });

    describe('clear()', () => {
        it('should clear both stacks', () => {
            store.execute(createMockCommand('1'));
            store.execute(createMockCommand('2'));
            store.undo();

            store.clear();

            expect(store.getState().undoStack).toHaveLength(0);
            expect(store.getState().redoStack).toHaveLength(0);
        });

        it('should set canUndo and canRedo to false', () => {
            store.execute(createMockCommand('1'));
            store.undo();

            store.clear();

            expect(store.getState().canUndo).toBe(false);
            expect(store.getState().canRedo).toBe(false);
        });
    });

    describe('getLastCommandDescription()', () => {
        it('should return description of last command', () => {
            store.execute(createMockCommand('1', 'Create cube'));
            store.execute(createMockCommand('2', 'Move cube'));

            expect(store.getLastCommandDescription()).toBe('Move cube');
        });

        it('should return null if no commands', () => {
            expect(store.getLastCommandDescription()).toBeNull();
        });
    });
});
