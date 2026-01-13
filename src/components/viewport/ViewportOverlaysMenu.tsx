import { Component, Show } from 'solid-js';
import { uiStore, uiActions } from '@/stores/uiStore';
import { Checkbox } from '@/components/ui/Checkbox';

interface NumberInputProps {
    label?: string;
    value: number;
    onChange: (v: number) => void;
    step?: number;
    min?: number;
    max?: number;
    class?: string;
    disabled?: boolean;
}

const NumberInput: Component<NumberInputProps> = (props) => {
    return (
        <div class={`flex-1 bg-surface-800 rounded flex items-center px-2 py-1 border border-surface-700 hover:border-surface-600 transition-colors ${props.disabled ? 'opacity-50 cursor-not-allowed' : ''} ${props.class}`}>
            <Show when={props.label}>
                <span class="text-xs text-surface-300 mr-2 select-none whitespace-nowrap">{props.label}</span>
            </Show>
            <input
                type="number"
                step={props.step || 0.1}
                min={props.min}
                max={props.max}
                class="w-full bg-transparent text-right text-xs text-surface-200 outline-none p-0 focus:ring-0 border-none appearance-none m-0"
                value={props.value}
                disabled={props.disabled}
                onInput={(e) => props.onChange(parseFloat(e.currentTarget.value))}
            />
        </div>
    );
};

export const ViewportOverlaysMenu: Component = () => {
    return (
        <div class="flex flex-col gap-4 p-3 bg-surface-900 border border-surface-700 rounded-lg shadow-xl w-72 select-none text-surface-200">
            <div class="text-xs font-semibold text-surface-400 mb-1">
                Viewport Overlays
            </div>

            {/* Guides Section */}
            <div class="flex flex-col gap-2">
                <div class="text-[10px] text-surface-500 font-medium">Guides</div>
                <div class="flex items-center gap-4">
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

                    <div class="flex items-center gap-2 text-xs text-surface-400 ml-auto">
                        <span>Axes</span>
                        <div class="flex items-center bg-surface-800 rounded overflow-hidden border border-surface-700">
                            <button
                                class={`px-2 py-0.5 hover:bg-surface-700 transition-colors ${uiStore.overlays.showAxisX ? 'text-surface-200 bg-blue-600' : 'text-surface-500'}`}
                                onClick={() => uiActions.setOverlay('showAxisX', !uiStore.overlays.showAxisX)}
                            >
                                X
                            </button>
                            <div class="w-px h-3 bg-surface-700" />
                            <button
                                class={`px-2 py-0.5 hover:bg-surface-700 transition-colors ${uiStore.overlays.showAxisY ? 'text-surface-200 bg-blue-600' : 'text-surface-500'}`}
                                onClick={() => uiActions.setOverlay('showAxisY', !uiStore.overlays.showAxisY)}
                            >
                                Y
                            </button>
                            <div class="w-px h-3 bg-surface-700" />
                            <button
                                class={`px-2 py-0.5 hover:bg-surface-700 transition-colors ${uiStore.overlays.showAxisZ ? 'text-surface-200 bg-blue-600' : 'text-surface-500'}`}
                                onClick={() => uiActions.setOverlay('showAxisZ', !uiStore.overlays.showAxisZ)}
                            >
                                Z
                            </button>
                        </div>
                    </div>
                </div>


                <div class="flex items-center gap-2 mt-1">
                    <NumberInput
                        label="Scale"
                        value={uiStore.overlays.gridScale}
                        onChange={(v) => uiActions.setOverlay('gridScale', v)}
                    />
                    <NumberInput
                        label="Subdivisions"
                        value={uiStore.overlays.gridSubdivisions}
                        onChange={(v) => uiActions.setOverlay('gridSubdivisions', v)}
                        step={1}
                    />
                </div>

                <div class="grid grid-cols-2 gap-y-2 gap-x-4 mt-1">
                    <Checkbox
                        label="Text Info"
                        checked={uiStore.overlays.showTextInfo}
                        onChange={(v) => uiActions.setOverlay('showTextInfo', v)}
                    />
                    <Checkbox
                        label="3D Cursor"
                        checked={uiStore.overlays.show3DCursor}
                        onChange={(v) => uiActions.setOverlay('show3DCursor', v)}
                        disabled
                    />
                    <Checkbox
                        label="Statistics"
                        checked={uiStore.overlays.showStatistics}
                        onChange={(v) => uiActions.setOverlay('showStatistics', v)}
                    />
                    <Checkbox
                        label="Annotations"
                        checked={uiStore.overlays.showAnnotations}
                        onChange={(v) => uiActions.setOverlay('showAnnotations', v)}
                        disabled
                    />
                </div>
            </div>

            <div class="h-px bg-surface-700 w-full" />

            {/* Objects Section */}
            <div class="flex flex-col gap-2">
                <div class="text-[10px] text-surface-500 font-medium">Objects</div>
                <div class="grid grid-cols-2 gap-y-2 gap-x-4">
                    <Checkbox
                        label="Extras"
                        checked={uiStore.overlays.showExtras}
                        onChange={(v) => uiActions.setOverlay('showExtras', v)}
                        disabled
                    />
                    <Checkbox
                        label="Bones"
                        checked={uiStore.overlays.showBones}
                        onChange={(v) => uiActions.setOverlay('showBones', v)}
                        disabled
                    />
                    <Checkbox
                        label="Light Colors"
                        checked={uiStore.overlays.showLightColors}
                        onChange={(v) => uiActions.setOverlay('showLightColors', v)}
                        disabled
                    />
                    <Checkbox
                        label="Motion Paths"
                        checked={uiStore.overlays.showMotionPaths}
                        onChange={(v) => uiActions.setOverlay('showMotionPaths', v)}
                        disabled
                    />
                    <Checkbox
                        label="Relationship Lines"
                        checked={uiStore.overlays.showRelationshipLines}
                        onChange={(v) => uiActions.setOverlay('showRelationshipLines', v)}
                        disabled
                    />
                    <Checkbox
                        label="Origins"
                        checked={uiStore.overlays.showOrigins}
                        onChange={(v) => uiActions.setOverlay('showOrigins', v)}
                    />
                    <Checkbox
                        label="Outline Selected"
                        checked={uiStore.overlays.showOutlineSelected}
                        onChange={(v) => uiActions.setOverlay('showOutlineSelected', v)}
                    />
                    <Checkbox
                        label="Origins (All)"
                        checked={uiStore.overlays.showOriginsAll}
                        onChange={(v) => uiActions.setOverlay('showOriginsAll', v)}
                        disabled
                    />
                </div>
            </div>

            <div class="h-px bg-surface-700 w-full" />

            {/* Geometry Section */}
            <div class="flex flex-col gap-2">
                <div class="text-[10px] text-surface-500 font-medium">Geometry</div>
                <div class="flex items-center gap-2">
                    <Checkbox
                        checked={uiStore.overlays.showWireframe}
                        onChange={(v) => uiActions.setOverlay('showWireframe', v)}
                    />
                    <NumberInput
                        label="Wireframe"
                        value={uiStore.overlays.wireframeOpacity}
                        onChange={(v) => uiActions.setOverlay('wireframeOpacity', v)}
                        min={0}
                        max={1}
                        class="w-full"
                    />
                    <NumberInput
                        label="Opacity"
                        value={uiStore.overlays.geometryOpacity}
                        onChange={(v) => uiActions.setOverlay('geometryOpacity', v)}
                        min={0}
                        max={1}
                        class="w-full"
                    />
                </div>
                <Checkbox
                    label="Face Orientation"
                    checked={uiStore.overlays.showFaceOrientation}
                    onChange={(v) => uiActions.setOverlay('showFaceOrientation', v)}
                    disabled
                />
            </div>

             <div class="h-px bg-surface-700 w-full" />

            {/* Viewer Node Section */}
            <div class="flex flex-col gap-2">
                <div class="text-[10px] text-surface-500 font-medium">Viewer Node</div>
                <div class="flex items-center gap-2">
                    <Checkbox
                         checked={true}
                         onChange={() => {}}
                         disabled
                    />
                    <NumberInput
                        label="Color Opacity"
                        value={uiStore.overlays.viewerNodeColorOpacity}
                        onChange={(v) => uiActions.setOverlay('viewerNodeColorOpacity', v)}
                        min={0}
                        max={1}
                        class="w-full"
                        disabled
                    />
                </div>
                <Checkbox
                    label="Attribute Text"
                    checked={uiStore.overlays.showAttributeText}
                    onChange={(v) => uiActions.setOverlay('showAttributeText', v)}
                    disabled
                />
                <Checkbox
                    label="Motion Tracking"
                    checked={uiStore.overlays.showMotionTracking}
                    onChange={(v) => uiActions.setOverlay('showMotionTracking', v)}
                    disabled
                />
            </div>
        </div>
    );
};
