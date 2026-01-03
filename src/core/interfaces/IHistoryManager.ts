import type { Command } from '@/stores/historyStore';

// Re-export Command as HistoryCommand for interface naming consistency
export type HistoryCommand = Command;

/**
 * Interface for History operations
 */
export interface IHistoryManager {
    execute(command: HistoryCommand): void;
    undo(): void;
    redo(): void;
    canUndo(): boolean;
    canRedo(): boolean;
    clear(): void;
}
