import type { IInputHandler } from '@/core/interfaces';
import { InputPriority } from '@/core/interfaces';
import type { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { InputLogger, type ComponentLogger } from './InputLogger';

/**
 * OrbitControlsHandler - Wrapper for Three.js OrbitControls
 * 
 * Implements IInputHandler for integration with InputDispatcher.
 * Priority: NAVIGATION (20) - lowest priority, acts as fallback.
 * 
 * This handler wraps OrbitControls and can enable/disable it based on
 * whether higher-priority handlers are consuming input.
 */
export class OrbitControlsHandler implements IInputHandler {
    readonly id = 'orbit-controls';
    readonly priority = InputPriority.NAVIGATION;
    enabled = true;

    private orbitControls: OrbitControls;
    private wasEnabled = true;
    private logger: ComponentLogger = InputLogger.create('OrbitControls');

    constructor(orbitControls: OrbitControls) {
        this.orbitControls = orbitControls;
    }

    /**
     * Temporarily disable orbit controls
     * Called when higher-priority handlers need exclusive input
     */
    disable(): void {
        if (this.orbitControls.enabled) {
            this.wasEnabled = this.orbitControls.enabled;
            this.orbitControls.enabled = false;
            this.logger.debug('Disabled');
        }
    }

    /**
     * Re-enable orbit controls (restore previous state)
     */
    enable(): void {
        this.orbitControls.enabled = this.wasEnabled;
        this.logger.debug('Enabled', { wasEnabled: this.wasEnabled });
    }

    /**
     * Directly set orbit controls enabled state
     */
    setEnabled(enabled: boolean): void {
        this.orbitControls.enabled = enabled;
        this.wasEnabled = enabled;
    }

    /**
     * Get the underlying OrbitControls instance
     */
    getOrbitControls(): OrbitControls {
        return this.orbitControls;
    }

    // Note: We don't actually handle events here because OrbitControls
    // has its own event listeners attached to the DOM element.
    // This handler exists to:
    // 1. Provide a way to enable/disable OrbitControls through the dispatcher
    // 2. Be part of the handler priority chain for proper organization
    // 
    // OrbitControls receives events directly from the DOM, and we control
    // whether it responds by toggling its 'enabled' property.

    /**
     * Handle mouse down - check if we should allow orbit
     * 
     * OrbitControls handles its own events, but we can return false here
     * to indicate that the event wasn't "consumed" by this handler,
     * allowing the dispatcher to know the event chain is complete.
     */
    onMouseDown(_event: MouseEvent): boolean {
        // OrbitControls handles its own events via DOM listeners
        // We just return false to indicate we don't consume events
        return false;
    }

    onMouseMove(_event: MouseEvent): boolean {
        return false;
    }

    onMouseUp(_event: MouseEvent): boolean {
        return false;
    }

    onWheel(_event: WheelEvent): boolean {
        return false;
    }

    dispose(): void {
        this.orbitControls.dispose();
    }
}
