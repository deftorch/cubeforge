import { Component, createSignal, onCleanup } from 'solid-js';

export interface ResizeHandleProps {
    /** Which side of the viewport this handle is on */
    position: 'left' | 'right';
    /** Called during drag with the delta in pixels */
    onResize: (delta: number) => void;
    /** Called when drag ends */
    onResizeEnd?: () => void;
}

/**
 * ResizeHandle - Draggable handle for resizing panels
 * 
 * Features:
 * - Visual feedback on hover and drag
 * - Cursor change to indicate resizability
 * - Smooth drag tracking with proper cleanup
 */
export const ResizeHandle: Component<ResizeHandleProps> = (props) => {
    const [isDragging, setIsDragging] = createSignal(false);
    const [isHovered, setIsHovered] = createSignal(false);

    let startX = 0;

    const handleMouseDown = (e: MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        startX = e.clientX;
        setIsDragging(true);

        // Add global listeners
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        // Prevent text selection during drag
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'ew-resize';
    };

    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging()) return;

        const delta = e.clientX - startX;
        startX = e.clientX;

        // For left panel, positive delta = panel gets wider
        // For right panel, positive delta = panel gets narrower (inverted)
        const adjustedDelta = props.position === 'right' ? -delta : delta;
        props.onResize(adjustedDelta);
    };

    const handleMouseUp = () => {
        setIsDragging(false);

        // Remove global listeners
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);

        // Restore cursor and selection
        document.body.style.userSelect = '';
        document.body.style.cursor = '';

        props.onResizeEnd?.();
    };

    // Cleanup on unmount
    onCleanup(() => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        // Also restore body styles in case component unmounts during drag
        document.body.style.userSelect = '';
        document.body.style.cursor = '';
    });

    return (
        <div
            class={`
                w-2 h-full cursor-ew-resize transition-colors duration-150 flex-shrink-0
                ${isDragging()
                    ? 'bg-primary-500'
                    : isHovered()
                        ? 'bg-primary-500/50'
                        : 'bg-surface-700 hover:bg-surface-600'
                }
            `}
            onMouseDown={handleMouseDown}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            title="Drag to resize"
        />
    );
};

