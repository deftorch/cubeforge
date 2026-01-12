import type { IInputHandler, InputEventResult } from '@/core/interfaces';
import { InputLogger, type ComponentLogger } from './InputLogger';
import { getPivotController } from '@/core/transform/PivotController';

/**
 * CursorPlacementHandler - Handles 3D Cursor placement
 * 
 * Trigger: Shift + Right Click
 * Action: Moves the 3D cursor to the mouse position (raycast intersection)
 */
export class CursorPlacementHandler implements IInputHandler {
    readonly id = 'cursor-placement';
    // Priority 30: Higher than Navigation (20) but lower than Selection (50)
    // This allows Selection to consume events first if needed (though usually Selection is Left Click)
    readonly priority = 30;
    enabled = true;

    private logger: ComponentLogger = InputLogger.create('CursorPlacementHandler');

    constructor() {
        this.logger.debug('Initialized');
    }

    /**
     * Handle mouse down events
     * Detects Shift + Right Click (Button 2)
     */
    onMouseDown(event: MouseEvent): InputEventResult {
        // Shift + Right Click
        if (event.shiftKey && event.button === 2) {
            // Prevent context menu
            event.preventDefault();

            this.placeCursor(event);

            return 'CONSUMED';
        }

        return 'IGNORED';
    }

    /**
     * Handle context menu to prevent it showing up after our click
     */
    onContextMenu(event: MouseEvent): InputEventResult {
        // If we just handled a Shift+RightClick, we might want to ensure context menu doesn't show
        // But InputDispatcher calls handlers independently.
        // However, if we shift-right-clicked, we likely want to suppress context menu.
        if (event.shiftKey) {
            return 'CONSUMED';
        }
        return 'IGNORED';
    }

    private placeCursor(event: MouseEvent): void {
        const pivotController = getPivotController();
        pivotController.getCursor().placeAtMouse(event);
        this.logger.debug('Cursor placed at mouse position');
    }

    dispose(): void {
        this.logger.debug('Disposed');
    }
}
