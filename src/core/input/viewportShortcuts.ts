import { getKeymapManager } from '@/core/input/KeymapManager';
import { getViewController } from '@/core/viewport/ViewController';
import { getViewportShading } from '@/core/viewport/ViewportShading';
import { getPivotController } from '@/core/transform/PivotController';
import { getBoxSelectTool } from '@/core/tools/BoxSelectTool';
import { getCircleSelectTool } from '@/core/tools/CircleSelectTool';
import { selectionActions } from '@/stores/selectionStore';
import { sceneActions } from '@/stores/sceneStore';
import { uiActions } from '@/stores/uiStore';

/**
 * Register viewport-specific keyboard shortcuts using KeymapManager
 * 
 * These shortcuts are related to viewport navigation, selection tools,
 * and viewport display modes.
 */
export function registerViewportShortcuts(): void {
    const keymapManager = getKeymapManager();

    // ============================================
    // SELECTION TOOLS (category: 'tools')
    // ============================================

    keymapManager.registerAction({
        actionId: 'tools.box_select',
        description: 'Box Select tool',
        category: 'tools',
        defaultBinding: { key: 'b' },
        action: () => {
            const boxSelectTool = getBoxSelectTool();
            boxSelectTool.activate();
            uiActions.setStatus('Box Select: Drag to select');
        },
    });

    keymapManager.registerAction({
        actionId: 'tools.circle_select',
        description: 'Circle Select tool',
        category: 'tools',
        defaultBinding: { key: 'c' },
        action: () => {
            const circleSelectTool = getCircleSelectTool();
            circleSelectTool.activate();
            uiActions.setStatus('Circle Select: LMB to add, RMB to remove, Scroll to resize');
        },
    });

    keymapManager.registerAction({
        actionId: 'selection.invert',
        description: 'Invert selection',
        category: 'selection',
        defaultBinding: { key: 'i', ctrl: true },
        action: () => {
            const allIds = sceneActions.getAllCubes().map(c => c.id);
            const currentSelected = selectionActions.getSelectedIds();
            const inverted = allIds.filter(id => !currentSelected.includes(id));
            selectionActions.selectMultiple(inverted);
            uiActions.setStatus('Selection Inverted');
        },
    });

    // ============================================
    // VIEW PRESETS (category: 'view')
    // ============================================

    keymapManager.registerAction({
        actionId: 'view.front',
        description: 'Front View',
        category: 'view',
        defaultBinding: { key: '1' },
        action: () => {
            getViewController().setView('front');
            uiActions.setStatus('Front View');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.back',
        description: 'Back View',
        category: 'view',
        defaultBinding: { key: '1', ctrl: true },
        action: () => {
            getViewController().setView('back');
            uiActions.setStatus('Back View');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.right',
        description: 'Right View',
        category: 'view',
        defaultBinding: { key: '3' },
        action: () => {
            getViewController().setView('right');
            uiActions.setStatus('Right View');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.left',
        description: 'Left View',
        category: 'view',
        defaultBinding: { key: '3', ctrl: true },
        action: () => {
            getViewController().setView('left');
            uiActions.setStatus('Left View');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.top',
        description: 'Top View',
        category: 'view',
        defaultBinding: { key: '7' },
        action: () => {
            getViewController().setView('top');
            uiActions.setStatus('Top View');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.bottom',
        description: 'Bottom View',
        category: 'view',
        defaultBinding: { key: '7', ctrl: true },
        action: () => {
            getViewController().setView('bottom');
            uiActions.setStatus('Bottom View');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.camera',
        description: 'Camera View',
        category: 'view',
        defaultBinding: { key: '0' },
        action: () => {
            getViewController().setView('camera');
            uiActions.setStatus('Camera View');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.toggle_projection',
        description: 'Toggle Orthographic/Perspective',
        category: 'view',
        defaultBinding: { key: '5' },
        action: () => {
            const viewController = getViewController();
            viewController.toggleProjection();
            uiActions.setStatus(
                viewController.getProjectionType() === 'perspective'
                    ? 'Perspective'
                    : 'Orthographic'
            );
        },
    });

    // ============================================
    // VIEWPORT NAVIGATION (category: 'view')
    // ============================================

    keymapManager.registerAction({
        actionId: 'view.zoom_selection',
        description: 'Zoom to Selection',
        category: 'view',
        defaultBinding: { key: '.' },
        action: () => {
            getViewController().zoomToSelection();
            uiActions.setStatus('Zoom to Selection');
        },
    });

    keymapManager.registerAction({
        actionId: 'view.zoom_all',
        description: 'Zoom to All',
        category: 'view',
        defaultBinding: { key: 'Home' },
        action: () => {
            getViewController().zoomToAll();
            uiActions.setStatus('Zoom to All');
        },
    });

    // ============================================
    // VIEWPORT SHADING (category: 'view')
    // ============================================

    keymapManager.registerAction({
        actionId: 'view.toggle_xray',
        description: 'Toggle X-Ray mode',
        category: 'view',
        defaultBinding: { key: 'z', alt: true },
        action: () => {
            const shading = getViewportShading();
            shading.toggleXRay();
            uiActions.setStatus(`X-Ray: ${shading.isXRayEnabled() ? 'ON' : 'OFF'}`);
        },
    });

    keymapManager.registerAction({
        actionId: 'view.toggle_wireframe',
        description: 'Toggle Wireframe mode',
        category: 'view',
        defaultBinding: { key: 'z' },
        action: () => {
            const shading = getViewportShading();
            shading.toggleWireframe();
            uiActions.setStatus(`Shading: ${shading.getModeDisplayName()}`);
        },
    });

    // ============================================
    // PIVOT / TRANSFORM (category: 'transform')
    // ============================================

    keymapManager.registerAction({
        actionId: 'transform.cycle_pivot',
        description: 'Cycle Pivot mode',
        category: 'transform',
        defaultBinding: { key: ',' },
        action: () => {
            const pivotController = getPivotController();
            pivotController.cycleMode();
            uiActions.setStatus(`Pivot: ${pivotController.getModeDisplayName()}`);
        },
    });
}

/**
 * Cleanup function for viewport shortcuts
 */
export function unregisterViewportShortcuts(): void {
    // Shortcuts are cleaned up via keymapManager.dispose()
}

