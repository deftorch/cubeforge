import { createStore } from 'solid-js/store';

/**
 * Command interface for undo/redo
 */
export interface Command {
    id: string;
    description: string;
    execute: () => void;
    undo: () => void;
    timestamp: number;
}

/**
 * History Store - Manages undo/redo stack
 */
export interface HistoryStoreState {
    undoStack: Command[];
    redoStack: Command[];
    maxHistorySize: number;
    canUndo: boolean;
    canRedo: boolean;
}

const [historyStore, setHistoryStore] = createStore<HistoryStoreState>({
    undoStack: [],
    redoStack: [],
    maxHistorySize: 100,
    canUndo: false,
    canRedo: false,
});

// History Actions
export const historyActions = {
    /**
     * Execute and record a command
     */
    execute(command: Command) {
        command.execute();

        setHistoryStore('undoStack', prev => {
            const next = [...prev, command];
            // Limit history size
            if (next.length > historyStore.maxHistorySize) {
                return next.slice(-historyStore.maxHistorySize);
            }
            return next;
        });

        // Clear redo stack
        setHistoryStore('redoStack', []);

        // Update flags
        setHistoryStore('canUndo', true);
        setHistoryStore('canRedo', false);
    },

    /**
     * Undo last command
     */
    undo() {
        if (historyStore.undoStack.length === 0) return;

        const command = historyStore.undoStack[historyStore.undoStack.length - 1];
        command.undo();

        // Move to redo stack
        setHistoryStore('undoStack', prev => prev.slice(0, -1));
        setHistoryStore('redoStack', prev => [...prev, command]);

        // Update flags
        setHistoryStore('canUndo', historyStore.undoStack.length > 1);
        setHistoryStore('canRedo', true);
    },

    /**
     * Redo last undone command
     */
    redo() {
        if (historyStore.redoStack.length === 0) return;

        const command = historyStore.redoStack[historyStore.redoStack.length - 1];
        command.execute();

        // Move back to undo stack
        setHistoryStore('redoStack', prev => prev.slice(0, -1));
        setHistoryStore('undoStack', prev => [...prev, command]);

        // Update flags
        setHistoryStore('canUndo', true);
        setHistoryStore('canRedo', historyStore.redoStack.length > 1);
    },

    /**
     * Clear all history
     */
    clear() {
        setHistoryStore('undoStack', []);
        setHistoryStore('redoStack', []);
        setHistoryStore('canUndo', false);
        setHistoryStore('canRedo', false);
    },

    /**
     * Get last command description
     */
    getLastCommandDescription(): string | null {
        const stack = historyStore.undoStack;
        if (stack.length === 0) return null;
        return stack[stack.length - 1].description;
    },
};

export { historyStore, setHistoryStore };
