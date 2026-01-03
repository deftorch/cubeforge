import type { Cube, Transform } from '@/types';
import type { ShadingMode } from '@/core/viewport/ViewportShading';

/**
 * Event type definitions for CubeForge
 * Grouped by domain for clarity
 */

// Cube events
export interface CubeEvents {
    'cube:created': { cube: Cube };
    'cube:deleted': { cubeIds: string[] };
    'cube:updated': { cubeId: string; changes: Partial<Cube> };
    'cube:transformed': { cubeId: string; transform: Partial<Transform> };
    'cube:material-changed': { cubeId: string; material: Partial<Cube['material']> };
    'cube:visibility-changed': { cubeId: string; visible: boolean };
    'cube:locked-changed': { cubeId: string; locked: boolean };
}

// Selection events
export interface SelectionEvents {
    'selection:changed': { selectedIds: string[]; previousIds: string[] };
    'selection:cleared': {};
    'selection:hovered': { cubeId: string | null };
}

// Viewport events
export interface ViewportEvents {
    'viewport:mode-changed': { mode: ShadingMode };
    'viewport:xray-toggled': { enabled: boolean };
    'viewport:grid-toggled': { visible: boolean };
}

// Transform events
export interface TransformEvents {
    'transform:mode-changed': { mode: 'translate' | 'rotate' | 'scale' };
    'transform:space-changed': { space: 'local' | 'world' };
    'transform:started': { cubeId: string };
    'transform:ended': { cubeId: string };
}

// Tool events
export interface ToolEvents {
    'tool:changed': { tool: string };
    'tool:activated': { tool: string };
    'tool:deactivated': { tool: string };
}

// History events
export interface HistoryEvents {
    'history:undo': {};
    'history:redo': {};
    'history:command-executed': { description: string };
}

// Combined event map
export interface EventMap extends
    CubeEvents,
    SelectionEvents,
    ViewportEvents,
    TransformEvents,
    ToolEvents,
    HistoryEvents { }

export type EventName = keyof EventMap;
export type EventPayload<T extends EventName> = EventMap[T];
