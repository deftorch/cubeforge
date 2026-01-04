/**
 * Keyboard shortcut configuration
 */
export interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    action: () => void;
    description: string;
    /** If true, shortcut works even in input fields */
    allowInInput?: boolean;
}

/**
 * KeyboardManager - Centralized keyboard shortcut handling
 * 
 * Extracts keyboard handling from App.tsx for Single Responsibility.
 * All shortcuts should be registered here, not inline in components.
 */
export class KeyboardManager {
    private shortcuts: Map<string, ShortcutConfig> = new Map();
    private enabled = true;
    private boundHandler: ((event: KeyboardEvent) => void) | null = null;

    /**
     * Generate unique key for shortcut
     */
    private getShortcutKey(config: Partial<Pick<ShortcutConfig, 'key' | 'ctrl' | 'shift' | 'alt' | 'meta'>>): string {
        const parts: string[] = [];
        if (config.ctrl) parts.push('ctrl');
        if (config.shift) parts.push('shift');
        if (config.alt) parts.push('alt');
        if (config.meta) parts.push('meta');
        parts.push(config.key?.toLowerCase() ?? '');
        return parts.join('+');
    }

    /**
     * Register a keyboard shortcut
     */
    register(config: ShortcutConfig): void {
        const key = this.getShortcutKey(config);
        this.shortcuts.set(key, config);
    }

    /**
     * Unregister a keyboard shortcut
     */
    unregister(shortcut: Pick<ShortcutConfig, 'key' | 'ctrl' | 'shift' | 'alt' | 'meta'>): void {
        const key = this.getShortcutKey(shortcut);
        this.shortcuts.delete(key);
    }

    /**
     * Enable/disable all shortcuts
     */
    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    /**
     * Handle keyboard event - can be called directly or via InputDispatcher
     * 
     * @param event - The keyboard event to handle
     * @returns true if the event was handled (shortcut executed), false otherwise
     */
    public handleEvent(event: KeyboardEvent): boolean {
        if (!this.enabled) return false;

        // Check if typing in input field
        const target = event.target as HTMLElement;
        const isInInput = target.tagName === 'INPUT' ||
            target.tagName === 'TEXTAREA' ||
            target.isContentEditable;

        // Build shortcut key from event
        const shortcutKey = this.getShortcutKey({
            key: event.key,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey,
        });

        const config = this.shortcuts.get(shortcutKey);
        if (!config) return false;

        // Skip if in input field and not allowed
        if (isInInput && !config.allowInInput) return false;

        event.preventDefault();

        try {
            config.action();
            return true; // Event was handled
        } catch (error) {
            console.error(`Error executing shortcut "${shortcutKey}":`, error);
            return false;
        }
    }

    /**
     * Legacy handler for direct window attachment
     * @deprecated Use handleEvent() via InputDispatcher instead
     */
    private handleKeyDown = (event: KeyboardEvent): void => {
        this.handleEvent(event);
    };

    /**
     * Attach to window
     */
    attach(): void {
        if (this.boundHandler) return;

        this.boundHandler = this.handleKeyDown;
        window.addEventListener('keydown', this.boundHandler);
    }

    /**
     * Detach from window
     */
    detach(): void {
        if (this.boundHandler) {
            window.removeEventListener('keydown', this.boundHandler);
            this.boundHandler = null;
        }
    }

    /**
     * Get all registered shortcuts (for help display)
     */
    getAllShortcuts(): ShortcutConfig[] {
        return Array.from(this.shortcuts.values());
    }

    /**
     * Clear all shortcuts
     */
    clear(): void {
        this.shortcuts.clear();
    }
}

// Singleton instance
let keyboardManagerInstance: KeyboardManager | null = null;

export function getKeyboardManager(): KeyboardManager {
    if (!keyboardManagerInstance) {
        keyboardManagerInstance = new KeyboardManager();
    }
    return keyboardManagerInstance;
}
