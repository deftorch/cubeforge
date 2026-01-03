import { Component, createSignal, createEffect, onMount, onCleanup } from 'solid-js';
import { clamp } from '@/utils/colorUtils';

export interface ColorWheelProps {
    /** Hue value 0-360 */
    hue: number;
    /** Saturation value 0-100 */
    saturation: number;
    /** Value/Brightness 0-100 */
    value: number;
    /** Called when any HSV value changes */
    onChange: (h: number, s: number, v: number) => void;
    /** Size of the wheel in pixels */
    size?: number;
    disabled?: boolean;
}

/**
 * Blender-style circular color wheel picker.
 * - Wheel: Hue around the circle, Saturation from center to edge
 * - Separate vertical slider: Value/Brightness
 */
export const ColorWheel: Component<ColorWheelProps> = (props) => {
    const [isDraggingWheel, setIsDraggingWheel] = createSignal(false);
    const [isDraggingValue, setIsDraggingValue] = createSignal(false);

    let wheelCanvasRef: HTMLCanvasElement | undefined;
    let wheelContainerRef: HTMLDivElement | undefined;
    let valueSliderRef: HTMLDivElement | undefined;

    const size = () => props.size ?? 180;
    const wheelRadius = () => size() / 2;
    const centerX = () => size() / 2;
    const centerY = () => size() / 2;

    // Draw the color wheel (Hue + Saturation)
    const drawWheel = () => {
        if (!wheelCanvasRef) return;
        const ctx = wheelCanvasRef.getContext('2d');
        if (!ctx) return;

        const s = size();
        const cx = centerX();
        const cy = centerY();
        const radius = wheelRadius() - 2;

        ctx.clearRect(0, 0, s, s);

        // Draw wheel pixel by pixel for accurate HSV
        const imgData = ctx.createImageData(s, s);
        const data = imgData.data;

        for (let y = 0; y < s; y++) {
            for (let x = 0; x < s; x++) {
                const dx = x - cx;
                const dy = y - cy;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist <= radius) {
                    // Hue from angle (0-360)
                    let hue = Math.atan2(dy, dx) * 180 / Math.PI + 90;
                    if (hue < 0) hue += 360;

                    // Saturation from distance (center = 0, edge = 100)
                    const saturation = (dist / radius) * 100;

                    // Apply current Value to the wheel
                    const rgb = hsvToRgbLocal(hue, saturation, props.value);
                    const idx = (y * s + x) * 4;
                    data[idx] = rgb.r;
                    data[idx + 1] = rgb.g;
                    data[idx + 2] = rgb.b;
                    data[idx + 3] = 255;
                }
            }
        }
        ctx.putImageData(imgData, 0, 0);
    };

    // Local HSV to RGB
    const hsvToRgbLocal = (h: number, s: number, v: number) => {
        h = h % 360;
        s = s / 100;
        v = v / 100;
        const c = v * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = v - c;
        let r = 0, g = 0, b = 0;
        if (h >= 0 && h < 60) { r = c; g = x; }
        else if (h >= 60 && h < 120) { r = x; g = c; }
        else if (h >= 120 && h < 180) { g = c; b = x; }
        else if (h >= 180 && h < 240) { g = x; b = c; }
        else if (h >= 240 && h < 300) { r = x; b = c; }
        else { r = c; b = x; }
        return {
            r: Math.round((r + m) * 255),
            g: Math.round((g + m) * 255),
            b: Math.round((b + m) * 255)
        };
    };

    // Redraw when value changes
    createEffect(() => {
        props.value; // Track value
        drawWheel();
    });

    onMount(() => {
        drawWheel();
        document.addEventListener('mousemove', handleGlobalMouseMove);
        document.addEventListener('mouseup', handleGlobalMouseUp);
    });

    onCleanup(() => {
        document.removeEventListener('mousemove', handleGlobalMouseMove);
        document.removeEventListener('mouseup', handleGlobalMouseUp);
    });

    // Handle wheel mouse down
    const handleWheelMouseDown = (e: MouseEvent) => {
        if (props.disabled) return;
        e.preventDefault();
        setIsDraggingWheel(true);
        updateHueSatFromMouse(e);
    };

    // Handle value slider mouse down
    const handleValueMouseDown = (e: MouseEvent) => {
        if (props.disabled) return;
        e.preventDefault();
        setIsDraggingValue(true);
        updateValueFromMouse(e);
    };

    const updateHueSatFromMouse = (e: MouseEvent) => {
        if (!wheelContainerRef) return;
        const rect = wheelContainerRef.getBoundingClientRect();
        const x = e.clientX - rect.left - centerX();
        const y = e.clientY - rect.top - centerY();

        // Calculate hue from angle
        let hue = Math.atan2(y, x) * 180 / Math.PI + 90;
        if (hue < 0) hue += 360;

        // Calculate saturation from distance
        const dist = Math.sqrt(x * x + y * y);
        const maxRadius = wheelRadius() - 2;
        const saturation = clamp((dist / maxRadius) * 100, 0, 100);

        props.onChange(Math.round(hue), Math.round(saturation), props.value);
    };

    const updateValueFromMouse = (e: MouseEvent) => {
        if (!valueSliderRef) return;
        const rect = valueSliderRef.getBoundingClientRect();
        const y = clamp(e.clientY - rect.top, 0, rect.height);
        const value = (1 - y / rect.height) * 100;

        props.onChange(props.hue, props.saturation, Math.round(value));
    };

    const handleGlobalMouseMove = (e: MouseEvent) => {
        if (isDraggingWheel()) {
            updateHueSatFromMouse(e);
        } else if (isDraggingValue()) {
            updateValueFromMouse(e);
        }
    };

    const handleGlobalMouseUp = () => {
        setIsDraggingWheel(false);
        setIsDraggingValue(false);
    };

    // Calculate HS cursor position on wheel
    const wheelCursorPos = () => {
        const angle = (props.hue - 90) * Math.PI / 180;
        const dist = (props.saturation / 100) * (wheelRadius() - 2);
        return {
            x: centerX() + Math.cos(angle) * dist,
            y: centerY() + Math.sin(angle) * dist
        };
    };

    // Get current color for cursor
    const currentColorHex = () => {
        const rgb = hsvToRgbLocal(props.hue, props.saturation, props.value);
        const toHex = (n: number) => n.toString(16).padStart(2, '0');
        return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
    };

    return (
        <div class="flex gap-3">
            {/* Color wheel (Hue + Saturation) */}
            <div
                ref={wheelContainerRef}
                class="relative"
                style={{ width: `${size()}px`, height: `${size()}px` }}
                onMouseDown={handleWheelMouseDown}
            >
                <canvas
                    ref={wheelCanvasRef}
                    width={size()}
                    height={size()}
                    class="cursor-crosshair rounded-full"
                />

                {/* HS cursor */}
                <div
                    class="absolute w-4 h-4 rounded-full border-2 border-white pointer-events-none"
                    style={{
                        left: `${wheelCursorPos().x}px`,
                        top: `${wheelCursorPos().y}px`,
                        transform: 'translate(-50%, -50%)',
                        "background-color": currentColorHex(),
                        "box-shadow": '0 0 0 1px rgba(0,0,0,0.5), 0 2px 4px rgba(0,0,0,0.3)'
                    }}
                />
            </div>

            {/* Value/Brightness slider */}
            <div
                ref={valueSliderRef}
                onMouseDown={handleValueMouseDown}
                class="relative w-5 rounded cursor-pointer"
                style={{
                    height: `${size()}px`,
                    background: `linear-gradient(to bottom, 
                        hsl(${props.hue}, ${props.saturation}%, 50%), 
                        #000
                    )`
                }}
            >
                {/* Value cursor */}
                <div
                    class="absolute left-0 right-0 h-2 border-2 border-white rounded pointer-events-none"
                    style={{
                        top: `${(1 - props.value / 100) * 100}%`,
                        transform: 'translateY(-50%)',
                        "background-color": currentColorHex(),
                        "box-shadow": '0 0 0 1px rgba(0,0,0,0.5)'
                    }}
                />
            </div>
        </div>
    );
};
