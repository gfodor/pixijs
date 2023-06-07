import { ExtensionType } from '../../../../extensions/Extensions';
import { Matrix } from '../../../../maths/Matrix';
import { RenderTarget } from '../../shared/renderTarget/RenderTarget';
import { Runner } from '../../shared/runner/Runner';
import { TextureSource } from '../../shared/texture/sources/TextureSource';
import { Texture } from '../../shared/texture/Texture';
import { GpuRenderTarget } from './GpuRenderTarget';

import type { ExtensionMetadata } from '../../../../extensions/Extensions';
import type { ICanvas } from '../../../../settings/adapter/ICanvas';
import type { ISystem } from '../../shared/system/ISystem';
import type { BindableTexture } from '../../shared/texture/Texture';
import type { GPU } from '../GpuDeviceSystem';
import type { WebGPURenderer } from '../WebGPURenderer';

const DEFAULT_CLEAR_COLOR = [0, 0, 0, 0];

export type RenderSurface = ICanvas | BindableTexture | RenderTarget;

export type RGBAArray = [number, number, number, number];

export class GpuRenderTargetSystem implements ISystem
{
    /** @ignore */
    static extension: ExtensionMetadata = {
        type: [
            ExtensionType.WebGPURendererSystem,
        ],
        name: 'renderTarget',
    };

    rootRenderTarget: RenderTarget;
    rootProjectionMatrix = new Matrix();
    renderTarget: RenderTarget;
    onRenderTargetChange = new Runner('onRenderTargetChange');

    private renderSurfaceToRenderTargetHash: Map<RenderSurface, RenderTarget> = new Map();
    private gpuRenderTargetHash: Record<number, GpuRenderTarget> = {};

    private renderTargetStack: RenderTarget[] = [];
    private renderer: WebGPURenderer;

    private gpu: GPU;

    constructor(renderer: WebGPURenderer)
    {
        this.renderer = renderer;
    }

    start(rootRenderSurface: RenderSurface, clear = true, clearColor?: RGBAArray): void
    {
        // generate a render pass description..
        // create an encoder..

        this.rootRenderTarget = this.getRenderTarget(rootRenderSurface);
        this.rootProjectionMatrix = this.rootRenderTarget.projectionMatrix;

        this.renderTargetStack.length = 0;

        this.renderer.encoder.start();

        this.push(rootRenderSurface, clear, clearColor);
    }

    protected contextChange(gpu: GPU): void
    {
        this.gpu = gpu;
    }

    bind(renderSurface: RenderSurface, clear = true, clearColor?: RGBAArray): RenderTarget
    {
        const renderTarget = this.getRenderTarget(renderSurface);

        this.renderTarget = renderTarget;

        const gpuRenderTarget = this.getGpuRenderTarget(renderTarget);

        if (renderTarget.width !== gpuRenderTarget.width || renderTarget.height !== gpuRenderTarget.height)
        {
            this.resizeGpuRenderTarget(renderTarget);
        }

        const descriptor = this.getDescriptor(renderTarget, clear, clearColor);

        gpuRenderTarget.descriptor = descriptor;

        // TODO we should not finish a render pass each time we bind
        // for example filters - we would want to push / pop render targets
        this.renderer.encoder.beginRenderPass(renderTarget, gpuRenderTarget);
        this.renderer.pipeline.setMultisampleCount(gpuRenderTarget.msaaSamples);

        this.onRenderTargetChange.emit(renderTarget);

        return renderTarget;
    }

    /**
     * returns the gpu texture for the first color texture in the render target
     * mainly used by the filter manager to get copy the texture for blending
     * @param renderTarget
     * @returns a gpu texture
     */
    getGpuColorTexture(renderTarget: RenderTarget): GPUTexture
    {
        const gpuRenderTarget = this.getGpuRenderTarget(renderTarget);

        if (gpuRenderTarget.contexts[0])
        {
            return gpuRenderTarget.contexts[0].getCurrentTexture();
        }

        return this.renderer.texture.getGpuSource(renderTarget.colorTextures[0].source);
    }

    getDescriptor(renderTarget: RenderTarget, clear: boolean, clearValue: RGBAArray): GPURenderPassDescriptor
    {
        const gpuRenderTarget = this.getGpuRenderTarget(renderTarget);

        const loadOp = clear ? 'clear' : 'load';

        const colorAttachments = renderTarget.colorTextures.map((texture, i) =>
        {
            const context = gpuRenderTarget.contexts[i];

            let view: GPUTextureView;
            let resolveTarget: GPUTextureView;

            if (context)
            {
                const currentTexture = context.getCurrentTexture();

                const canvasTextureView = currentTexture.createView();

                view = canvasTextureView;
            }
            else
            {
                view = this.renderer.texture.getTextureView(texture);
            }

            if (gpuRenderTarget.msaaTextures[i])
            {
                resolveTarget = view;
                view = this.renderer.texture.getTextureView(gpuRenderTarget.msaaTextures[i]);
            }

            return {
                view, // assign each frame based on the swap chain!
                resolveTarget,
                clearValue: clearValue || DEFAULT_CLEAR_COLOR,
                storeOp: 'store',
                loadOp,
            };
        }) as GPURenderPassColorAttachment[];

        let depthStencilAttachment;

        if (renderTarget.depthTexture)
        {
            depthStencilAttachment = {
                view: this.renderer.texture.getGpuSource(renderTarget.depthTexture.source).createView(),
                stencilStoreOp: 'store' as GPUStoreOp,
                stencilLoadOp: loadOp as GPULoadOp,
            };
        }

        const descriptor: GPURenderPassDescriptor = {
            colorAttachments,
            depthStencilAttachment
        };

        return descriptor;
    }

    push(renderSurface: RenderSurface, clear = true, clearColor?: RGBAArray)
    {
        const renderTarget = this.bind(renderSurface, clear, clearColor);

        this.renderTargetStack.push(renderTarget);

        return renderTarget;
    }

    pop()
    {
        this.renderTargetStack.pop();

        this.bind(this.renderTargetStack[this.renderTargetStack.length - 1], false);
    }

    getRenderTarget(renderSurface: RenderSurface): RenderTarget
    {
        return this.renderSurfaceToRenderTargetHash.get(renderSurface) ?? this.initRenderTarget(renderSurface);
    }

    copyToTexture(
        sourceRenderSurfaceTexture: RenderTarget,
        destinationTexture: Texture,
        origin: { x: number; y: number; },
        size: { width: number; height: number; }
    )
    {
        const renderer = this.renderer;

        const baseGpuTexture = renderer.renderTarget.getGpuColorTexture(sourceRenderSurfaceTexture);
        const backGpuTexture = renderer.texture.getGpuSource(destinationTexture.source);

        renderer.encoder.commandEncoder.copyTextureToTexture({
            texture: baseGpuTexture,
            origin,
        }, {
            texture: backGpuTexture,
        }, size);

        return destinationTexture;
    }

    restart()
    {
        this.bind(this.rootRenderTarget, false);
    }

    destroy()
    {
        // boom
    }

    private initRenderTarget(renderSurface: RenderSurface): RenderTarget
    {
        let renderTarget = null;

        if (renderSurface instanceof RenderTarget)
        {
            renderTarget = renderSurface;
        }
        else if (renderSurface instanceof Texture)
        {
            renderTarget = new RenderTarget({
                colorTextures: [renderSurface],
                depthTexture: renderSurface.source.depthStencil
            });
        }

        renderTarget.isRoot = true;

        this.renderSurfaceToRenderTargetHash.set(renderSurface, renderTarget);

        return renderTarget;
    }

    private getGpuRenderTarget(renderTarget: RenderTarget)
    {
        return this.gpuRenderTargetHash[renderTarget.uid] || this.initGpuRenderTarget(renderTarget);
    }

    private initGpuRenderTarget(renderTarget: RenderTarget): GpuRenderTarget
    {
        // always false for WebGPU
        renderTarget.isRoot = true;

        const gpuRenderTarget = new GpuRenderTarget();

        // create a context...
        // is a canvas...

        renderTarget.colorTextures.forEach((colorTexture, i) =>
        {
            if (colorTexture.source.resource instanceof HTMLCanvasElement)
            {
                const context = renderTarget.colorTexture.source.resource.getContext('webgpu') as any as GPUCanvasContext;

                try
                {
                    context.configure({
                        device: this.gpu.device,
                        // eslint-disable-next-line max-len
                        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
                        format: 'bgra8unorm',
                        alphaMode: 'opaque',
                    });
                }
                catch (e)
                {
                    console.error(e);
                }

                gpuRenderTarget.contexts[i] = context;
            }

            gpuRenderTarget.msaa = colorTexture.source.antialias;

            if (colorTexture.source.antialias)
            {
                const msaaTexture = new TextureSource({
                    width: 0,
                    height:  0,
                    sampleCount: 4,
                });

                gpuRenderTarget.msaaTextures[i] = msaaTexture;
            }
        });

        if (gpuRenderTarget.msaa)
        {
            gpuRenderTarget.msaaSamples = 4;

            if (renderTarget.depthTexture)
            {
                renderTarget.depthTexture.source.sampleCount = 4;
            }
        }

        this.gpuRenderTargetHash[renderTarget.uid] = gpuRenderTarget;

        return gpuRenderTarget;
    }

    private resizeGpuRenderTarget(renderTarget: RenderTarget)
    {
        const gpuRenderTarget = this.getGpuRenderTarget(renderTarget);

        gpuRenderTarget.width = renderTarget.width;
        gpuRenderTarget.height = renderTarget.height;

        if (gpuRenderTarget.msaa)
        {
            renderTarget.colorTextures.forEach((colorTexture, i) =>
            {
                const msaaTexture = gpuRenderTarget.msaaTextures[i];

                msaaTexture?.resize(colorTexture.source.width, colorTexture.source.height, colorTexture.source.resolution);
            });
        }
    }
}