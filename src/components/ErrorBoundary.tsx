import { Component, ErrorBoundary as SolidErrorBoundary, createSignal, Show } from 'solid-js';
import { errorHandler, checkWebGLSupport } from '@/utils/errorHandler';

interface ErrorFallbackProps {
    error: Error;
    reset: () => void;
}

/**
 * Error fallback UI
 */
const ErrorFallback: Component<ErrorFallbackProps> = (props) => {
    return (
        <div class="min-h-screen bg-surface-900 flex items-center justify-center p-8">
            <div class="max-w-lg w-full bg-surface-800 rounded-xl border border-red-500/30 p-6 shadow-xl">
                <div class="flex items-center gap-3 mb-4">
                    <div class="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 class="text-xl font-semibold text-red-400">Something went wrong</h2>
                </div>

                <div class="bg-surface-900 rounded-lg p-4 mb-4">
                    <p class="text-sm text-surface-300 font-mono break-all">
                        {props.error.message}
                    </p>
                    <Show when={props.error.stack}>
                        <details class="mt-2">
                            <summary class="text-xs text-surface-500 cursor-pointer hover:text-surface-400">
                                Show stack trace
                            </summary>
                            <pre class="text-xs text-surface-500 mt-2 overflow-auto max-h-40">
                                {props.error.stack}
                            </pre>
                        </details>
                    </Show>
                </div>

                <div class="flex gap-3">
                    <button
                        onClick={() => props.reset()}
                        class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded font-medium transition-colors"
                    >
                        Try Again
                    </button>
                    <button
                        onClick={() => window.location.reload()}
                        class="flex-1 px-4 py-2 bg-surface-700 hover:bg-surface-600 text-surface-200 rounded font-medium transition-colors"
                    >
                        Reload Page
                    </button>
                </div>
            </div>
        </div>
    );
};

/**
 * WebGL not supported fallback
 */
const WebGLFallback: Component = () => {
    return (
        <div class="min-h-screen bg-surface-900 flex items-center justify-center p-8">
            <div class="max-w-lg w-full bg-surface-800 rounded-xl border border-yellow-500/30 p-6 shadow-xl text-center">
                <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-yellow-500/20 flex items-center justify-center">
                    <svg class="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                            d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>

                <h2 class="text-xl font-semibold text-yellow-400 mb-2">WebGL Not Supported</h2>
                <p class="text-surface-400 mb-4">
                    CubeForge requires WebGL to render 3D graphics. Your browser or device does not support WebGL.
                </p>

                <div class="bg-surface-900 rounded-lg p-4 text-left">
                    <h3 class="text-sm font-medium text-surface-300 mb-2">Try the following:</h3>
                    <ul class="text-sm text-surface-400 space-y-1">
                        <li>• Update your browser to the latest version</li>
                        <li>• Try a different browser (Chrome, Firefox, Edge)</li>
                        <li>• Update your graphics drivers</li>
                        <li>• Enable hardware acceleration in browser settings</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

/**
 * Loading fallback
 */
export const LoadingFallback: Component = () => {
    return (
        <div class="min-h-screen bg-surface-900 flex items-center justify-center">
            <div class="text-center">
                <div class="w-16 h-16 mx-auto mb-4 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
                <p class="text-surface-400">Loading CubeForge...</p>
            </div>
        </div>
    );
};

/**
 * Application Error Boundary
 */
export const AppErrorBoundary: Component<{ children: any }> = (props) => {
    const [webglCheck] = createSignal(checkWebGLSupport());

    // Check WebGL support first
    if (!webglCheck().supported) {
        return <WebGLFallback />;
    }

    return (
        <SolidErrorBoundary
            fallback={(error, reset) => {
                // Log error
                errorHandler.handle(error, 'critical');

                return <ErrorFallback error={error as Error} reset={reset} />;
            }}
        >
            {props.children}
        </SolidErrorBoundary>
    );
};

/**
 * Component-level error boundary for graceful degradation
 */
export const ComponentErrorBoundary: Component<{
    children: any;
    fallback?: Component<{ error: Error }>;
    name?: string;
}> = (props) => {
    const DefaultFallback: Component<{ error: Error }> = (fallbackProps) => (
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-sm text-red-400">
                Error in {props.name || 'component'}: {fallbackProps.error.message}
            </p>
        </div>
    );

    const Fallback = props.fallback || DefaultFallback;

    return (
        <SolidErrorBoundary
            fallback={(error) => {
                errorHandler.handle(error, 'error');
                return <Fallback error={error as Error} />;
            }}
        >
            {props.children}
        </SolidErrorBoundary>
    );
};
