import { Component, JSX, splitProps, createSignal } from 'solid-js';

export interface NumberInputProps {
    value: number;
    onChange: (value: number) => void;
    onCommit?: (value: number, originalValue: number) => void;
    label?: string;
    min?: number;
    max?: number;
    step?: number;
    disabled?: boolean;
    class?: string;
}

export const NumberInput: Component<NumberInputProps> = (props) => {
    const [local, rest] = splitProps(props, ['value', 'onChange', 'onCommit', 'label', 'min', 'max', 'step', 'disabled', 'class']);
    const [isFocused, setIsFocused] = createSignal(false);
    const [originalValue, setOriginalValue] = createSignal<number>(0);

    const handleInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (e) => {
        const value = parseFloat(e.currentTarget.value);
        if (!isNaN(value)) {
            let clampedValue = value;
            if (local.min !== undefined) clampedValue = Math.max(local.min, clampedValue);
            if (local.max !== undefined) clampedValue = Math.min(local.max, clampedValue);
            local.onChange(clampedValue);
        }
    };

    const handleCommit = (e: any) => {
        if (local.onCommit) {
            const value = parseFloat(e.currentTarget.value);
            if (!isNaN(value)) {
                let clampedValue = value;
                if (local.min !== undefined) clampedValue = Math.max(local.min, clampedValue);
                if (local.max !== undefined) clampedValue = Math.min(local.max, clampedValue);
                local.onCommit(clampedValue, originalValue());
            }
        }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    const handleFocus = () => {
        setIsFocused(true);
        setOriginalValue(local.value);
    };

    const handleWheel: JSX.EventHandler<HTMLInputElement, WheelEvent> = (e) => {
        if (!isFocused()) return;
        e.preventDefault();

        const step = local.step ?? 0.1;
        const delta = e.deltaY > 0 ? -step : step;
        let newValue = local.value + delta;

        if (local.min !== undefined) newValue = Math.max(local.min, newValue);
        if (local.max !== undefined) newValue = Math.min(local.max, newValue);

        // For wheel, original value is the value before THIS specific wheel event? 
        // Or should wheel be considered atomic? 
        // Usually wheel is a series of events. We can treat "start of focus" as original.
        const finalValue = Math.round(newValue * 1000) / 1000;
        local.onChange(finalValue);
        if (local.onCommit) local.onCommit(finalValue, originalValue());
    };

    return (
        <div class={`flex flex-col gap-1 ${local.class ?? ''}`}>
            {local.label && (
                <label class="text-xs font-medium text-surface-400 uppercase tracking-wider">
                    {local.label}
                </label>
            )}
            <input
                type="number"
                value={local.value.toFixed(2)}
                onInput={handleInput}
                onBlur={(e) => {
                    setIsFocused(false);
                    handleCommit(e);
                }}
                onKeyDown={handleKeyDown}
                onWheel={handleWheel}
                onFocus={handleFocus}
                step={local.step ?? 0.1}
                min={local.min}
                max={local.max}
                disabled={local.disabled}
                class={`
          w-full px-2 py-1.5 
          bg-surface-900 border border-surface-600 rounded 
          text-sm text-surface-100 text-right
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all duration-150
          [appearance:textfield]
          [&::-webkit-outer-spin-button]:appearance-none
          [&::-webkit-inner-spin-button]:appearance-none
        `}
            />
        </div>
    );
};

export interface Vector3InputProps {
    value: { x: number; y: number; z: number };
    onChange: (value: { x: number; y: number; z: number }) => void;
    onCommit?: (value: { x: number; y: number; z: number }, originalValue: { x: number; y: number; z: number }) => void;
    label?: string;
    step?: number;
    disabled?: boolean;
}

export const Vector3Input: Component<Vector3InputProps> = (props) => {
    // Store original value for each axis isn't enough, we need the whole vector
    const [originalValue, setOriginalValue] = createSignal<{ x: number; y: number; z: number }>({ x: 0, y: 0, z: 0 });

    const handleChange = (axis: 'x' | 'y' | 'z', value: number) => {
        props.onChange({
            ...props.value,
            [axis]: value,
        });
    };

    const handleCommit = (axis: 'x' | 'y' | 'z', value: number) => {
        if (props.onCommit) {
            props.onCommit({
                ...props.value,
                [axis]: value,
            }, originalValue());
        }
    };

    const handleFocus = () => {
        setOriginalValue({ ...props.value });
    };

    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
        }
    };

    return (
        <div class="space-y-2">
            {props.label && (
                <label class="text-xs font-medium text-surface-400 uppercase tracking-wider">
                    {props.label}
                </label>
            )}
            <div class="grid grid-cols-3 gap-2">
                <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-red-400">X</span>
                    <input
                        type="number"
                        value={props.value.x.toFixed(2)}
                        onInput={(e) => handleChange('x', parseFloat(e.currentTarget.value) || 0)}
                        onBlur={(e) => handleCommit('x', parseFloat(e.currentTarget.value) || 0)}
                        onFocus={handleFocus}
                        onKeyDown={handleKeyDown}
                        step={props.step ?? 0.1}
                        disabled={props.disabled}
                        class="w-full pl-6 pr-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-sm text-surface-100 text-right
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                   disabled:opacity-50 [appearance:textfield]
                   [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
                <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-green-400">Y</span>
                    <input
                        type="number"
                        value={props.value.y.toFixed(2)}
                        onInput={(e) => handleChange('y', parseFloat(e.currentTarget.value) || 0)}
                        onBlur={(e) => handleCommit('y', parseFloat(e.currentTarget.value) || 0)}
                        onFocus={handleFocus}
                        onKeyDown={handleKeyDown}
                        step={props.step ?? 0.1}
                        disabled={props.disabled}
                        class="w-full pl-6 pr-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-sm text-surface-100 text-right
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                   disabled:opacity-50 [appearance:textfield]
                   [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
                <div class="relative">
                    <span class="absolute left-2 top-1/2 -translate-y-1/2 text-xs font-bold text-blue-400">Z</span>
                    <input
                        type="number"
                        value={props.value.z.toFixed(2)}
                        onInput={(e) => handleChange('z', parseFloat(e.currentTarget.value) || 0)}
                        onBlur={(e) => handleCommit('z', parseFloat(e.currentTarget.value) || 0)}
                        onFocus={handleFocus}
                        onKeyDown={handleKeyDown}
                        step={props.step ?? 0.1}
                        disabled={props.disabled}
                        class="w-full pl-6 pr-2 py-1.5 bg-surface-900 border border-surface-600 rounded text-sm text-surface-100 text-right
                   focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent
                   disabled:opacity-50 [appearance:textfield]
                   [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    />
                </div>
            </div>
        </div>
    );
};
