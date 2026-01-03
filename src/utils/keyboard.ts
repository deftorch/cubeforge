import { onMount, onCleanup } from 'solid-js';

export type KeyModifiers = {
    ctrl: boolean;
    shift: boolean;
    alt: boolean;
    meta: boolean;
};

export type ShortcutHandler = (event: KeyboardEvent, modifiers: KeyModifiers) => void;

export interface Shortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    handler: ShortcutHandler;
    description: string;
}

/**
 * Keyboard shortcut definitions for CubeForge
 */
export const SHORTCUTS = {
    // Transform modes
    MOVE: { key: 'g', description: 'Move/Grab' },
    ROTATE: { key: 'r', description: 'Rotate' },
    SCALE: { key: 's', description: 'Scale' },

    // Actions
    DUPLICATE: { key: 'd', shift: true, description: 'Duplicate' },
    DELETE: { key: 'x', description: 'Delete' },
    DELETE_ALT: { key: 'Delete', description: 'Delete' },

    // Selection
    SELECT_ALL: { key: 'a', description: 'Select All' },
    DESELECT_ALL: { key: 'a', alt: true, description: 'Deselect All' },

    // File
    NEW_PROJECT: { key: 'n', ctrl: true, description: 'New Project' },
    OPEN_PROJECT: { key: 'o', ctrl: true, description: 'Open Project' },
    SAVE_PROJECT: { key: 's', ctrl: true, description: 'Save Project' },

    // Edit
    UNDO: { key: 'z', ctrl: true, description: 'Undo' },
    REDO: { key: 'z', ctrl: true, shift: true, description: 'Redo' },
    REDO_ALT: { key: 'y', ctrl: true, description: 'Redo' },

    // Axis constraints
    AXIS_X: { key: 'x', description: 'Constrain to X axis' },
    AXIS_Y: { key: 'y', description: 'Constrain to Y axis' },
    AXIS_Z: { key: 'z', description: 'Constrain to Z axis' },

    // View
    FOCUS_SELECTED: { key: '.', description: 'Focus on selected' },
    RESET_VIEW: { key: 'Home', description: 'Reset view' },

    // Cancel
    CANCEL: { key: 'Escape', description: 'Cancel operation' },
} as const;

/**
 * Check if current key event matches a shortcut
 */
export function matchesShortcut(
    event: KeyboardEvent,
    shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean; meta?: boolean }
): boolean {
    const key = event.key.toLowerCase();
    const shortcutKey = shortcut.key.toLowerCase();

    const ctrlMatches = (shortcut.ctrl ?? false) === (event.ctrlKey || event.metaKey);
    const shiftMatches = (shortcut.shift ?? false) === event.shiftKey;
    const altMatches = (shortcut.alt ?? false) === event.altKey;

    return key === shortcutKey && ctrlMatches && shiftMatches && altMatches;
}

/**
 * Get modifiers from keyboard event
 */
export function getModifiers(event: KeyboardEvent): KeyModifiers {
    return {
        ctrl: event.ctrlKey,
        shift: event.shiftKey,
        alt: event.altKey,
        meta: event.metaKey,
    };
}

/**
 * Hook to setup keyboard shortcuts
 */
export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
    const handleKeyDown = (event: KeyboardEvent) => {
        // Ignore if typing in an input
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        const modifiers = getModifiers(event);

        for (const shortcut of shortcuts) {
            if (matchesShortcut(event, shortcut)) {
                event.preventDefault();
                shortcut.handler(event, modifiers);
                break;
            }
        }
    };

    onMount(() => {
        window.addEventListener('keydown', handleKeyDown);
    });

    onCleanup(() => {
        window.removeEventListener('keydown', handleKeyDown);
    });
}

/**
 * Format shortcut for display
 */
export function formatShortcut(shortcut: { key: string; ctrl?: boolean; shift?: boolean; alt?: boolean }): string {
    const parts: string[] = [];

    if (shortcut.ctrl) parts.push('Ctrl');
    if (shortcut.shift) parts.push('Shift');
    if (shortcut.alt) parts.push('Alt');

    // Format special keys
    let key = shortcut.key;
    if (key === ' ') key = 'Space';
    else if (key.length === 1) key = key.toUpperCase();

    parts.push(key);

    return parts.join('+');
}
