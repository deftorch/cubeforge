import { createStore } from 'solid-js/store';

/**
 * Layout Store - Manages panel sizes, visibility, and section collapse states
 * Persisted to localStorage for user preference retention
 */

const STORAGE_KEY = 'cubeforge-layout';

// Default layout configuration
const DEFAULT_LAYOUT = {
    // Panel widths (in pixels)
    leftPanelWidth: 256,
    rightPanelWidth: 288,

    // Panel visibility
    showLeftPanel: true,
    showRightPanel: true,
    showStatusBar: true,

    // Collapsed sections (section IDs)
    collapsedSections: [] as string[],
} as const;

// Constraints
export const PANEL_CONSTRAINTS = {
    left: { min: 200, max: 400 },
    right: { min: 250, max: 450 },
} as const;

export interface LayoutState {
    leftPanelWidth: number;
    rightPanelWidth: number;
    showLeftPanel: boolean;
    showRightPanel: boolean;
    showStatusBar: boolean;
    collapsedSections: string[];
}

/**
 * Load layout from localStorage
 */
function loadLayout(): LayoutState {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            return {
                ...DEFAULT_LAYOUT,
                ...parsed,
                collapsedSections: parsed.collapsedSections ?? [],
            };
        }
    } catch (e) {
        console.warn('Failed to load layout from localStorage:', e);
    }
    return { ...DEFAULT_LAYOUT, collapsedSections: [...DEFAULT_LAYOUT.collapsedSections] };
}

/**
 * Save layout to localStorage
 */
function saveLayout(state: LayoutState): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
        console.warn('Failed to save layout to localStorage:', e);
    }
}

// Create store with initial state from localStorage
const [layoutStore, setLayoutStore] = createStore<LayoutState>(loadLayout());

// Layout Actions
export const layoutActions = {
    /**
     * Set left panel width (clamped to constraints)
     */
    setLeftPanelWidth(width: number) {
        const clamped = Math.max(
            PANEL_CONSTRAINTS.left.min,
            Math.min(PANEL_CONSTRAINTS.left.max, width)
        );
        setLayoutStore('leftPanelWidth', clamped);
        saveLayout(layoutStore);
    },

    /**
     * Set right panel width (clamped to constraints)
     */
    setRightPanelWidth(width: number) {
        const clamped = Math.max(
            PANEL_CONSTRAINTS.right.min,
            Math.min(PANEL_CONSTRAINTS.right.max, width)
        );
        setLayoutStore('rightPanelWidth', clamped);
        saveLayout(layoutStore);
    },

    /**
     * Toggle left panel visibility
     */
    toggleLeftPanel() {
        setLayoutStore('showLeftPanel', (prev) => !prev);
        saveLayout(layoutStore);
    },

    /**
     * Toggle right panel visibility
     */
    toggleRightPanel() {
        setLayoutStore('showRightPanel', (prev) => !prev);
        saveLayout(layoutStore);
    },

    /**
     * Toggle status bar visibility
     */
    toggleStatusBar() {
        setLayoutStore('showStatusBar', (prev) => !prev);
        saveLayout(layoutStore);
    },

    /**
     * Set panel visibility directly
     */
    setLeftPanelVisible(visible: boolean) {
        setLayoutStore('showLeftPanel', visible);
        saveLayout(layoutStore);
    },

    setRightPanelVisible(visible: boolean) {
        setLayoutStore('showRightPanel', visible);
        saveLayout(layoutStore);
    },

    /**
     * Toggle section collapse state
     */
    toggleSection(sectionId: string) {
        setLayoutStore('collapsedSections', (sections) => {
            const isCollapsed = sections.includes(sectionId);
            const newSections = isCollapsed
                ? sections.filter((id) => id !== sectionId)
                : [...sections, sectionId];
            return newSections;
        });
        saveLayout(layoutStore);
    },

    /**
     * Check if a section is collapsed
     */
    isSectionCollapsed(sectionId: string): boolean {
        return layoutStore.collapsedSections.includes(sectionId);
    },

    /**
     * Collapse a section
     */
    collapseSection(sectionId: string) {
        if (!layoutStore.collapsedSections.includes(sectionId)) {
            setLayoutStore('collapsedSections', (sections) => [...sections, sectionId]);
            saveLayout(layoutStore);
        }
    },

    /**
     * Expand a section
     */
    expandSection(sectionId: string) {
        if (layoutStore.collapsedSections.includes(sectionId)) {
            setLayoutStore('collapsedSections', (sections) =>
                sections.filter((id) => id !== sectionId)
            );
            saveLayout(layoutStore);
        }
    },

    /**
     * Reset layout to defaults
     */
    resetLayout() {
        setLayoutStore({
            ...DEFAULT_LAYOUT,
            collapsedSections: [...DEFAULT_LAYOUT.collapsedSections],
        });
        saveLayout(layoutStore);
    },
};

export { layoutStore, setLayoutStore };
