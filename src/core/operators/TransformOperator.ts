import * as THREE from 'three';
import type { IOperator, OperatorResult, InputHandlerResult } from '@/core/interfaces';
import { InputPriority } from '@/core/interfaces';
import { selectionActions } from '@/stores/selectionStore';
import { sceneActions } from '@/stores/sceneStore';
import { uiActions } from '@/stores/uiStore';
import { getTransformService } from '@/core/transform/TransformService';
import { getSceneManager } from '@/core/scene/SceneManager';
import type { InputDispatcher } from '@/core/input/InputDispatcher';
import { InputLogger, type ComponentLogger } from '@/core/input/InputLogger';

/**
 * TransformOperator - Modal operator for transform with axis constraints
 * 
 * Implements Blender-like transform workflow:
 * - Press G/R/S to start transform
 * - Press X/Y/Z to constrain to axis
 * - Press Shift+X/Y/Z to constrain to plane (exclude axis)
 * - Type numbers for numeric input
 * - Enter to confirm, Escape to cancel
 * 
 * @example
 * ```typescript
 * // Activate via shortcut
 * const op = getOperatorRegistry().get('transform-move');
 * getOperatorRegistry().invoke('transform-move');
 * 
 * // Then press X to constrain to X axis
 * // Type "5" then Enter to move 5 units
 * ```
 */
export class TransformOperator implements IOperator {
    readonly id: string;
    readonly priority = InputPriority.MODAL;
    readonly isModal = true;
    readonly operatorType = 'MODAL' as const;
    readonly operatorName: string;
    enabled = false;  // Disabled until invoked

    private mode: 'translate' | 'rotate' | 'scale';
    private axis: 'X' | 'Y' | 'Z' | null = null;
    private excludeAxis: boolean = false;
    private numericInput: string = '';
    private isActive = false;

    // Store original transforms for cancel
    private originalTransforms: Map<string, {
        position: THREE.Vector3;
        rotation: THREE.Euler;
        scale: THREE.Vector3;
    }> = new Map();

    private dispatcher: InputDispatcher | null = null;
    private logger: ComponentLogger;

    constructor(mode: 'translate' | 'rotate' | 'scale') {
        this.mode = mode;
        this.id = `transform-${mode}`;
        this.operatorName = mode.charAt(0).toUpperCase() + mode.slice(1);
        this.logger = InputLogger.create(`TransformOp-${mode}`);
    }

    /**
     * Set the dispatcher for modal control
     */
    setDispatcher(dispatcher: InputDispatcher): void {
        this.dispatcher = dispatcher;
    }

    /**
     * Get the current mode
     */
    getMode(): 'translate' | 'rotate' | 'scale' {
        return this.mode;
    }

    /**
     * Invoke - Start the modal transform
     */
    invoke(): OperatorResult {
        const selectedIds = selectionActions.getSelectedIds();
        if (selectedIds.length === 0) {
            uiActions.setStatus('No objects selected');
            return 'CANCELLED';
        }

        // Store original transforms
        this.originalTransforms.clear();
        for (const id of selectedIds) {
            const cube = sceneActions.getCube(id);
            if (cube) {
                this.originalTransforms.set(id, {
                    position: cube.transform.position.clone(),
                    rotation: cube.transform.rotation.clone(),
                    scale: cube.transform.scale.clone(),
                });
                // Start transform tracking
                getTransformService().startTransform(id);
            }
        }

        // Reset state
        this.axis = null;
        this.excludeAxis = false;
        this.numericInput = '';
        this.isActive = true;
        this.enabled = true;

        // Set as modal handler
        this.dispatcher?.setModalHandler(this);

        // Update UI
        this.updateStatus();

        this.logger.debug('Invoked', {
            selectedCount: selectedIds.length,
            mode: this.mode
        });

        return 'RUNNING_MODAL';
    }

    /**
     * Execute - Apply the transform
     */
    execute(): OperatorResult {
        if (!this.isActive) return 'CANCELLED';

        const selectedIds = selectionActions.getSelectedIds();
        const transformService = getTransformService();

        // End transform tracking (records undo)
        for (const id of selectedIds) {
            transformService.endTransform(id);
        }

        this.cleanup();
        this.logger.debug('Executed', { mode: this.mode });
        uiActions.setStatus(`${this.operatorName} applied`);
        return 'FINISHED';
    }

    /**
     * Cancel - Revert to original transforms
     */
    cancel(): void {
        if (!this.isActive) return;

        const transformService = getTransformService();

        // Restore original transforms
        for (const [id, original] of this.originalTransforms) {
            transformService.updateTransform(id, {
                position: original.position,
                rotation: original.rotation,
                scale: original.scale,
            });
        }

        this.cleanup();
        this.logger.debug('Cancelled', { mode: this.mode });
        uiActions.setStatus(`${this.operatorName} cancelled`);
    }

    /**
     * Handle keyboard input during modal operation
     */
    onKeyDown(event: KeyboardEvent): InputHandlerResult {
        if (!this.isActive) return false;

        const key = event.key.toLowerCase();

        // Axis constraints
        if (key === 'x' || key === 'y' || key === 'z') {
            const newAxis = key.toUpperCase() as 'X' | 'Y' | 'Z';

            if (event.shiftKey) {
                // Shift+axis = constrain to plane (exclude this axis)
                this.axis = newAxis;
                this.excludeAxis = true;
            } else {
                // Toggle axis or set new axis
                if (this.axis === newAxis && !this.excludeAxis) {
                    this.axis = null;  // Toggle off
                } else {
                    this.axis = newAxis;
                    this.excludeAxis = false;
                }
            }

            this.updateStatus();
            event.preventDefault();
            return true;
        }

        // Numeric input
        if (/^[0-9]$/.test(key) || key === '.' || key === '-') {
            // Handle negative sign only at start
            if (key === '-' && this.numericInput.length > 0) {
                return true;
            }
            // Handle decimal only once
            if (key === '.' && this.numericInput.includes('.')) {
                return true;
            }

            this.numericInput += key;
            this.applyNumericTransform();
            this.updateStatus();
            event.preventDefault();
            return true;
        }

        // Backspace - remove last char
        if (key === 'backspace' && this.numericInput.length > 0) {
            this.numericInput = this.numericInput.slice(0, -1);
            this.applyNumericTransform();
            this.updateStatus();
            event.preventDefault();
            return true;
        }

        // Enter - confirm
        if (key === 'enter') {
            this.execute();
            event.preventDefault();
            return true;
        }

        // Escape - cancel
        if (key === 'escape') {
            this.cancel();
            event.preventDefault();
            return true;
        }

        return false;
    }

    /**
     * Handle mouse movement for real-time transform preview
     */
    onMouseMove(event: MouseEvent): InputHandlerResult {
        if (!this.isActive || this.numericInput.length > 0) return false;

        // For now, only numeric input is supported
        // Mouse-based transform would require more complex screen-to-world conversion
        return false;
    }

    /**
     * Handle mouse click to confirm
     */
    onClick(event: MouseEvent): InputHandlerResult {
        if (!this.isActive) return false;

        // Left click = confirm
        if (event.button === 0) {
            this.execute();
            return true;
        }

        return false;
    }

    /**
     * Handle right click to cancel
     */
    onContextMenu(event: MouseEvent): InputHandlerResult {
        if (!this.isActive) return false;

        this.cancel();
        event.preventDefault();
        return true;
    }

    /**
     * Apply numeric transform value
     */
    private applyNumericTransform(): void {
        const value = parseFloat(this.numericInput);
        if (isNaN(value)) return;

        const selectedIds = selectionActions.getSelectedIds();
        const transformService = getTransformService();

        for (const id of selectedIds) {
            const original = this.originalTransforms.get(id);
            if (!original) continue;

            if (this.mode === 'translate') {
                this.applyTranslation(id, original, value);
            } else if (this.mode === 'rotate') {
                this.applyRotation(id, original, value);
            } else if (this.mode === 'scale') {
                this.applyScale(id, original, value);
            }
        }
    }

    /**
     * Apply translation with axis constraint
     */
    private applyTranslation(
        id: string,
        original: { position: THREE.Vector3 },
        value: number
    ): void {
        const newPosition = original.position.clone();

        if (this.axis === null) {
            // No constraint - apply to all axes equally (not typical, but fallback)
            newPosition.x += value;
            newPosition.y += value;
            newPosition.z += value;
        } else if (this.excludeAxis) {
            // Constrain to plane (exclude this axis)
            if (this.axis !== 'X') newPosition.x += value;
            if (this.axis !== 'Y') newPosition.y += value;
            if (this.axis !== 'Z') newPosition.z += value;
        } else {
            // Constrain to single axis
            if (this.axis === 'X') newPosition.x += value;
            if (this.axis === 'Y') newPosition.y += value;
            if (this.axis === 'Z') newPosition.z += value;
        }

        getTransformService().updateTransform(id, { position: newPosition });

        // Sync mesh visually
        const mesh = getSceneManager().getMesh(id);
        if (mesh) {
            mesh.position.copy(newPosition);
        }
    }

    /**
     * Apply rotation with axis constraint
     */
    private applyRotation(
        id: string,
        original: { rotation: THREE.Euler },
        value: number
    ): void {
        const radians = THREE.MathUtils.degToRad(value);
        const newRotation = original.rotation.clone();

        if (this.axis === null) {
            // Default to Z axis for 2D-like rotation
            newRotation.z += radians;
        } else if (this.excludeAxis) {
            // Rotate around other axes
            if (this.axis !== 'X') newRotation.x += radians;
            if (this.axis !== 'Y') newRotation.y += radians;
            if (this.axis !== 'Z') newRotation.z += radians;
        } else {
            // Rotate around single axis
            if (this.axis === 'X') newRotation.x += radians;
            if (this.axis === 'Y') newRotation.y += radians;
            if (this.axis === 'Z') newRotation.z += radians;
        }

        getTransformService().updateTransform(id, { rotation: newRotation });

        // Sync mesh visually
        const mesh = getSceneManager().getMesh(id);
        if (mesh) {
            mesh.rotation.copy(newRotation);
        }
    }

    /**
     * Apply scale with axis constraint
     */
    private applyScale(
        id: string,
        original: { scale: THREE.Vector3 },
        value: number
    ): void {
        const newScale = original.scale.clone();
        const scaleFactor = value;  // Absolute scale value, or could be multiplier

        if (this.axis === null) {
            // Uniform scale
            newScale.set(scaleFactor, scaleFactor, scaleFactor);
        } else if (this.excludeAxis) {
            // Scale other axes
            if (this.axis !== 'X') newScale.x = scaleFactor;
            if (this.axis !== 'Y') newScale.y = scaleFactor;
            if (this.axis !== 'Z') newScale.z = scaleFactor;
        } else {
            // Scale single axis
            if (this.axis === 'X') newScale.x = scaleFactor;
            if (this.axis === 'Y') newScale.y = scaleFactor;
            if (this.axis === 'Z') newScale.z = scaleFactor;
        }

        getTransformService().updateTransform(id, { scale: newScale });

        // Sync mesh visually
        const mesh = getSceneManager().getMesh(id);
        if (mesh) {
            mesh.scale.copy(newScale);
        }
    }

    /**
     * Update status bar with current state
     */
    private updateStatus(): void {
        let status = this.operatorName;

        if (this.axis) {
            if (this.excludeAxis) {
                // Show which plane we're constraining to
                const axes = ['X', 'Y', 'Z'].filter(a => a !== this.axis);
                status += ` (${axes.join('')} plane)`;
            } else {
                status += ` (${this.axis} axis)`;
            }
        }

        if (this.numericInput) {
            status += `: ${this.numericInput}`;
        } else {
            status += ': Type value or press X/Y/Z';
        }

        uiActions.setStatus(status);
    }

    /**
     * Cleanup after operation completes
     */
    private cleanup(): void {
        this.isActive = false;
        this.enabled = false;
        this.axis = null;
        this.excludeAxis = false;
        this.numericInput = '';
        this.originalTransforms.clear();

        // Release modal
        this.dispatcher?.setModalHandler(null);
    }

    /**
     * Dispose
     */
    dispose(): void {
        this.cleanup();
    }
}
