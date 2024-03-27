import EventEmitter from 'eventemitter3';
import { Bounds } from '../../../../scene/container/bounds/Bounds';
import { Buffer } from '../buffer/Buffer';
import type { TypedArray } from '../buffer/Buffer';
import type { Topology, VertexFormat } from './const';
export type IndexBufferArray = Uint16Array | Uint32Array;
/**
 * The attribute data for a geometries attributes
 * @memberof rendering
 */
export interface Attribute {
    /** the buffer that this attributes data belongs to */
    buffer: Buffer;
    /** the format of the attribute */
    format?: VertexFormat;
    /** set where the shader location is for this attribute */
    location?: number;
    /** the stride of the data in the buffer*/
    stride?: number;
    /** the offset of the attribute from the buffer, defaults to 0 */
    offset?: number;
    /** is this an instanced buffer? (defaults to false) */
    instance?: boolean;
    /**  The number of elements to be rendered. If not specified, all vertices after the starting vertex will be drawn. */
    size?: number;
    /** the type of attribute  */
    type?: number;
    /**
     * The starting vertex in the geometry to start drawing from. If not specified,
     *  drawing will start from the first vertex.
     */
    start?: number;
}
/**
 * The attribute options used by the constructor for adding geometries attributes
 * extends {@link rendering.Attribute} but allows for the buffer to be a typed or number array
 * @memberof rendering
 */
type AttributesOption = Omit<Attribute, 'buffer'> & {
    buffer: Buffer | TypedArray | number[];
} | Buffer | TypedArray | number[];
/**
 * the interface that describes the structure of the geometry
 * @memberof rendering
 */
export interface GeometryDescriptor {
    /** an optional label to easily identify the geometry */
    label?: string;
    /** the attributes that make up the geometry */
    attributes: Record<string, AttributesOption>;
    /** optional index buffer for this geometry */
    indexBuffer?: Buffer | TypedArray | number[];
    /** the topology of the geometry, defaults to 'triangle-list' */
    topology?: Topology;
    instanceCount?: number;
}
/**
 * A Geometry is a low-level object that represents the structure of 2D shapes in terms of vertices and attributes.
 * It's a crucial component for rendering as it describes the shape and format of the data that will go through the shaders.
 * Essentially, a Geometry object holds the data you'd send to a GPU buffer.
 *
 * A geometry is basically made of two components:
 * <br>
 * <b>Attributes</b>: These are essentially arrays that define properties of the vertices like position, color,
 * texture coordinates, etc. They map directly to attributes in your vertex shaders.
 * <br>
 * <b>Indices</b>: An optional array that describes how the vertices are connected.
 * If not provided, vertices will be interpreted in the sequence they're given.
 * @example
 *
 * const geometry = new Geometry({
 *   attributes: {
 *     aPosition: [ // add some positions
 *       0, 0,
 *       0, 100,
 *       100, 100,
 *       100,   0,
 *     ],
 *     aUv: [ // add some uvs
 *       0, 0,
 *       0, 1,
 *       1, 1,
 *       1, 0,
 *     ]
 *   }
 * });
 * @memberof rendering
 * @class
 */
export declare class Geometry extends EventEmitter<{
    update: Geometry;
    destroy: Geometry;
}> {
    /** The topology of the geometry. */
    topology: Topology;
    /** The unique id of the geometry. */
    readonly uid: number;
    /** A record of the attributes of the geometry. */
    readonly attributes: Record<string, Attribute>;
    /** The buffers that the attributes use */
    readonly buffers: Buffer[];
    /** The index buffer of the geometry */
    readonly indexBuffer: Buffer;
    /**
     * the layout key will be generated by WebGPU all geometries that have the same structure
     * will have the same layout key. This is used to cache the pipeline layout
     * @internal
     * @ignore
     */
    _layoutKey: number;
    /** the instance count of the geometry to draw */
    instanceCount: number;
    private readonly _bounds;
    private _boundsDirty;
    /**
     * Create a new instance of a geometry
     * @param options - The options for the geometry.
     */
    constructor(options: GeometryDescriptor);
    protected onBufferUpdate(): void;
    /**
     * Returns the requested attribute.
     * @param id - The name of the attribute required
     * @returns - The attribute requested.
     */
    getAttribute(id: string): Attribute;
    /**
     * Returns the index buffer
     * @returns - The index buffer.
     */
    getIndex(): Buffer;
    /**
     * Returns the requested buffer.
     * @param id - The name of the buffer required.
     * @returns - The buffer requested.
     */
    getBuffer(id: string): Buffer;
    /**
     * Used to figure out how many vertices there are in this geometry
     * @returns the number of vertices in the geometry
     */
    getSize(): number;
    /** Returns the bounds of the geometry. */
    get bounds(): Bounds;
    /**
     * destroys the geometry.
     * @param destroyBuffers - destroy the buffers associated with this geometry
     */
    destroy(destroyBuffers?: boolean): void;
}
export {};
