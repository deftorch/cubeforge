import { defineConfig } from 'vite';
import solid from 'vite-plugin-solid';
import { resolve } from 'path';

export default defineConfig({
    plugins: [solid()],
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        host: true,
    },
    build: {
        target: 'es2020',
        minify: 'terser',
        rollupOptions: {
            output: {
                manualChunks: {
                    three: ['three'],
                    solid: ['solid-js'],
                },
            },
        },
    },
});
