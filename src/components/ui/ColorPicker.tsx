import { Component, createSignal, createEffect, Show } from 'solid-js';
import { hexToHsv, hsvToHex, hexToRgb, rgbToHex, clamp } from '@/utils/colorUtils';
import { ColorWheel } from './ColorWheel';
import { HorizontalSlider } from './HorizontalSlider';

export interface ColorPickerProps {
    value: string;
    onChange: (color: string) => void;
    onCommit?: (color: string, originalColor: string) => void;
    label?: string;
    disabled?: boolean;
    class?: string;
}

type ColorMode = 'RGB' | 'HSV' | 'Hex';

/**
 * Blender-style color picker with:
 * - Horizontal color bar (click to expand inline)
 * - Circular color wheel
 * - RGB/HSV/Hex tabs
 * - Horizontal sliders for values
 */
export const ColorPicker: Component<ColorPickerProps> = (props) => {
    const [hsv, setHsv] = createSignal({ h: 0, s: 100, v: 100 });
    const [originalValue, setOriginalValue] = createSignal<string>('');
    const [isPickerOpen, setIsPickerOpen] = createSignal(false);
    const [colorMode, setColorMode] = createSignal<ColorMode>('HSV');
    const [hexInput, setHexInput] = createSignal('');

    // Sync HSV state when external value changes
    createEffect(() => {
        const newHsv = hexToHsv(props.value);
        setHsv(newHsv);
        setHexInput(props.value.toUpperCase());
    });

    const togglePicker = () => {
        if (props.disabled) return;

        if (!isPickerOpen()) {
            // Opening
            setOriginalValue(props.value);
            setIsPickerOpen(true);
        } else {
            // Closing
            const currentColor = hsvToHex(hsv().h, hsv().s, hsv().v);
            if (props.onCommit && currentColor.toLowerCase() !== originalValue().toLowerCase()) {
                props.onCommit(currentColor, originalValue());
            }
            setIsPickerOpen(false);
        }
    };

    // Update color from HSV
    const updateColorFromHsv = (h: number, s: number, v: number) => {
        const newColor = hsvToHex(h, s, v);
        setHsv({ h, s, v });
        setHexInput(newColor.toUpperCase());
        props.onChange(newColor);
    };

    // Handle wheel change
    const handleWheelChange = (h: number, s: number, v: number) => {
        updateColorFromHsv(h, s, v);
    };

    // Handle hex input
    const handleHexInput = (e: Event) => {
        const value = (e.target as HTMLInputElement).value.toUpperCase();
        setHexInput(value);

        if (/^#[0-9A-F]{6}$/i.test(value)) {
            const newHsv = hexToHsv(value);
            setHsv(newHsv);
            props.onChange(value);
        }
    };

    // Handle RGB changes
    const handleRgbChange = (component: 'r' | 'g' | 'b', value: number) => {
        const rgb = hexToRgb(props.value);
        rgb[component] = clamp(Math.round(value), 0, 255);
        const newHex = rgbToHex(rgb.r, rgb.g, rgb.b);
        const newHsv = hexToHsv(newHex);
        setHsv(newHsv);
        setHexInput(newHex.toUpperCase());
        props.onChange(newHex);
    };

    // Handle HSV changes
    const handleHsvChange = (component: 'h' | 's' | 'v', value: number) => {
        const current = hsv();
        const newHsv = { ...current };

        if (component === 'h') {
            newHsv.h = clamp(Math.round(value), 0, 360);
        } else {
            newHsv[component] = clamp(Math.round(value), 0, 100);
        }

        updateColorFromHsv(newHsv.h, newHsv.s, newHsv.v);
    };

    const rgb = () => hexToRgb(props.value);

    return (
        <div class={`relative ${props.class ?? ''}`}>
            {/* Color bar (click to toggle) - aligned with HorizontalSlider */}
            <div class="flex items-center gap-2 h-6">
                {/* Label */}
                {props.label && (
                    <span class="text-xs text-surface-400 w-16 flex-shrink-0">
                        {props.label}
                    </span>
                )}

                {/* Color bar */}
                <button
                    type="button"
                    onClick={togglePicker}
                    disabled={props.disabled}
                    class="flex-1 h-full rounded border border-surface-600 transition-all duration-150 hover:border-surface-400 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ "background-color": props.value }}
                    title={isPickerOpen() ? "Click to close color picker" : "Click to open color picker"}
                />

                {/* Chevron indicator to show expandability */}
                <button
                    type="button"
                    onClick={togglePicker}
                    class="w-4 h-4 flex items-center justify-center text-surface-400 hover:text-surface-200 focus:outline-none"
                >
                    <svg
                        class={`w-3 h-3 transition-transform duration-200 ${isPickerOpen() ? 'rotate-180' : ''}`}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path d="M6 9l6 6 6-6" />
                    </svg>
                </button>
            </div>

            {/* Inline Color picker content */}
            <Show when={isPickerOpen()}>
                <div class="mt-2 mb-4 p-3 bg-surface-800 border border-surface-600 rounded-lg shadow-inner">
                    {/* Color wheel */}
                    <div class="flex justify-center mb-3">
                        <ColorWheel
                            hue={hsv().h}
                            saturation={hsv().s}
                            value={hsv().v}
                            onChange={handleWheelChange}
                            size={180}
                        />
                    </div>

                    {/* Mode tabs */}
                    <div class="flex gap-1 mb-3">
                        {(['RGB', 'HSV', 'Hex'] as ColorMode[]).map((mode) => (
                            <button
                                type="button"
                                onClick={() => setColorMode(mode)}
                                class={`flex-1 py-1.5 text-xs font-medium rounded transition-colors ${colorMode() === mode
                                    ? 'bg-surface-600 text-surface-100'
                                    : 'bg-surface-700 text-surface-400 hover:text-surface-200'
                                    }`}
                            >
                                {mode}
                            </button>
                        ))}
                    </div>

                    {/* Sliders based on mode */}
                    <div class="space-y-2 w-full">
                        <Show when={colorMode() === 'HSV'}>
                            <HorizontalSlider
                                label="Hue"
                                value={hsv().h}
                                min={0}
                                max={360}
                                step={1}
                                precision={0}
                                onChange={(v) => handleHsvChange('h', v)}
                                fillColor={`hsl(${hsv().h}, 100%, 50%)`}
                            />
                            <HorizontalSlider
                                label="Saturation"
                                value={hsv().s / 100}
                                min={0}
                                max={1}
                                step={0.001}
                                precision={3}
                                onChange={(v) => handleHsvChange('s', v * 100)}
                                fillColor={hsvToHex(hsv().h, 100, hsv().v)}
                            />
                            <HorizontalSlider
                                label="Value"
                                value={hsv().v / 100}
                                min={0}
                                max={1}
                                step={0.001}
                                precision={3}
                                onChange={(v) => handleHsvChange('v', v * 100)}
                                fillColor={hsvToHex(hsv().h, hsv().s, 100)}
                            />
                        </Show>

                        <Show when={colorMode() === 'RGB'}>
                            <HorizontalSlider
                                label="Red"
                                value={rgb().r}
                                min={0}
                                max={255}
                                step={1}
                                precision={0}
                                onChange={(v) => handleRgbChange('r', v)}
                                fillColor="#ff4444"
                            />
                            <HorizontalSlider
                                label="Green"
                                value={rgb().g}
                                min={0}
                                max={255}
                                step={1}
                                precision={0}
                                onChange={(v) => handleRgbChange('g', v)}
                                fillColor="#44ff44"
                            />
                            <HorizontalSlider
                                label="Blue"
                                value={rgb().b}
                                min={0}
                                max={255}
                                step={1}
                                precision={0}
                                onChange={(v) => handleRgbChange('b', v)}
                                fillColor="#4444ff"
                            />
                        </Show>

                        <Show when={colorMode() === 'Hex'}>
                            <div class="flex items-center gap-2 h-6">
                                <span class="text-xs text-surface-400 w-16 flex-shrink-0">Hex</span>
                                <div class="relative flex-1 h-full">
                                    <input
                                        type="text"
                                        value={hexInput()}
                                        onInput={handleHexInput}
                                        maxLength={7}
                                        class="w-full h-full px-2 bg-surface-700 border border-surface-600 rounded text-xs text-surface-100 font-mono text-center focus:outline-none focus:ring-1 focus:ring-primary-500"
                                    />
                                </div>
                                {/* Dot indicator */}
                                <div class="w-2 h-2 rounded-full bg-surface-600 flex-shrink-0" />
                            </div>
                        </Show>

                        {/* Alpha (always visible - not editable) */}
                        <div class="flex items-center gap-2 h-6" title="Alpha channel not supported for mesh colors">
                            <span class="text-xs text-surface-400 w-16 flex-shrink-0">Alpha</span>
                            <div class="flex-1 h-full rounded bg-surface-700 border border-surface-600 flex items-center justify-center opacity-60 cursor-not-allowed">
                                <span class="text-xs text-surface-400 font-mono">1.000</span>
                            </div>
                            {/* Dot indicator */}
                            <div class="w-2 h-2 rounded-full bg-surface-600 flex-shrink-0" />
                        </div>
                    </div>

                    {/* Eyedropper button */}
                    <div class="mt-3 flex justify-end">
                        <button
                            type="button"
                            class="p-1.5 text-surface-400 hover:text-surface-200 hover:bg-surface-700 rounded transition-colors opacity-50 cursor-not-allowed"
                            title="Eyedropper (coming soon)"
                            disabled
                        >
                            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M2 22L6.5 17.5" />
                                <path d="M5.5 14.5L9.5 18.5" />
                                <path d="M9.5 14.5L14 19L19 14L9 4L4 9L9.5 14.5Z" />
                                <path d="M14 4L20 10" />
                                <circle cx="19" cy="5" r="2" />
                            </svg>
                        </button>
                    </div>
                </div>
            </Show>
        </div>
    );
};

