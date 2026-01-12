import { Component, createSignal, createEffect, onCleanup, Show, For } from 'solid-js';
import { getViewportShading, ShadingMode } from '@/core/viewport/ViewportShading';
import { getViewController } from '@/core/viewport/ViewController';
import { getPivotController, PivotMode } from '@/core/transform/PivotController';
import { uiStore } from '@/stores/uiStore';
import { ViewportOverlaysMenu } from './ViewportOverlaysMenu';

// Icons
const OverlaysIcon = () => (
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="9" />
        <path d="M9 12h6" />
        <path d="M12 9v6" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const SolidIcon = () => (
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M21 16.5c0 .38-.21.71-.53.88l-7.9 4.44c-.16.12-.36.18-.57.18-.21 0-.41-.06-.57-.18l-7.9-4.44A.991.991 0 013 16.5v-9c0-.38.21-.71.53-.88l7.9-4.44c.16-.12.36-.18.57-.18.21 0 .41.06.57.18l7.9 4.44c.32.17.53.5.53.88v9z" />
    </svg>
);

const WireframeIcon = () => (
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M21 16.5l-7.9 4.44c-.35.2-.75.2-1.1 0L4.1 16.5" />
        <path d="M3.1 7.5l7.9-4.44c.35-.2.75-.2 1.1 0l7.9 4.44" />
        <path d="M3 7.5v9M21 7.5v9M12 2.12v19.76" />
        <path d="M12 12l9-5.06M12 12l-9-5.06" />
    </svg>
);

const MaterialIcon = () => (
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
        <circle cx="12" cy="12" r="10" fill="url(#gradient)" />
        <defs>
            <radialGradient id="gradient" cx="30%" cy="30%">
                <stop offset="0%" stop-color="#fff" />
                <stop offset="100%" stop-color="#888" />
            </radialGradient>
        </defs>
    </svg>
);

const XRayIcon = () => (
    <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 5v2M12 17v2M5 12h2M17 12h2" opacity="0.5" />
        <circle cx="12" cy="12" r="9" stroke-dasharray="3 3" />
    </svg>
);

interface ShadingOption {
    id: ShadingMode;
    label: string;
    icon: Component;
    shortcut: string;
}

const shadingOptions: ShadingOption[] = [
    { id: 'solid', label: 'Solid', icon: SolidIcon, shortcut: 'Z' },
    { id: 'wireframe', label: 'Wireframe', icon: WireframeIcon, shortcut: 'Z' },
    { id: 'material', label: 'Material', icon: MaterialIcon, shortcut: '' },
];

/**
 * Viewport Header with shading controls and view info
 */
export const ViewportHeader: Component = () => {
    const viewportShading = getViewportShading();
    const viewController = getViewController();
    const pivotController = getPivotController();

    const [currentMode, setCurrentMode] = createSignal<ShadingMode>(viewportShading.getMode());
    const [xRayEnabled, setXRayEnabled] = createSignal(viewportShading.isXRayEnabled());
    const [showDropdown, setShowDropdown] = createSignal(false);

    // Update on changes
    createEffect(() => {
        const interval = setInterval(() => {
            setCurrentMode(viewportShading.getMode());
            setXRayEnabled(viewportShading.isXRayEnabled());
        }, 100);

        onCleanup(() => clearInterval(interval));
    });

    const handleModeChange = (mode: ShadingMode) => {
        viewportShading.setMode(mode);
        setCurrentMode(mode);
        setShowDropdown(false);
    };

    const toggleXRay = () => {
        viewportShading.toggleXRay();
        setXRayEnabled(viewportShading.isXRayEnabled());
    };

    const CurrentIcon = () => {
        const option = shadingOptions.find(o => o.id === currentMode());
        return option ? <option.icon /> : <SolidIcon />;
    };

    return (
        <div class="absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-surface-900/90 to-transparent 
                flex items-center px-4 gap-4 pointer-events-auto z-20">
            {/* View preset indicator */}
            <Show when={uiStore.overlays.showTextInfo}>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-surface-400">View:</span>
                    <span class="text-xs font-medium text-surface-200 uppercase">
                        {viewController.getCurrentPreset()}
                    </span>
                    <span class="text-xs text-surface-500">
                        ({viewController.getProjectionType() === 'perspective' ? 'Persp' : 'Ortho'})
                    </span>
                </div>
                <div class="w-px h-4 bg-surface-700" />
            </Show>

            {/* Shading mode selector */}
            <div class="relative">
                <button
                    class={`flex items-center gap-1.5 px-2 py-1 rounded text-xs
                  transition-colors ${showDropdown() ? 'bg-surface-700' : 'hover:bg-surface-800'}`}
                    onClick={() => setShowDropdown(!showDropdown())}
                >
                    <CurrentIcon />
                    <span class="text-surface-300 capitalize">{currentMode()}</span>
                    <svg class="w-3 h-3 text-surface-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Dropdown */}
                <Show when={showDropdown()}>
                    <div class="absolute top-full left-0 mt-1 bg-surface-800 border border-surface-700 
                      rounded-lg shadow-xl overflow-hidden z-50">
                        <For each={shadingOptions}>
                            {(option) => (
                                <button
                                    class={`flex items-center gap-2 w-full px-3 py-2 text-xs text-left
                          transition-colors hover:bg-surface-700
                          ${currentMode() === option.id ? 'bg-primary-600/20 text-primary-300' : 'text-surface-300'}`}
                                    onClick={() => handleModeChange(option.id)}
                                >
                                    <option.icon />
                                    <span class="flex-1">{option.label}</span>
                                    <Show when={option.shortcut}>
                                        <span class="text-surface-500">{option.shortcut}</span>
                                    </Show>
                                </button>
                            )}
                        </For>
                    </div>
                </Show>
            </div>

            {/* Overlays Menu */}
            <div class="relative group">
                <button
                    class="flex items-center gap-1.5 px-2 py-1 rounded text-xs text-surface-400 hover:bg-surface-800 hover:text-surface-200 transition-colors"
                    title="Viewport Overlays"
                    onClick={() => {
                        const el = document.getElementById('overlays-menu');
                        if (el) el.classList.toggle('hidden');
                    }}
                >
                    <div class="flex items-center gap-1">
                        <OverlaysIcon />
                        <svg class="w-2.5 h-2.5 text-surface-500" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" />
                        </svg>
                    </div>
                </button>
                <div id="overlays-menu" class="hidden absolute top-full left-0 mt-1 z-50">
                    <ViewportOverlaysMenu />
                </div>
                {/* Close menu when clicking outside - simple implementation */}
                <div
                    class="fixed inset-0 z-40 hidden"
                    onClick={(e) => {
                        const menu = document.getElementById('overlays-menu');
                        const toggle = e.currentTarget as HTMLElement;
                        if (menu && !menu.classList.contains('hidden')) {
                            menu.classList.add('hidden');
                            toggle.classList.add('hidden');
                        }
                    }}
                    ref={(el) => {
                        // Hook up to button click to show this overlay
                        const btn = el.parentElement?.querySelector('button');
                        btn?.addEventListener('click', () => {
                            el.classList.toggle('hidden');
                        });
                    }}
                />
            </div>

            {/* X-Ray toggle */}
            <button
                class={`flex items-center gap-1.5 px-2 py-1 rounded text-xs transition-colors
                ${xRayEnabled()
                        ? 'bg-primary-600/30 text-primary-300 ring-1 ring-primary-500/50'
                        : 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'}`}
                onClick={toggleXRay}
                title="Toggle X-Ray (Alt+Z)"
            >
                <XRayIcon />
                <span>X-Ray</span>
            </button>

            <div class="flex-1" />

            {/* Transform info */}
            <div class="flex items-center gap-2 text-xs text-surface-500">
                <span>Pivot: <span class="text-surface-300">{pivotController.getModeDisplayName()}</span></span>
            </div>
        </div >
    );
};

/**
 * Viewport Footer with stats and shortcuts
 */
export const ViewportFooter: Component<{ cubeCount: number; selectedCount: number }> = (props) => {
    const [fps, setFps] = createSignal(60);
    let frameCount = 0;
    let lastTime = performance.now();

    // FPS counter
    createEffect(() => {
        let animationId: number;

        const measureFPS = () => {
            frameCount++;
            const now = performance.now();

            if (now - lastTime >= 1000) {
                setFps(Math.round(frameCount * 1000 / (now - lastTime)));
                frameCount = 0;
                lastTime = now;
            }

            animationId = requestAnimationFrame(measureFPS);
        };

        animationId = requestAnimationFrame(measureFPS);

        onCleanup(() => {
            cancelAnimationFrame(animationId);
        });
    });

    const fpsColor = () => {
        if (fps() >= 50) return 'text-green-400';
        if (fps() >= 30) return 'text-yellow-400';
        return 'text-red-400';
    };

    return (
        <div class="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-surface-900/90 to-transparent
                flex items-center px-4 gap-4 pointer-events-auto z-20">
            {/* Stats */}
            <Show when={uiStore.overlays.showTextInfo}>
                <div class="flex items-center gap-3 text-xs font-mono">
                    <span class={fpsColor()}>
                        <span class="text-surface-500">FPS:</span> {fps()}
                    </span>
                    <span class="text-surface-400">
                        <span class="text-surface-500">Cubes:</span> {props.cubeCount}
                    </span>
                    <span class="text-surface-400">
                        <span class="text-surface-500">Selected:</span> {props.selectedCount}
                    </span>
                </div>
            </Show>

            <div class="flex-1" />

            {/* Quick reference */}
            <div class="flex items-center gap-3 text-[10px] text-surface-500">
                <span><kbd class="px-1 bg-surface-700 rounded">G</kbd> Move</span>
                <span><kbd class="px-1 bg-surface-700 rounded">R</kbd> Rotate</span>
                <span><kbd class="px-1 bg-surface-700 rounded">S</kbd> Scale</span>
                <span><kbd class="px-1 bg-surface-700 rounded">B</kbd> Box Select</span>
            </div>
        </div>
    );
};
