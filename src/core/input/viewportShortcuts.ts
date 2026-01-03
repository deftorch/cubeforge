import { getKeyboardManager } from '@/core/input/KeyboardManager';
import { getViewController } from '@/core/viewport/ViewController';
import { getViewportShading } from '@/core/viewport/ViewportShading';
import { getPivotController } from '@/core/transform/PivotController';
import { getBoxSelectTool } from '@/core/tools/BoxSelectTool';
import { getCircleSelectTool } from '@/core/tools/CircleSelectTool';
import { selectionActions } from '@/stores/selectionStore';
import { sceneActions } from '@/stores/sceneStore';
import { uiActions } from '@/stores/uiStore';

/**
 * Register viewport-specific keyboard shortcuts
 * 
 * These shortcuts are related to viewport navigation, selection tools,
 * and viewport display modes. Extracted from Viewport.tsx for Single Responsibility.
 */
export function registerViewportShortcuts(): void {
    const keyboardManager = getKeyboardManager();

    // ============================================
    // SELECTION TOOLS
    // ============================================

    // Box select activation (B)
    keyboardManager.register({
        key: 'b',
        action: () => {
            const boxSelectTool = getBoxSelectTool();
            boxSelectTool.activate();
            uiActions.setStatus('Box Select: Drag to select');
        },
        description: 'Box Select tool',
    });

    // Circle select activation (C)
    keyboardManager.register({
        key: 'c',
        action: () => {
            const circleSelectTool = getCircleSelectTool();
            circleSelectTool.activate();
            uiActions.setStatus('Circle Select: LMB to add, RMB to remove, Scroll to resize');
        },
        description: 'Circle Select tool',
    });

    // Invert selection (Ctrl+I)
    keyboardManager.register({
        key: 'i',
        ctrl: true,
        action: () => {
            const allIds = sceneActions.getAllCubes().map(c => c.id);
            const currentSelected = selectionActions.getSelectedIds();
            const inverted = allIds.filter(id => !currentSelected.includes(id));
            selectionActions.selectMultiple(inverted);
            uiActions.setStatus('Selection Inverted');
        },
        description: 'Invert selection',
    });

    // ============================================
    // VIEW PRESETS
    // ============================================

    // Front view (1) / Back view (Ctrl+1)
    keyboardManager.register({
        key: '1',
        action: () => {
            getViewController().setView('front');
            uiActions.setStatus('Front View');
        },
        description: 'Front View',
    });

    keyboardManager.register({
        key: '1',
        ctrl: true,
        action: () => {
            getViewController().setView('back');
            uiActions.setStatus('Back View');
        },
        description: 'Back View',
    });

    // Right view (3) / Left view (Ctrl+3)
    keyboardManager.register({
        key: '3',
        action: () => {
            getViewController().setView('right');
            uiActions.setStatus('Right View');
        },
        description: 'Right View',
    });

    keyboardManager.register({
        key: '3',
        ctrl: true,
        action: () => {
            getViewController().setView('left');
            uiActions.setStatus('Left View');
        },
        description: 'Left View',
    });

    // Top view (7) / Bottom view (Ctrl+7)
    keyboardManager.register({
        key: '7',
        action: () => {
            getViewController().setView('top');
            uiActions.setStatus('Top View');
        },
        description: 'Top View',
    });

    keyboardManager.register({
        key: '7',
        ctrl: true,
        action: () => {
            getViewController().setView('bottom');
            uiActions.setStatus('Bottom View');
        },
        description: 'Bottom View',
    });

    // Camera view (0)
    keyboardManager.register({
        key: '0',
        action: () => {
            getViewController().setView('camera');
            uiActions.setStatus('Camera View');
        },
        description: 'Camera View',
    });

    // Orthographic/Perspective toggle (5)
    keyboardManager.register({
        key: '5',
        action: () => {
            const viewController = getViewController();
            viewController.toggleProjection();
            uiActions.setStatus(
                viewController.getProjectionType() === 'perspective'
                    ? 'Perspective'
                    : 'Orthographic'
            );
        },
        description: 'Toggle Orthographic/Perspective',
    });

    // ============================================
    // VIEWPORT NAVIGATION
    // ============================================

    // Zoom to selection (.)
    keyboardManager.register({
        key: '.',
        action: () => {
            getViewController().zoomToSelection();
            uiActions.setStatus('Zoom to Selection');
        },
        description: 'Zoom to Selection',
    });

    // Zoom to all (Home)
    keyboardManager.register({
        key: 'Home',
        action: () => {
            getViewController().zoomToAll();
            uiActions.setStatus('Zoom to All');
        },
        description: 'Zoom to All',
    });

    // ============================================
    // VIEWPORT SHADING
    // ============================================

    // X-Ray toggle (Alt+Z)
    keyboardManager.register({
        key: 'z',
        alt: true,
        action: () => {
            const shading = getViewportShading();
            shading.toggleXRay();
            uiActions.setStatus(`X-Ray: ${shading.isXRayEnabled() ? 'ON' : 'OFF'}`);
        },
        description: 'Toggle X-Ray mode',
    });

    // Wireframe toggle (Z)
    keyboardManager.register({
        key: 'z',
        action: () => {
            const shading = getViewportShading();
            shading.toggleWireframe();
            uiActions.setStatus(`Shading: ${shading.getModeDisplayName()}`);
        },
        description: 'Toggle Wireframe mode',
    });

    // ============================================
    // PIVOT / TRANSFORM
    // ============================================

    // Pivot mode cycle (,)
    keyboardManager.register({
        key: ',',
        action: () => {
            const pivotController = getPivotController();
            pivotController.cycleMode();
            uiActions.setStatus(`Pivot: ${pivotController.getModeDisplayName()}`);
        },
        description: 'Cycle Pivot mode',
    });
}

/**
 * Cleanup function for viewport shortcuts
 * Note: Individual shortcuts are cleared by the main unregisterShortcuts
 */
export function unregisterViewportShortcuts(): void {
    // Shortcuts are cleared via main keyboard manager clear()
    // This function exists for symmetry and future cleanup needs
}
