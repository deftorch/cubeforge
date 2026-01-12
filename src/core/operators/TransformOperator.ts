import * as THREE from 'three';
import type { IOperator, OperatorResult, InputHandlerResult } from '@/core/interfaces';
import { InputPriority } from '@/core/interfaces';
import { selectionActions } from '@/stores/selectionStore';
import { sceneActions } from '@/stores/sceneStore';
import { uiActions } from '@/stores/uiStore';
import { getTransformService } from '@/core/transform/TransformService';
import { getSceneManager } from '@/core/scene/SceneManager';
import { getSelectionManager } from '@/core/selection/SelectionManager';
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

    // Mouse-based transform state
    private startMousePos: { x: number; y: number } | null = null;
    private lastMousePos: { x: number; y: number } | null = null;
    private pivotPoint: THREE.Vector3 = new THREE.Vector3();
    private isPrecisionMode: boolean = false;

    // Sensitivity constants
    private static readonly TRANSLATE_SENSITIVITY = 0.02; // units per pixel
    private static readonly ROTATE_SENSITIVITY = 0.5;     // degrees per pixel  
    private static readonly SCALE_SENSITIVITY = 0.005;    // scale factor per pixel
    private static readonly PRECISION_MULTIPLIER = 0.1;   // Shift = 10x slower

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

        // Initialize mouse tracking - will be set on first mouse move
        this.startMousePos = null;
        this.lastMousePos = null;
        this.isPrecisionMode = false;

        // Calculate pivot point (center of selection)
        this.calculatePivotPoint();

        // Set as modal handler
        this.dispatcher?.setModalHandler(this);

        // Update UI
        this.updateStatus();

        this.logger.debug('Invoked', {
            selectedCount: selectedIds.length,
            mode: this.mode,
            pivot: this.pivotPoint
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
            this.logger.debug('Axis constraint changed', { axis: this.axis, exclude: this.excludeAxis });
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
            this.logger.debug('Numeric input updated', { value: this.numericInput });
            return true;
        }

        // Backspace - remove last char
        if (key === 'backspace' && this.numericInput.length > 0) {
            this.numericInput = this.numericInput.slice(0, -1);
            this.applyNumericTransform();
            this.updateStatus();
            event.preventDefault();
            this.logger.debug('Numeric input backspace', { value: this.numericInput });
            return true;
        }

        // Enter - confirm
        if (key === 'enter') {
            this.logger.debug('Confirming transform (Enter)');
            this.execute();
            event.preventDefault();
            return true;
        }

        // Escape - cancel
        if (key === 'escape') {
            this.logger.debug('Cancelling transform (Escape)');
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
        if (!this.isActive) return false;

        // Skip if numeric input mode is active
        if (this.numericInput.length > 0) return false;

        // Track precision mode (Shift key)
        this.isPrecisionMode = event.shiftKey;

        // Initialize start position on first move
        if (!this.startMousePos) {
            this.startMousePos = { x: event.clientX, y: event.clientY };
            this.lastMousePos = { x: event.clientX, y: event.clientY };
            return true;
        }

        // Calculate delta from start position
        const deltaX = event.clientX - this.startMousePos.x;
        const deltaY = event.clientY - this.startMousePos.y;

        // Apply precision multiplier if Shift is held
        const sensitivity = this.isPrecisionMode
            ? TransformOperator.PRECISION_MULTIPLIER
            : 1.0;

        // Apply transform based on mode
        const selectedIds = selectionActions.getSelectedIds();
        for (const id of selectedIds) {
            const original = this.originalTransforms.get(id);
            if (!original) continue;

            if (this.mode === 'translate') {
                this.applyMouseTranslation(id, original, deltaX, deltaY, sensitivity);
            } else if (this.mode === 'rotate') {
                this.applyMouseRotation(id, original, deltaX, sensitivity);
            } else if (this.mode === 'scale') {
                this.applyMouseScale(id, original, deltaX, sensitivity);
            }
        }

        // Update last position
        this.lastMousePos = { x: event.clientX, y: event.clientY };

        // Sync selection outlines to follow the transformed mesh
        getSelectionManager().syncOutlines();

        // Update status with current value
        this.updateMouseStatus(deltaX, deltaY, sensitivity);

        return true;
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
     * Calculate pivot point (center of all selected objects)
     */
    private calculatePivotPoint(): void {
        const selectedIds = selectionActions.getSelectedIds();
        if (selectedIds.length === 0) {
            this.pivotPoint.set(0, 0, 0);
            return;
        }

        this.pivotPoint.set(0, 0, 0);
        let count = 0;

        for (const id of selectedIds) {
            const original = this.originalTransforms.get(id);
            if (original) {
                this.pivotPoint.add(original.position);
                count++;
            }
        }

        if (count > 0) {
            this.pivotPoint.divideScalar(count);
        }
    }

    /**
     * Apply translation based on mouse delta
     */
    private applyMouseTranslation(
        id: string,
        original: { position: THREE.Vector3 },
        deltaX: number,
        deltaY: number,
        sensitivity: number
    ): void {
        const newPosition = original.position.clone();
        const camera = getSceneManager().camera;

        // Get camera right and up vectors for screen-space translation
        const cameraRight = new THREE.Vector3();
        const cameraUp = new THREE.Vector3();
        camera.matrix.extractBasis(cameraRight, cameraUp, new THREE.Vector3());

        const translateAmount = TransformOperator.TRANSLATE_SENSITIVITY * sensitivity;

        if (this.axis === null) {
            // Free movement in screen space
            newPosition.addScaledVector(cameraRight, deltaX * translateAmount);
            newPosition.addScaledVector(cameraUp, -deltaY * translateAmount);
        } else if (this.excludeAxis) {
            // Plane constraint (move in all axes except the constrained one)
            const movement = new THREE.Vector3();
            movement.addScaledVector(cameraRight, deltaX * translateAmount);
            movement.addScaledVector(cameraUp, -deltaY * translateAmount);

            if (this.axis === 'X') movement.x = 0;
            if (this.axis === 'Y') movement.y = 0;
            if (this.axis === 'Z') movement.z = 0;

            newPosition.add(movement);
        } else {
            // Single axis constraint
            // Use X delta for horizontal axes, Y delta for vertical feel
            const axisVector = this.getAxisVector();
            const projectedDelta = this.projectMouseToAxis(deltaX, deltaY, axisVector);
            newPosition.addScaledVector(axisVector, projectedDelta * translateAmount);
        }

        getTransformService().updateTransform(id, { position: newPosition });

        // Sync mesh visually
        const mesh = getSceneManager().getMesh(id);
        if (mesh) {
            mesh.position.copy(newPosition);
        }
    }

    /**
     * Apply rotation based on mouse delta
     */
    private applyMouseRotation(
        id: string,
        original: { rotation: THREE.Euler },
        deltaX: number,
        sensitivity: number
    ): void {
        const angle = deltaX * TransformOperator.ROTATE_SENSITIVITY * sensitivity;
        const radians = THREE.MathUtils.degToRad(angle);
        const newRotation = original.rotation.clone();

        if (this.axis === null) {
            // Default to Z axis rotation (screen-space rotation)
            newRotation.z += radians;
        } else if (this.excludeAxis) {
            // Rotate around other axes
            if (this.axis !== 'X') newRotation.x += radians;
            if (this.axis !== 'Y') newRotation.y += radians;
            if (this.axis !== 'Z') newRotation.z += radians;
        } else {
            // Single axis rotation
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
     * Apply scale based on mouse delta
     */
    private applyMouseScale(
        id: string,
        original: { scale: THREE.Vector3 },
        deltaX: number,
        sensitivity: number
    ): void {
        // Scale factor based on horizontal mouse movement
        const scaleDelta = deltaX * TransformOperator.SCALE_SENSITIVITY * sensitivity;
        const scaleFactor = Math.max(0.01, 1 + scaleDelta);  // Prevent negative/zero scale
        const newScale = original.scale.clone();

        if (this.axis === null) {
            // Uniform scale
            newScale.multiplyScalar(scaleFactor);
        } else if (this.excludeAxis) {
            // Scale other axes
            if (this.axis !== 'X') newScale.x *= scaleFactor;
            if (this.axis !== 'Y') newScale.y *= scaleFactor;
            if (this.axis !== 'Z') newScale.z *= scaleFactor;
        } else {
            // Single axis scale
            if (this.axis === 'X') newScale.x = original.scale.x * scaleFactor;
            if (this.axis === 'Y') newScale.y = original.scale.y * scaleFactor;
            if (this.axis === 'Z') newScale.z = original.scale.z * scaleFactor;
        }

        getTransformService().updateTransform(id, { scale: newScale });

        // Sync mesh visually
        const mesh = getSceneManager().getMesh(id);
        if (mesh) {
            mesh.scale.copy(newScale);
        }
    }

    /**
     * Get unit vector for current axis constraint
     */
    private getAxisVector(): THREE.Vector3 {
        if (this.axis === 'X') return new THREE.Vector3(1, 0, 0);
        if (this.axis === 'Y') return new THREE.Vector3(0, 1, 0);
        if (this.axis === 'Z') return new THREE.Vector3(0, 0, 1);
        return new THREE.Vector3(1, 0, 0);  // Default
    }

    /**
     * Project mouse delta onto a world-space axis
     * Returns the magnitude of movement along that axis
     */
    private projectMouseToAxis(deltaX: number, deltaY: number, axisVector: THREE.Vector3): number {
        const camera = getSceneManager().camera;

        // Project the axis onto screen space
        const axisStart = this.pivotPoint.clone();
        const axisEnd = this.pivotPoint.clone().add(axisVector);

        // Convert to NDC
        axisStart.project(camera);
        axisEnd.project(camera);

        // Get screen direction of axis
        const screenDir = new THREE.Vector2(
            axisEnd.x - axisStart.x,
            axisEnd.y - axisStart.y
        ).normalize();

        // Normalize mouse delta
        const mouseDelta = new THREE.Vector2(deltaX, -deltaY);

        // Dot product to get movement along axis
        return mouseDelta.dot(screenDir);
    }

    /**
     * Update status bar with mouse-based transform value
     */
    private updateMouseStatus(deltaX: number, deltaY: number, sensitivity: number): void {
        let status = this.operatorName;

        if (this.axis) {
            if (this.excludeAxis) {
                const axes = ['X', 'Y', 'Z'].filter(a => a !== this.axis);
                status += ` (${axes.join('')} plane)`;
            } else {
                status += ` (${this.axis} axis)`;
            }
        }

        // Show calculated value
        let value: number;
        if (this.mode === 'translate') {
            value = Math.sqrt(deltaX * deltaX + deltaY * deltaY) *
                TransformOperator.TRANSLATE_SENSITIVITY * sensitivity;
            status += `: ${value.toFixed(2)} units`;
        } else if (this.mode === 'rotate') {
            value = deltaX * TransformOperator.ROTATE_SENSITIVITY * sensitivity;
            status += `: ${value.toFixed(1)}°`;
        } else if (this.mode === 'scale') {
            value = 1 + deltaX * TransformOperator.SCALE_SENSITIVITY * sensitivity;
            status += `: ${value.toFixed(2)}x`;
        }

        if (this.isPrecisionMode) {
            status += ' [Precision]';
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

        // Reset mouse tracking state
        this.startMousePos = null;
        this.lastMousePos = null;
        this.isPrecisionMode = false;

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
