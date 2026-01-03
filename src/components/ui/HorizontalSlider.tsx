import { Component, createSignal, onMount, onCleanup } from 'solid-js';
import { clamp } from '@/utils/colorUtils';

export interface HorizontalSliderProps {
    label: string;
    value: number;
    min?: number;
    max?: number;
    step?: number;
    onChange: (value: number) => void;
    onCommit?: (value: number, originalValue: number) => void;
    disabled?: boolean;
    /** Color for the filled portion of the slider track */
    fillColor?: string;
    /** Show decimal places (default: 3) */
    precision?: number;
    class?: string;
}

/**
 * Blender-style horizontal slider with label on left and value on right.
 * The entire bar is draggable to change the value.
 */
export const HorizontalSlider: Component<HorizontalSliderProps> = (props) => {
    const [isDragging, setIsDragging] = createSignal(false);
    const [originalValue, setOriginalValue] = createSignal(0);
    const [isEditing, setIsEditing] = createSignal(false);
    const [editValue, setEditValue] = createSignal('');

    let trackRef: HTMLDivElement | undefined;
    let inputRef: HTMLInputElement | undefined;

    const min = () => props.min ?? 0;
    const max = () => props.max ?? 1;
    const step = () => props.step ?? 0.001;
    const precision = () => props.precision ?? 3;
    const fillColor = () => props.fillColor ?? '#4a9eff';

    // Calculate fill percentage
    const fillPercent = () => {
        const range = max() - min();
        if (range === 0) return 0;
        return ((props.value - min()) / range) * 100;
    };

    // Format value for display
    const displayValue = () => props.value.toFixed(precision());

    // Handle mouse down on track
    const handleMouseDown = (e: MouseEvent) => {
        if (props.disabled || isEditing()) return;
        e.preventDefault();
        setIsDragging(true);
        setOriginalValue(props.value);
        updateValueFromMouse(e);
    };

    // Update value from mouse position
    const updateValueFromMouse = (e: MouseEvent) => {
        if (!trackRef) return;
        const rect = trackRef.getBoundingClientRect();
        const x = clamp(e.clientX - rect.left, 0, rect.width);
        const percent = x / rect.width;
        const range = max() - min();
        let newValue = min() + percent * range;

        // Snap to step
        const stepVal = step();
        newValue = Math.round(newValue / stepVal) * stepVal;
        newValue = clamp(newValue, min(), max());

        props.onChange(newValue);
    };

    // Global mouse handlers
    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDragging()) {
            updateValueFromMouse(e);
        }
    };

    const handleGlobalMouseUp = () => {
        if (isDragging()) {
            setIsDragging(false);
            if (props.onCommit && props.value !== originalValue()) {
                props.onCommit(props.value, originalValue());
            }
        }
    };

    onMount(() => {
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    });

    onCleanup(() => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
    });

    // Handle double-click to edit value directly
    const handleDoubleClick = () => {
        if (props.disabled) return;
        setEditValue(displayValue());
        setIsEditing(true);
        setOriginalValue(props.value);
        // Focus input after render
        setTimeout(() => inputRef?.focus(), 0);
    };

    // Handle input change
    const handleInputChange = (e: Event) => {
        const value = (e.target as HTMLInputElement).value;
        setEditValue(value);
    };

    // Handle input blur or enter
    const handleInputCommit = () => {
        const parsed = parseFloat(editValue());
        if (!isNaN(parsed)) {
            const clamped = clamp(parsed, min(), max());
            props.onChange(clamped);
            if (props.onCommit) {
                props.onCommit(clamped, originalValue());
            }
        }
        setIsEditing(false);
    };

    const handleInputKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleInputCommit();
        } else if (e.key === 'Escape') {
            props.onChange(originalValue());
            setIsEditing(false);
        }
    };

    return (
        <div class={`flex items-center gap-2 h-6 ${props.class ?? ''}`}>
            {/* Label */}
            <span class="text-xs text-surface-400 w-16 flex-shrink-0">
                {props.label}
            </span>

            {/* Slider track */}
            <div
                ref={trackRef}
                onMouseDown={handleMouseDown}
                onDblClick={handleDoubleClick}
                class={`
                    relative flex-1 h-full rounded overflow-hidden cursor-ew-resize
                    bg-surface-700 border border-surface-600
                    ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                    ${isDragging() ? 'ring-1 ring-primary-500' : ''}
                `}
            >
                {/* Fill */}
                <div
                    class="absolute inset-y-0 left-0 pointer-events-none"
                    style={{
                        width: `${fillPercent()}%`,
                        "background-color": fillColor(),
                        opacity: 0.6
                    }}
                />

                {/* Value display or input */}
                <div class="absolute inset-0 flex items-center justify-center">
                    {isEditing() ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={editValue()}
                            onInput={handleInputChange}
                            onBlur={handleInputCommit}
                            onKeyDown={handleInputKeyDown}
                            class="w-16 text-center bg-surface-900 text-surface-100 text-xs border border-primary-500 rounded px-1 py-0.5"
                        />
                    ) : (
                        <span class="text-xs text-surface-200 font-mono select-none">
                            {displayValue()}
                        </span>
                    )}
                </div>
            </div>

            {/* Keyframe dot (Blender-style indicator) */}
            <div class="w-2 h-2 rounded-full bg-surface-600 flex-shrink-0" title="Not animated" />
        </div>
    );
};
