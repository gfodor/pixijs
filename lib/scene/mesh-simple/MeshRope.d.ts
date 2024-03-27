import { Mesh } from '../mesh/shared/Mesh';
import type { PointData } from '../../maths/point/PointData';
import type { Texture } from '../../rendering/renderers/shared/texture/Texture';
import type { MeshOptions } from '../mesh/shared/Mesh';
/**
 * Constructor options used for `MeshRope` instances.
 * ```js
 * const meshRope = new MeshRope({
 *    texture: Texture.from('snake.png'),
 *    points: [new Point(0, 0), new Point(100, 0)],
 *    textureScale: 0,
 * });
 * ```
 * @see {@link scene.MeshRope}
 * @memberof scene
 */
export interface MeshRopeOptions extends Omit<MeshOptions, 'geometry'> {
    /** The texture to use on the rope. */
    texture: Texture;
    /** An array of points that determine the rope. */
    points: PointData[];
    /**
     * Rope texture scale, if zero then the rope texture is stretched.
     * Positive values scale rope texture
     * keeping its aspect ratio. You can reduce alpha channel artifacts by providing a larger texture
     * and downsampling here. If set to zero, texture will be stretched instead.
     */
    textureScale?: number;
}
/**
 * The rope allows you to draw a texture across several points and then manipulate these points
 * @example
 * import { Point, MeshRope, Texture } from 'pixi.js';
 *
 * for (let i = 0; i < 20; i++) {
 *     points.push(new Point(i * 50, 0));
 * };
 * const rope = new MeshRope(Texture.from('snake.png'), points);
 * @memberof scene
 */
export declare class MeshRope extends Mesh {
    static defaultOptions: Partial<MeshRopeOptions>;
    /** re-calculate vertices by rope points each frame */
    autoUpdate: boolean;
    /**
     * Note: The wrap mode of the texture is set to REPEAT if `textureScale` is positive.
     * @param options
     * @param options.texture - The texture to use on the rope.
     * @param options.points - An array of {@link PIXI.Point} objects to construct this rope.
     * @param {number} options.textureScale - Optional. Positive values scale rope texture
     * keeping its aspect ratio. You can reduce alpha channel artifacts by providing a larger texture
     * and downsampling here. If set to zero, texture will be stretched instead.
     */
    constructor(options: MeshRopeOptions);
    private _render;
}
