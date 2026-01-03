import { Component, onMount, onCleanup } from 'solid-js';
import { Toolbar, LeftPanel, RightPanel, StatusBar } from '@/components/layout';
import { Viewport } from '@/components/viewport';
import { CoreProvider } from '@/components/CoreProvider';
import { uiStore } from '@/stores/uiStore';
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

    return (
        <CoreProvider>
            <div class="h-screen flex flex-col bg-surface-900 text-surface-100">
                {/* Top Toolbar */}
                <Toolbar />

                {/* Main content area */}
                <div class="flex-1 flex overflow-hidden">
                    {/* Left Panel */}
                    {uiStore.showLeftPanel && <LeftPanel />}

                    {/* 3D Viewport */}
                    <Viewport />

                    {/* Right Panel */}
                    {uiStore.showRightPanel && <RightPanel />}
                </div>

                {/* Status Bar */}
                {uiStore.showStatusBar && <StatusBar />}
            </div>
        </CoreProvider>
    );
};

export default App;
