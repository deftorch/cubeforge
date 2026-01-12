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
            // Find the save button which likely has the logic attached
            // But ideally we should invoke the logic directly. 
            // Since the logic is likely in Toolbar, we can't easily reach it.
            // But the existing code clicks the button.
            // We can intercept the click or just update the Toolbar to use prompt.
            // Let's assume the button click triggers a download. 
            // If we can't change Toolbar code from here, we should look at Toolbar.tsx.
            // But wait, I can change Toolbar.tsx!
            // So I will fix the Save logic in Toolbar.tsx instead of here.
            // Here just triggers the click.
            const saveBtn = document.querySelector('[title*="Save"]') as HTMLButtonElement;
            saveBtn?.click();
        },
    });

    // ...

    keymapManager.registerAction({
        actionId: 'view.zoom_selection',
        description: 'Zoom to Selection / All',
        category: 'view',
        defaultBinding: { key: '.' },
        action: () => {
            const selectedIds = selectionActions.getSelectedIds();
            if (selectedIds.length > 0) {
                getViewController().zoomToSelection();
                uiActions.setStatus('Zoom to Selection');
            } else {
                getViewController().zoomToAll();
                uiActions.setStatus('Zoom to All');
            }
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

