import type { ShortcutConfig } from './KeyboardManager';
import { getKeyboardManager } from './KeyboardManager';
import { InputLogger, type ComponentLogger } from './InputLogger';

/**
 * KeyBinding - Separates key combination from action
 * 
 * Unlike ShortcutConfig which binds key+action together,
 * KeyBinding allows the same action to be rebound to different keys.
 */
export interface KeyBinding {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
}

/**
 * KeymapEntry - An action with its default and user-customized binding
 */
export interface KeymapEntry {
    /** Unique action identifier (e.g., 'delete', 'undo', 'box-select') */
    actionId: string;
    /** Human-readable description */
    description: string;
    /** Category for UI grouping */
    category: 'edit' | 'view' | 'selection' | 'tools' | 'transform' | 'general';
    /** Default key binding */
    defaultBinding: KeyBinding;
    /** User-customized binding (overrides default) */
    userBinding?: KeyBinding;
    /** The action to execute */
    action: () => void;
    /** Whether to allow in input fields */
    allowInInput?: boolean;
}

/**
 * KeymapConfig - Serializable user keybinding preferences
 */
export interface KeymapConfig {
    version: number;
    bindings: Record<string, KeyBinding>;  // actionId -> KeyBinding
}

const KEYMAP_STORAGE_KEY = 'cubeforge-keybindings';
const KEYMAP_VERSION = 1;

/**
 * KeymapManager - Manages customizable keybindings
 * 
 * Provides:
 * - Default keybindings registration
 * - User rebinding at runtime
 * - Persistence to localStorage
 * - Conflict detection
 * 
 * @example
 * ```typescript
 * const keymap = getKeymapManager();
 * 
 * // Register actions with defaults
 * keymap.registerAction({
 *   actionId: 'delete',
 *   description: 'Delete selected',
 *   category: 'edit',
 *   defaultBinding: { key: 'Delete' },
 *   action: () => deleteSelected()
 * });
 * 
 * // User rebinds to backspace
 * keymap.rebind('delete', { key: 'Backspace' });
 * ```
 */
export class KeymapManager {
    private entries: Map<string, KeymapEntry> = new Map();
    private initialized = false;
    private logger: ComponentLogger = InputLogger.create('KeymapManager');

    /**
     * Register an action with its default keybinding
     */
    registerAction(entry: KeymapEntry): void {
        if (this.entries.has(entry.actionId)) {
            this.logger.warn('Action already registered', { actionId: entry.actionId });
            return;
        }
        this.entries.set(entry.actionId, entry);
        this.logger.debug('Action registered', { actionId: entry.actionId, category: entry.category });
    }

    /**
     * Unregister an action
     */
    unregisterAction(actionId: string): void {
        this.entries.delete(actionId);
    }

    /**
     * Rebind an action to a new key combination
     */
    rebind(actionId: string, binding: KeyBinding): boolean {
        const entry = this.entries.get(actionId);
        if (!entry) {
            console.warn(`KeymapManager: Action "${actionId}" not found`);
            return false;
        }

        // Check for conflicts
        const conflict = this.findConflict(binding, actionId);
        if (conflict) {
            console.warn(
                `KeymapManager: Key conflict with "${conflict.actionId}" (${conflict.description})`
            );
            return false;
        }

        entry.userBinding = binding;
        this.saveToStorage();
        this.syncToKeyboardManager();
        return true;
    }

    /**
     * Reset an action to its default binding
     */
    resetToDefault(actionId: string): void {
        const entry = this.entries.get(actionId);
        if (!entry) return;

        delete entry.userBinding;
        this.saveToStorage();
        this.syncToKeyboardManager();
    }

    /**
     * Reset all bindings to defaults
     */
    resetAllToDefaults(): void {
        for (const entry of this.entries.values()) {
            delete entry.userBinding;
        }
        this.saveToStorage();
        this.syncToKeyboardManager();
    }

    /**
     * Get effective binding for an action (user or default)
     */
    getBinding(actionId: string): KeyBinding | undefined {
        const entry = this.entries.get(actionId);
        if (!entry) return undefined;
        return entry.userBinding ?? entry.defaultBinding;
    }

    /**
     * Get all registered actions (for settings UI)
     */
    getAllActions(): KeymapEntry[] {
        return Array.from(this.entries.values());
    }

    /**
     * Get actions by category
     */
    getActionsByCategory(category: KeymapEntry['category']): KeymapEntry[] {
        return Array.from(this.entries.values()).filter(e => e.category === category);
    }

    /**
     * Find conflicting action for a binding
     */
    findConflict(binding: KeyBinding, excludeActionId?: string): KeymapEntry | undefined {
        const bindingStr = this.bindingToString(binding);

        for (const entry of this.entries.values()) {
            if (entry.actionId === excludeActionId) continue;

            const effectiveBinding = entry.userBinding ?? entry.defaultBinding;
            if (this.bindingToString(effectiveBinding) === bindingStr) {
                return entry;
            }
        }
        return undefined;
    }

    /**
     * Convert binding to display string (e.g., "Ctrl+Shift+D")
     */
    bindingToDisplayString(binding: KeyBinding): string {
        const parts: string[] = [];
        if (binding.ctrl) parts.push('Ctrl');
        if (binding.shift) parts.push('Shift');
        if (binding.alt) parts.push('Alt');
        if (binding.meta) parts.push('Meta');
        parts.push(binding.key.length === 1 ? binding.key.toUpperCase() : binding.key);
        return parts.join('+');
    }

    /**
     * Initialize from localStorage and sync
     */
    initialize(): void {
        if (this.initialized) return;
        this.loadFromStorage();
        this.syncToKeyboardManager();
        this.initialized = true;
    }

    // === Private Methods ===

    private bindingToString(binding: KeyBinding): string {
        const parts: string[] = [];
        if (binding.ctrl) parts.push('ctrl');
        if (binding.shift) parts.push('shift');
        if (binding.alt) parts.push('alt');
        if (binding.meta) parts.push('meta');
        parts.push(binding.key.toLowerCase());
        return parts.join('+');
    }

    private loadFromStorage(): void {
        try {
            const stored = localStorage.getItem(KEYMAP_STORAGE_KEY);
            if (!stored) return;

            const config: KeymapConfig = JSON.parse(stored);
            if (config.version !== KEYMAP_VERSION) {
                console.warn('KeymapManager: Keymap version mismatch, ignoring stored config');
                return;
            }

            // Apply user bindings
            for (const [actionId, binding] of Object.entries(config.bindings)) {
                const entry = this.entries.get(actionId);
                if (entry) {
                    entry.userBinding = binding;
                }
            }
        } catch (error) {
            console.error('KeymapManager: Failed to load keybindings', error);
        }
    }

    private saveToStorage(): void {
        try {
            const bindings: Record<string, KeyBinding> = {};

            for (const entry of this.entries.values()) {
                if (entry.userBinding) {
                    bindings[entry.actionId] = entry.userBinding;
                }
            }

            const config: KeymapConfig = {
                version: KEYMAP_VERSION,
                bindings,
            };

            localStorage.setItem(KEYMAP_STORAGE_KEY, JSON.stringify(config));
        } catch (error) {
            console.error('KeymapManager: Failed to save keybindings', error);
        }
    }

    private syncToKeyboardManager(): void {
        const km = getKeyboardManager();

        // Clear and re-register all shortcuts
        km.clear();

        for (const entry of this.entries.values()) {
            const binding = entry.userBinding ?? entry.defaultBinding;

            const config: ShortcutConfig = {
                key: binding.key,
                ctrl: binding.ctrl,
                shift: binding.shift,
                alt: binding.alt,
                meta: binding.meta,
                action: entry.action,
                description: entry.description,
                allowInInput: entry.allowInInput,
            };

            km.register(config);
        }
    }

    dispose(): void {
        this.entries.clear();
        this.initialized = false;
    }
}

// Singleton
let keymapManagerInstance: KeymapManager | null = null;

export function getKeymapManager(): KeymapManager {
    if (!keymapManagerInstance) {
        keymapManagerInstance = new KeymapManager();
    }
    return keymapManagerInstance;
}

export function resetKeymapManager(): void {
    keymapManagerInstance?.dispose();
    keymapManagerInstance = null;
}
