import { getKeymapManager } from '@/core/input/KeymapManager';
import { getOperatorRegistry } from '@/core/input/OperatorRegistry';
import { uiActions } from '@/stores/uiStore';
import { layoutActions } from '@/stores/layoutStore';
import { selectionActions } from '@/stores/selectionStore';
import { historyActions } from '@/stores/historyStore';
import { registerViewportShortcuts } from './viewportShortcuts';
import type { CubeManager } from '@/core/scene/CubeManager';
import type { SelectionManager } from '@/core/selection/SelectionManager';

/**
 * Register all default keyboard shortcuts using KeymapManager
 * 
 * KeymapManager provides:
 * - User-customizable keybindings
 * - Conflict detection
 * - localStorage persistence
 * - Category grouping for settings UI
 * 
 * @param cubeManager - CubeManager instance from CoreContext
 * @param selectionManager - SelectionManager instance from CoreContext
 */
export function registerDefaultShortcuts(
    cubeManager: CubeManager,
    selectionManager: SelectionManager
): void {
    const keymapManager = getKeymapManager();
    const operatorRegistry = getOperatorRegistry();

    // Register viewport-specific shortcuts
    registerViewportShortcuts();

    // ============================================
    // TRANSFORM SHORTCUTS (category: 'transform')
    // ============================================

    keymapManager.registerAction({
        actionId: 'transform.translate',
        description: 'Move mode (Modal)',
        category: 'transform',
        defaultBinding: { key: 'g' },
        action: () => {
            const result = operatorRegistry.invoke('transform-translate');
            if (result === 'CANCELLED') {
                uiActions.setTransformMode('translate');
                uiActions.setStatus('Move mode');
            }
        },
    });

    keymapManager.registerAction({
        actionId: 'transform.rotate',
        description: 'Rotate mode (Modal)',
        category: 'transform',
        defaultBinding: { key: 'r' },
        action: () => {
            const result = operatorRegistry.invoke('transform-rotate');
            if (result === 'CANCELLED') {
                uiActions.setTransformMode('rotate');
                uiActions.setStatus('Rotate mode');
            }
        },
    });

    keymapManager.registerAction({
        actionId: 'transform.scale',
        description: 'Scale mode (Modal)',
        category: 'transform',
        defaultBinding: { key: 's' },
        action: () => {
            const result = operatorRegistry.invoke('transform-scale');
            if (result === 'CANCELLED') {
                uiActions.setTransformMode('scale');
                uiActions.setStatus('Scale mode');
            }
        },
    });

    // ============================================
    // EDIT SHORTCUTS (category: 'edit')
    // ============================================

    keymapManager.registerAction({
        actionId: 'edit.duplicate',
        description: 'Duplicate selected cubes',
        category: 'edit',
        defaultBinding: { key: 'd', shift: true },
        action: () => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                const duplicates = cubeManager.duplicateCubes(selectedIds);
                selectionActions.selectMultiple(duplicates.map(c => c.id));
                uiActions.setStatus(`Duplicated ${duplicates.length} cube(s)`);
            }
        },
    });

    keymapManager.registerAction({
        actionId: 'edit.delete',
        description: 'Delete selected cubes',
        category: 'edit',
        defaultBinding: { key: 'Delete' },
        action: () => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                cubeManager.deleteCubes(selectedIds);
                selectionManager.clearSelection();
                uiActions.setStatus(`Deleted ${selectedIds.length} cube(s)`);
            }
        },
    });

    keymapManager.registerAction({
        actionId: 'edit.delete.alt',
        description: 'Delete selected cubes (X)',
        category: 'edit',
        defaultBinding: { key: 'x' },
        action: () => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                cubeManager.deleteCubes(selectedIds);
                selectionManager.clearSelection();
                uiActions.setStatus(`Deleted ${selectedIds.length} cube(s)`);
            }
        },
    });

    keymapManager.registerAction({
        actionId: 'edit.undo',
        description: 'Undo',
        category: 'edit',
        defaultBinding: { key: 'z', ctrl: true },
        action: () => {
            historyActions.undo();
            uiActions.setStatus('Undo');
        },
    });

    keymapManager.registerAction({
        actionId: 'edit.redo',
        description: 'Redo',
        category: 'edit',
        defaultBinding: { key: 'z', ctrl: true, shift: true },
        action: () => {
            historyActions.redo();
            uiActions.setStatus('Redo');
        },
    });

    keymapManager.registerAction({
        actionId: 'edit.redo.alt',
        description: 'Redo (Ctrl+Y)',
        category: 'edit',
        defaultBinding: { key: 'y', ctrl: true },
        action: () => {
            historyActions.redo();
            uiActions.setStatus('Redo');
        },
    });

    keymapManager.registerAction({
        actionId: 'edit.save',
        description: 'Save project',
        category: 'edit',
        defaultBinding: { key: 's', ctrl: true },
        action: () => {
            const saveBtn = document.querySelector('[title*="Save"]') as HTMLButtonElement;
            saveBtn?.click();
        },
    });

    // ============================================
    // SELECTION SHORTCUTS (category: 'selection')
    // ============================================

    keymapManager.registerAction({
        actionId: 'selection.all',
        description: 'Select all cubes',
        category: 'selection',
        defaultBinding: { key: 'a' },
        action: () => {
            selectionManager.selectAll();
            uiActions.setStatus('Selected all cubes');
        },
    });

    keymapManager.registerAction({
        actionId: 'selection.none',
        description: 'Deselect all',
        category: 'selection',
        defaultBinding: { key: 'a', alt: true },
        action: () => {
            selectionManager.clearSelection();
            uiActions.setStatus('Selection cleared');
        },
    });

    // ============================================
    // GENERAL SHORTCUTS (category: 'general')
    // ============================================

    keymapManager.registerAction({
        actionId: 'general.cancel',
        description: 'Cancel / Clear selection',
        category: 'general',
        defaultBinding: { key: 'Escape' },
        action: () => {
            selectionManager.clearSelection();
            uiActions.closeModal();
            uiActions.setStatus('Cancelled');
        },
    });

    keymapManager.registerAction({
        actionId: 'general.toggle_mode',
        description: 'Toggle Object/Edit mode',
        category: 'general',
        defaultBinding: { key: 'Tab' },
        action: () => {
            uiActions.toggleInteractionMode();
        },
    });

    keymapManager.registerAction({
        actionId: 'general.toggle_properties',
        description: 'Toggle Properties panel',
        category: 'general',
        defaultBinding: { key: 'n' },
        action: () => {
            layoutActions.toggleRightPanel();
            uiActions.setStatus('Properties panel toggled');
        },
    });

    keymapManager.registerAction({
        actionId: 'general.toggle_scene',
        description: 'Toggle Scene panel',
        category: 'general',
        defaultBinding: { key: 't' },
        action: () => {
            layoutActions.toggleLeftPanel();
            uiActions.setStatus('Scene panel toggled');
        },
    });

    // Initialize KeymapManager (loads from localStorage, syncs to KeyboardManager)
    keymapManager.initialize();
}

/**
 * Cleanup keyboard shortcuts
 */
export function unregisterShortcuts(): void {
    const keymapManager = getKeymapManager();
    keymapManager.dispose();
}

