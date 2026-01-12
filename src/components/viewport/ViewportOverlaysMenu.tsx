import { Component, Show } from 'solid-js';
import { uiStore, uiActions } from '@/stores/uiStore';
import { Checkbox } from '@/components/ui/Checkbox';

export const ViewportOverlaysMenu: Component = () => {
    return (
        <div class="flex flex-col gap-4 p-3 bg-surface-900 border border-surface-700 rounded-lg shadow-xl w-64 select-none">
            <div class="text-xs font-semibold text-surface-400 uppercase tracking-wider mb-1">
                Viewport Overlays
            </div>

            {/* Guides Section */}
            <div class="flex flex-col gap-2">
                <div class="text-[10px] uppercase text-surface-500 font-medium">Guides</div>
                <div class="flex items-center justify-between">
                    <Checkbox
                        label="Grid"
                        checked={uiStore.overlays.showGrid}
                        onChange={(v) => uiActions.setOverlay('showGrid', v)}
                    />
                    <Checkbox
                        label="Floor"
                        checked={uiStore.overlays.showFloor}
                        onChange={(v) => uiActions.setOverlay('showFloor', v)}
                    />
                </div>

                <div class="flex items-center gap-2 text-xs text-surface-300">
                    <span class="w-8">Axes</span>
                    <div class="flex items-center bg-surface-800 rounded overflow-hidden border border-surface-700">
                        <button
                            class={`px-2 py-0.5 hover:bg-surface-700 transition-colors ${uiStore.overlays.showAxisX ? 'text-red-400 bg-surface-700/50' : 'text-surface-500'}`}
                            onClick={() => uiActions.setOverlay('showAxisX', !uiStore.overlays.showAxisX)}
                        >
                            X
                        </button>
                        <div class="w-px h-3 bg-surface-700" />
                        <button
                            class={`px-2 py-0.5 hover:bg-surface-700 transition-colors ${uiStore.overlays.showAxisY ? 'text-green-400 bg-surface-700/50' : 'text-surface-500'}`}
                            onClick={() => uiActions.setOverlay('showAxisY', !uiStore.overlays.showAxisY)}
                        >
                            Y
                        </button>
                        <div class="w-px h-3 bg-surface-700" />
                        <button
                            class={`px-2 py-0.5 hover:bg-surface-700 transition-colors ${uiStore.overlays.showAxisZ ? 'text-blue-400 bg-surface-700/50' : 'text-surface-500'}`}
                            onClick={() => uiActions.setOverlay('showAxisZ', !uiStore.overlays.showAxisZ)}
                        >
                            Z
                        </button>
                    </div>
                </div>

                <div class="flex items-center gap-2 mt-1">
                    <div class="flex-1 bg-surface-800 rounded flex items-center px-2 py-1 border border-surface-700">
                        <span class="text-[10px] text-surface-400 mr-2">Scale</span>
                        <input
                            type="number"
                            step="0.1"
                            class="w-full bg-transparent text-right text-xs text-surface-200 outline-none"
                            value={uiStore.overlays.gridScale}
                            onInput={(e) => uiActions.setOverlay('gridScale', parseFloat(e.currentTarget.value))}
                        />
                    </div>
                    <div class="flex-1 bg-surface-800 rounded flex items-center px-2 py-1 border border-surface-700">
                        <span class="text-[10px] text-surface-400 mr-2">Subdiv</span>
                        <input
                            type="number"
                            step="1"
                            class="w-full bg-transparent text-right text-xs text-surface-200 outline-none"
                            value={uiStore.overlays.gridSubdivisions}
                            onInput={(e) => uiActions.setOverlay('gridSubdivisions', parseInt(e.currentTarget.value))}
                        />
                    </div>
                </div>

                <div class="grid grid-cols-2 gap-2 mt-1">
                    <Checkbox
                        label="Text Info"
                        checked={uiStore.overlays.showTextInfo}
                        onChange={(v) => uiActions.setOverlay('showTextInfo', v)}
                    />
                    <Checkbox
                        label="3D Cursor"
                        checked={uiStore.overlays.show3DCursor}
                        onChange={(v) => uiActions.setOverlay('show3DCursor', v)}
                    />
                    <Checkbox
                        label="Statistics"
                        checked={false}
                        disabled
                    />
                    <Checkbox
                        label="Annotations"
                        checked={uiStore.overlays.showAnnotations}
                        onChange={(v) => uiActions.setOverlay('showAnnotations', v)}
                    />
                </div>
            </div>

            <div class="h-px bg-surface-700 w-full" />

            {/* Objects Section */}
            <div class="flex flex-col gap-2">
                <div class="text-[10px] uppercase text-surface-500 font-medium">Objects</div>
                <div class="grid grid-cols-2 gap-2">
                    <Checkbox
                        label="Extras"
                        checked={uiStore.overlays.showExtras}
                        onChange={(v) => uiActions.setOverlay('showExtras', v)}
                    />
                    <Checkbox
                        label="Bones"
                        checked={false}
                        disabled
                    />
                    <Checkbox
                        label="Light Colors"
                        checked={false}
                        disabled
                    />
                    <Checkbox
                        label="Motion Paths"
                        checked={false}
                        disabled
                    />
                    <Checkbox
                        label="Origins"
                        checked={uiStore.overlays.showOrigins}
                        onChange={(v) => uiActions.setOverlay('showOrigins', v)}
                    />
                    <Checkbox
                        label="Relationship Lines"
                        checked={false}
                        disabled
                    />
                    <Checkbox
                        label="Outline Selected"
                        checked={uiStore.overlays.showOutlineSelected}
                        onChange={(v) => uiActions.setOverlay('showOutlineSelected', v)}
                    />
                    <Checkbox
                        label="Origins (All)"
                        checked={false}
                        disabled
                    />
                </div>
            </div>

            <div class="h-px bg-surface-700 w-full" />

            {/* Geometry Section */}
            <div class="flex flex-col gap-2">
                <div class="text-[10px] uppercase text-surface-500 font-medium">Geometry</div>
                <div class="flex items-center gap-2">
                    <Checkbox
                        checked={uiStore.overlays.showWireframe}
                        onChange={(v) => uiActions.setOverlay('showWireframe', v)}
                    />
                    <div class="flex-1 bg-surface-800 rounded flex items-center px-1 border border-surface-700">
                        <span class="text-xs text-surface-300 px-1">Wireframe</span>
                        <div class="flex-1" />
                        <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="1"
                            class="w-12 bg-transparent text-right text-xs text-surface-200 outline-none py-1"
                            value={uiStore.overlays.wireframeOpacity}
                            onInput={(e) => uiActions.setOverlay('wireframeOpacity', parseFloat(e.currentTarget.value))}
                        />
                    </div>
                </div>
                <Checkbox
                    label="Face Orientation"
                    checked={false}
                    disabled
                />
            </div>
        </div>
    );
};
