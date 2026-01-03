import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { getSceneManager } from '@/core/scene/SceneManager';

export interface PostProcessingOptions {
    ssao: boolean;
    ssaoRadius: number;
    ssaoIntensity: number;
    bloom: boolean;
    bloomStrength: number;
    bloomRadius: number;
    bloomThreshold: number;
}

const defaultOptions: PostProcessingOptions = {
    ssao: false,
    ssaoRadius: 16,
    ssaoIntensity: 1.0,
    bloom: false,
    bloomStrength: 0.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.85,
};

/**
 * PostProcessingManager - SSAO, Bloom, and other effects
 */
export class PostProcessingManager {
    private composer: EffectComposer | null = null;
    private renderPass: RenderPass | null = null;
    private ssaoPass: SSAOPass | null = null;
    private bloomPass: UnrealBloomPass | null = null;
    private outputPass: OutputPass | null = null;

    private enabled = false;
    private options: PostProcessingOptions;

    constructor() {
        this.options = { ...defaultOptions };
    }

    /**
     * Initialize post-processing
     */
    init(): void {
        const sceneManager = getSceneManager();
        const renderer = sceneManager.renderer;
        const scene = sceneManager.scene;
        const camera = sceneManager.camera;

        const width = renderer.domElement.clientWidth;
        const height = renderer.domElement.clientHeight;

        // Create composer
        this.composer = new EffectComposer(renderer);

        // Render pass
        this.renderPass = new RenderPass(scene, camera);
        this.composer.addPass(this.renderPass);

        // SSAO pass
        this.ssaoPass = new SSAOPass(scene, camera, width, height);
        this.ssaoPass.kernelRadius = this.options.ssaoRadius;
        this.ssaoPass.minDistance = 0.005;
        this.ssaoPass.maxDistance = 0.1;
        this.ssaoPass.enabled = this.options.ssao;
        this.composer.addPass(this.ssaoPass);

        // Bloom pass
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(width, height),
            this.options.bloomStrength,
            this.options.bloomRadius,
            this.options.bloomThreshold
        );
        this.bloomPass.enabled = this.options.bloom;
        this.composer.addPass(this.bloomPass);

        // Output pass (for correct color output)
        this.outputPass = new OutputPass();
        this.composer.addPass(this.outputPass);

        this.enabled = true;
    }

    /**
     * Check if post-processing is enabled
     */
    isEnabled(): boolean {
        return this.enabled;
    }

    /**
     * Get current options
     */
    getOptions(): PostProcessingOptions {
        return { ...this.options };
    }

    /**
     * Update options
     */
    setOptions(options: Partial<PostProcessingOptions>): void {
        this.options = { ...this.options, ...options };
        this.applyOptions();
    }

    /**
     * Apply current options to passes
     */
    private applyOptions(): void {
        if (this.ssaoPass) {
            this.ssaoPass.enabled = this.options.ssao;
            this.ssaoPass.kernelRadius = this.options.ssaoRadius;
        }

        if (this.bloomPass) {
            this.bloomPass.enabled = this.options.bloom;
            this.bloomPass.strength = this.options.bloomStrength;
            this.bloomPass.radius = this.options.bloomRadius;
            this.bloomPass.threshold = this.options.bloomThreshold;
        }
    }

    /**
     * Toggle SSAO
     */
    toggleSSAO(): void {
        this.options.ssao = !this.options.ssao;
        if (this.ssaoPass) {
            this.ssaoPass.enabled = this.options.ssao;
        }
    }

    /**
     * Set SSAO enabled
     */
    setSSAO(enabled: boolean): void {
        this.options.ssao = enabled;
        if (this.ssaoPass) {
            this.ssaoPass.enabled = enabled;
        }
    }

    /**
     * Toggle Bloom
     */
    toggleBloom(): void {
        this.options.bloom = !this.options.bloom;
        if (this.bloomPass) {
            this.bloomPass.enabled = this.options.bloom;
        }
    }

    /**
     * Set Bloom enabled
     */
    setBloom(enabled: boolean): void {
        this.options.bloom = enabled;
        if (this.bloomPass) {
            this.bloomPass.enabled = enabled;
        }
    }

    /**
     * Resize post-processing
     */
    resize(width: number, height: number): void {
        if (this.composer) {
            this.composer.setSize(width, height);
        }

        if (this.ssaoPass) {
            this.ssaoPass.setSize(width, height);
        }

        if (this.bloomPass) {
            this.bloomPass.resolution.set(width, height);
        }
    }

    /**
     * Render with post-processing
     */
    render(): void {
        if (this.composer && this.enabled) {
            this.composer.render();
        }
    }

    /**
     * Dispose resources
     */
    dispose(): void {
        if (this.composer) {
            this.composer.dispose();
        }
        this.composer = null;
        this.renderPass = null;
        this.ssaoPass = null;
        this.bloomPass = null;
        this.outputPass = null;
        this.enabled = false;
    }
}

// Singleton
let postProcessingInstance: PostProcessingManager | null = null;

export function getPostProcessingManager(): PostProcessingManager {
    if (!postProcessingInstance) {
        postProcessingInstance = new PostProcessingManager();
    }
    return postProcessingInstance;
}
