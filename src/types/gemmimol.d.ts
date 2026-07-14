/**
 * Minimal typings for the parts of gemmimol's prebuilt UMD bundle we use. The
 * package ships full types with its TS source, but we import the prebuilt
 * `gemmimol.js` for a smaller, faster dependency, so we declare what we touch.
 */
declare module 'gemmimol/gemmimol.js' {
  export interface ViewerOptions {
    /** Element id of the container the viewer renders into. */
    viewer?: string | null
    /** Element id for the heads-up display, or null to skip it. */
    hud?: string | null
    /** Element id for the help overlay, or null to skip it. */
    help?: string | null
    /** Attach key handling to the canvas rather than window. */
    focusable?: boolean
    /** A pre-instantiated gemmi WASM module. */
    gemmi?: unknown
    /** A factory that resolves to a gemmi WASM module. */
    gemmi_factory?: () => Promise<unknown>
    [key: string]: unknown
  }

  export class Viewer {
    constructor(options?: ViewerOptions | string)
    /** The container element; null it out to disable the leaked resize handler. */
    container: HTMLElement | null
    renderer: {
      domElement: HTMLCanvasElement
      dispose?: () => void
      forceContextLoss?: () => void
    } | null
    /** Load a model from PDB/mmCIF text and centre the view. */
    load_model_from_text(
      text: string,
      name?: string,
      gemmi?: unknown,
    ): Promise<void>
    recenter(xyz?: number[], cam?: number[], steps?: number): void
    resize(): void
    request_render(): void
  }
}
