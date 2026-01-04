import type { IInputHandler } from '@/core/interfaces';
import { InputPriority } from '@/core/interfaces';
import type { SelectionManager } from '@/core/selection/SelectionManager';
import { InputLogger, type ComponentLogger } from './InputLogger';

/**
 * SelectionHandler - Default click-to-select behavior
 * 
 * Implements IInputHandler for integration with InputDispatcher.
 * Priority: SELECTION (50) - lower than tools, higher than navigation.
 * 
 * This handler is always enabled and handles the default selection behavior
 * when no other tool is active.
 */
export class SelectionHandler implements IInputHandler {
    readonly id = 'selection';
    readonly priority = InputPriority.SELECTION;
    enabled = true;
    private logger: ComponentLogger = InputLogger.create('SelectionHandler');

    constructor(private selectionManager: SelectionManager) {
        this.logger.debug('Initialized');
    }

    /**
     * Handle click for selection
     */
    onClick(event: MouseEvent): boolean {
        // Delegate to SelectionManager
        this.selectionManager.handleClick(event);
        this.logger.debug('Click handled', { x: event.clientX, y: event.clientY });

        // Return false to allow event to continue (other handlers may also need it)
        return false;
    }

    /**
     * Handle mouse move for hover effects
     */
    onMouseMove(event: MouseEvent): boolean {
        // Delegate to SelectionManager for hover effects
        this.selectionManager.handleMouseMove(event);

        // Don't consume - other handlers may need this
        return false;
    }

    dispose(): void {
        this.logger.debug('Disposed');
    }
}
