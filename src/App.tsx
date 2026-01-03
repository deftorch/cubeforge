import { Component, onMount, onCleanup } from 'solid-js';
import { Toolbar, LeftPanel, RightPanel, StatusBar, ResizeHandle } from '@/components/layout';
import { Viewport } from '@/components/viewport';
import { CoreProvider } from '@/components/CoreProvider';
import { layoutStore, layoutActions } from '@/stores/layoutStore';
import { registerDefaultShortcuts, unregisterShortcuts } from '@/core/input';
import { coreContext } from '@/core/CoreContext';

const App: Component = () => {
    // Setup keyboard shortcuts via KeyboardManager
    onMount(() => {
        registerDefaultShortcuts(coreContext.cubeManager, coreContext.selectionManager);
        // expose coreContext for debugging
        (window as any).__coreContext = coreContext;
    });

    // Cleanup on unmount
    onCleanup(() => {
        unregisterShortcuts();
        delete (window as any).__coreContext;
    });

    // Resize handlers
    const handleLeftResize = (delta: number) => {
        layoutActions.setLeftPanelWidth(layoutStore.leftPanelWidth + delta);
    };

    const handleRightResize = (delta: number) => {
        layoutActions.setRightPanelWidth(layoutStore.rightPanelWidth + delta);
    };

    return (
        <CoreProvider>
            <div class="h-screen flex flex-col bg-surface-900 text-surface-100">
                {/* Top Toolbar */}
                <Toolbar />

                {/* Main content area */}
                <div class="flex-1 flex overflow-hidden">
                    {/* Left Panel */}
                    {layoutStore.showLeftPanel && (
                        <>
                            <div style={{ width: `${layoutStore.leftPanelWidth}px` }}>
                                <LeftPanel />
                            </div>
                            <ResizeHandle
                                position="left"
                                onResize={handleLeftResize}
                            />
                        </>
                    )}

                    {/* 3D Viewport */}
                    <Viewport />

                    {/* Right Panel */}
                    {layoutStore.showRightPanel && (
                        <>
                            <ResizeHandle
                                position="right"
                                onResize={handleRightResize}
                            />
                            <div style={{ width: `${layoutStore.rightPanelWidth}px` }}>
                                <RightPanel />
                            </div>
                        </>
                    )}
                </div>

                {/* Status Bar */}
                {layoutStore.showStatusBar && <StatusBar />}
            </div>
        </CoreProvider>
    );
};

export default App;

