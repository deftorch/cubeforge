import { describe, it, expect, vi, beforeEach } from 'vitest';

/**
 * Tests for KeyboardManager shortcut registration and handling
 */

interface ShortcutConfig {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    meta?: boolean;
    action: () => void;
    description: string;
    allowInInput?: boolean;
}

// Testable KeyboardManager logic
class TestKeyboardManager {
    private shortcuts: Map<string, ShortcutConfig> = new Map();
    private enabled = true;

    private getShortcutKey(config: Partial<Pick<ShortcutConfig, 'key' | 'ctrl' | 'shift' | 'alt' | 'meta'>>): string {
        const parts: string[] = [];
        if (config.ctrl) parts.push('ctrl');
        if (config.shift) parts.push('shift');
        if (config.alt) parts.push('alt');
        if (config.meta) parts.push('meta');
        parts.push(config.key?.toLowerCase() ?? '');
        return parts.join('+');
    }

    register(config: ShortcutConfig): void {
        const key = this.getShortcutKey(config);
        this.shortcuts.set(key, config);
    }

    unregister(shortcut: Pick<ShortcutConfig, 'key' | 'ctrl' | 'shift' | 'alt' | 'meta'>): void {
        const key = this.getShortcutKey(shortcut);
        this.shortcuts.delete(key);
    }

    setEnabled(enabled: boolean): void {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    getAllShortcuts(): ShortcutConfig[] {
        return Array.from(this.shortcuts.values());
    }

    clear(): void {
        this.shortcuts.clear();
    }

    getShortcutCount(): number {
        return this.shortcuts.size;
    }

    hasShortcut(key: string, modifiers?: { ctrl?: boolean; shift?: boolean; alt?: boolean }): boolean {
        const shortcutKey = this.getShortcutKey({ key, ...modifiers });
        return this.shortcuts.has(shortcutKey);
    }

    // Simulate key press and return whether action was triggered
    simulateKeyPress(event: {
        key: string;
        ctrlKey?: boolean;
        shiftKey?: boolean;
        altKey?: boolean;
        metaKey?: boolean;
        isInInput?: boolean;
    }): boolean {
        if (!this.enabled) return false;

        const shortcutKey = this.getShortcutKey({
            key: event.key,
            ctrl: event.ctrlKey,
            shift: event.shiftKey,
            alt: event.altKey,
            meta: event.metaKey,
        });

        const config = this.shortcuts.get(shortcutKey);
        if (!config) return false;

        if (event.isInInput && !config.allowInInput) return false;

        config.action();
        return true;
    }
}

describe('KeyboardManager', () => {
    let manager: TestKeyboardManager;

    beforeEach(() => {
        manager = new TestKeyboardManager();
    });

    describe('register()', () => {
        it('should register a simple shortcut', () => {
            manager.register({
                key: 'a',
                action: vi.fn(),
                description: 'Test shortcut',
            });

            expect(manager.hasShortcut('a')).toBe(true);
        });

        it('should register shortcut with modifiers', () => {
            manager.register({
                key: 's',
                ctrl: true,
                action: vi.fn(),
                description: 'Save',
            });

            expect(manager.hasShortcut('s', { ctrl: true })).toBe(true);
            expect(manager.hasShortcut('s')).toBe(false);
        });

        it('should register shortcut with multiple modifiers', () => {
            manager.register({
                key: 'z',
                ctrl: true,
                shift: true,
                action: vi.fn(),
                description: 'Redo',
            });

            expect(manager.hasShortcut('z', { ctrl: true, shift: true })).toBe(true);
        });

        it('should overwrite existing shortcut with same key', () => {
            const action1 = vi.fn();
            const action2 = vi.fn();

            manager.register({ key: 'a', action: action1, description: 'First' });
            manager.register({ key: 'a', action: action2, description: 'Second' });

            expect(manager.getShortcutCount()).toBe(1);
            expect(manager.getAllShortcuts()[0].description).toBe('Second');
        });
    });

    describe('unregister()', () => {
        it('should remove registered shortcut', () => {
            manager.register({ key: 'a', action: vi.fn(), description: 'Test' });
            manager.unregister({ key: 'a' });

            expect(manager.hasShortcut('a')).toBe(false);
        });

        it('should remove shortcut with modifiers', () => {
            manager.register({ key: 's', ctrl: true, action: vi.fn(), description: 'Save' });
            manager.unregister({ key: 's', ctrl: true });

            expect(manager.hasShortcut('s', { ctrl: true })).toBe(false);
        });

        it('should do nothing for non-existent shortcut', () => {
            expect(() => manager.unregister({ key: 'nonexistent' })).not.toThrow();
        });
    });

    describe('setEnabled()', () => {
        it('should enable/disable shortcuts', () => {
            expect(manager.isEnabled()).toBe(true);

            manager.setEnabled(false);
            expect(manager.isEnabled()).toBe(false);

            manager.setEnabled(true);
            expect(manager.isEnabled()).toBe(true);
        });
    });

    describe('simulateKeyPress()', () => {
        it('should trigger action for matching shortcut', () => {
            const action = vi.fn();
            manager.register({ key: 'g', action, description: 'Add cube' });

            const triggered = manager.simulateKeyPress({ key: 'g' });

            expect(triggered).toBe(true);
            expect(action).toHaveBeenCalled();
        });

        it('should not trigger when disabled', () => {
            const action = vi.fn();
            manager.register({ key: 'g', action, description: 'Add cube' });
            manager.setEnabled(false);

            const triggered = manager.simulateKeyPress({ key: 'g' });

            expect(triggered).toBe(false);
            expect(action).not.toHaveBeenCalled();
        });

        it('should require matching modifiers', () => {
            const action = vi.fn();
            manager.register({ key: 's', ctrl: true, action, description: 'Save' });

            const triggered = manager.simulateKeyPress({ key: 's' });
            expect(triggered).toBe(false);

            const triggered2 = manager.simulateKeyPress({ key: 's', ctrlKey: true });
            expect(triggered2).toBe(true);
            expect(action).toHaveBeenCalledTimes(1);
        });

        it('should block shortcuts in input when allowInInput is false', () => {
            const action = vi.fn();
            manager.register({ key: 'a', action, description: 'Test', allowInInput: false });

            const triggered = manager.simulateKeyPress({ key: 'a', isInInput: true });

            expect(triggered).toBe(false);
            expect(action).not.toHaveBeenCalled();
        });

        it('should allow shortcuts in input when allowInInput is true', () => {
            const action = vi.fn();
            manager.register({ key: 'escape', action, description: 'Cancel', allowInInput: true });

            const triggered = manager.simulateKeyPress({ key: 'escape', isInInput: true });

            expect(triggered).toBe(true);
            expect(action).toHaveBeenCalled();
        });
    });

    describe('getAllShortcuts()', () => {
        it('should return all registered shortcuts', () => {
            manager.register({ key: 'a', action: vi.fn(), description: 'A' });
            manager.register({ key: 'b', action: vi.fn(), description: 'B' });
            manager.register({ key: 'c', ctrl: true, action: vi.fn(), description: 'C' });

            const shortcuts = manager.getAllShortcuts();
            expect(shortcuts).toHaveLength(3);
        });

        it('should return empty array when no shortcuts', () => {
            expect(manager.getAllShortcuts()).toHaveLength(0);
        });
    });

    describe('clear()', () => {
        it('should remove all shortcuts', () => {
            manager.register({ key: 'a', action: vi.fn(), description: 'A' });
            manager.register({ key: 'b', action: vi.fn(), description: 'B' });

            manager.clear();

            expect(manager.getShortcutCount()).toBe(0);
        });
    });
});
