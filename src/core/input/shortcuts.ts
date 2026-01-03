import { getKeyboardManager } from '@/core/input/KeyboardManager';
import { uiActions } from '@/stores/uiStore';
import { selectionActions } from '@/stores/selectionStore';
import { historyActions } from '@/stores/historyStore';
import { registerViewportShortcuts } from './viewportShortcuts';
import type { CubeManager } from '@/core/scene/CubeManager';
import type { SelectionManager } from '@/core/selection/SelectionManager';

/**
 * Register all default keyboard shortcuts
 * 
 * This centralizes all keyboard shortcut definitions.
 * Call this once during app initialization.
 * 
 * @param cubeManager - CubeManager instance from CoreContext
 * @param selectionManager - SelectionManager instance from CoreContext
 */
export function registerDefaultShortcuts(
    cubeManager: CubeManager,
    selectionManager: SelectionManager
): void {
    const keyboardManager = getKeyboardManager();

    // Register viewport-specific shortcuts (views, shading, tools)
    registerViewportShortcuts();

    // Transform mode shortcuts
    keyboardManager.register({
        key: 'g',
        action: () => {
            uiActions.setTransformMode('translate');
            uiActions.setStatus('Move mode');
        },
        description: 'Move mode',
    });

    keyboardManager.register({
        key: 'r',
        action: () => {
            uiActions.setTransformMode('rotate');
            uiActions.setStatus('Rotate mode');
        },
        description: 'Rotate mode',
    });

    keyboardManager.register({
        key: 's',
        action: () => {
            uiActions.setTransformMode('scale');
            uiActions.setStatus('Scale mode');
        },
        description: 'Scale mode',
    });

    // Duplicate
    keyboardManager.register({
        key: 'd',
        shift: true,
        action: () => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                const duplicates = cubeManager.duplicateCubes(selectedIds);
                selectionActions.selectMultiple(duplicates.map(c => c.id));
                uiActions.setStatus(`Duplicated ${duplicates.length} cube(s)`);
            }
        },
        description: 'Duplicate selected cubes',
    });

    // Delete
    keyboardManager.register({
        key: 'Delete',
        action: () => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                cubeManager.deleteCubes(selectedIds);
                selectionManager.clearSelection();
                uiActions.setStatus(`Deleted ${selectedIds.length} cube(s)`);
            }
        },
        description: 'Delete selected cubes',
    });

    keyboardManager.register({
        key: 'x',
        action: () => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                cubeManager.deleteCubes(selectedIds);
                selectionManager.clearSelection();
                uiActions.setStatus(`Deleted ${selectedIds.length} cube(s)`);
            }
        },
        description: 'Delete selected cubes (alt)',
    });

    // Select all
    keyboardManager.register({
        key: 'a',
        action: () => {
            selectionManager.selectAll();
            uiActions.setStatus('Selected all cubes');
        },
        description: 'Select all cubes',
    });

    // Deselect all
    keyboardManager.register({
        key: 'a',
        alt: true,
        action: () => {
            selectionManager.clearSelection();
            uiActions.setStatus('Selection cleared');
        },
        description: 'Deselect all',
    });

    // Undo
    keyboardManager.register({
        key: 'z',
        ctrl: true,
        action: () => {
            historyActions.undo();
            uiActions.setStatus('Undo');
        },
        description: 'Undo',
    });

    // Redo
    keyboardManager.register({
        key: 'z',
        ctrl: true,
        shift: true,
        action: () => {
            historyActions.redo();
            uiActions.setStatus('Redo');
        },
        description: 'Redo',
    });

    keyboardManager.register({
        key: 'y',
        ctrl: true,
        action: () => {
            historyActions.redo();
            uiActions.setStatus('Redo');
        },
        description: 'Redo (alt)',
    });

    // Save (trigger save via toolbar button)
    keyboardManager.register({
        key: 's',
        ctrl: true,
        action: () => {
            const saveBtn = document.querySelector('[title*="Save"]') as HTMLButtonElement;
            saveBtn?.click();
        },
        description: 'Save project',
    });

    // Cancel / Escape
    keyboardManager.register({
        key: 'Escape',
        action: () => {
            selectionManager.clearSelection();
            uiActions.closeModal();
            uiActions.setStatus('Cancelled');
        },
        description: 'Cancel / Clear selection',
    });

    // Toggle Object/Edit mode
    keyboardManager.register({
        key: 'Tab',
        action: () => {
            uiActions.toggleInteractionMode();
        },
        description: 'Toggle Object/Edit mode',
    });

    // Attach keyboard manager to window
    keyboardManager.attach();
}

/**
 * Cleanup keyboard shortcuts
 */
export function unregisterShortcuts(): void {
    const keyboardManager = getKeyboardManager();
    keyboardManager.detach();
    keyboardManager.clear();
}
