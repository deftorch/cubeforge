import type { IInputHandler, InputHandlerResult } from '@/core/interfaces';
import { InputPriority } from '@/core/interfaces';
import type { KeyboardManager } from './KeyboardManager';

/**
 * KeyboardHandler - Bridge between KeyboardManager and InputDispatcher
 * 
 * This handler integrates the shortcut-based KeyboardManager into the
 * priority-based InputDispatcher system. It has the lowest priority so
 * that modal operators and tools can intercept keyboard events first.
 * 
 * Priority: FALLBACK (5) - Only processes keyboard events if no higher
 * priority handler consumed them.
 */
export class KeyboardHandler implements IInputHandler {
    readonly id = 'keyboard-shortcuts';
    readonly priority = InputPriority.FALLBACK;
    enabled = true;

    private keyboardManager: KeyboardManager;

    constructor(keyboardManager: KeyboardManager) {
        this.keyboardManager = keyboardManager;
    }

    /**
     * Handle keyboard events by delegating to KeyboardManager
     * 
     * @returns true if a shortcut was executed (event consumed)
     */
    onKeyDown(event: KeyboardEvent): InputHandlerResult {
        if (!this.enabled) return false;

        // Delegate to KeyboardManager
        const handled = this.keyboardManager.handleEvent(event);
        return handled;
    }

    /**
     * Handle key up - not used for shortcuts but available for future use
     */
    onKeyUp(_event: KeyboardEvent): InputHandlerResult {
        return false;
    }

    /**
     * Get the underlying KeyboardManager
     */
    getKeyboardManager(): KeyboardManager {
        return this.keyboardManager;
    }

    dispose(): void {
        // KeyboardManager lifecycle is managed separately
    }
}
