import { Component, JSX, Show, createSignal, createEffect } from 'solid-js';
import { layoutStore, layoutActions } from '@/stores/layoutStore';

export interface CollapsibleSectionProps {
    /** Unique ID for this section (used for state persistence) */
    id: string;
    /** Section title displayed in header */
    title: string;
    /** Whether section is open by default (only used on first render) */
    defaultOpen?: boolean;
    /** Section content */
    children: JSX.Element;
    /** Optional icon to display before title */
    icon?: JSX.Element;
}

/**
 * CollapsibleSection - A section container that can be collapsed/expanded
 * 
 * Features:
 * - Click header to toggle
 * - Smooth height animation
 * - State persisted via layoutStore
 * - Chevron rotation animation
 */
export const CollapsibleSection: Component<CollapsibleSectionProps> = (props) => {
    // Check if this section is collapsed in the store
    const isCollapsed = () => layoutActions.isSectionCollapsed(props.id);

    // Handle initial default state (only on first mount if not in store)
    createEffect(() => {
        // This only runs once on mount
        if (props.defaultOpen === false && !layoutStore.collapsedSections.includes(props.id)) {
            // If defaultOpen is explicitly false and section isn't already in collapsed list,
            // we don't auto-collapse it - let the user control it
        }
    });

    const toggleCollapse = () => {
        layoutActions.toggleSection(props.id);
    };

    return (
        <div class="border-b border-surface-700/50 last:border-b-0">
            {/* Header - Always visible */}
            <button
                type="button"
                class="w-full flex items-center gap-2 px-3 py-2 
                       bg-surface-750 hover:bg-surface-700 
                       transition-colors duration-150
                       text-left cursor-pointer select-none"
                onClick={toggleCollapse}
            >
                {/* Chevron indicator */}
                <svg
                    class={`w-3 h-3 text-surface-400 transition-transform duration-200 ${isCollapsed() ? '-rotate-90' : 'rotate-0'
                        }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>

                {/* Optional icon */}
                <Show when={props.icon}>
                    <span class="text-surface-400">{props.icon}</span>
                </Show>

                {/* Title */}
                <span class="text-xs font-semibold text-surface-300 uppercase tracking-wider flex-1">
                    {props.title}
                </span>
            </button>

            {/* Content - Collapsible */}
            <div
                class={`overflow-hidden transition-all duration-200 ease-in-out ${isCollapsed() ? 'max-h-0 opacity-0' : 'max-h-[1000px] opacity-100'
                    }`}
            >
                <div class="p-3 space-y-3">
                    {props.children}
                </div>
            </div>
        </div>
    );
};
