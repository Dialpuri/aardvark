// The @rdkit/rdkit package ships its type definitions at `dist/index.d.ts`
// (referenced by the package's "types" field) but provides no `.d.ts`
// alongside the Emscripten glue we import directly, nor for the `?url`
// wasm import. These ambient declarations bridge that gap and reuse the
// package's own published types.

declare module '@rdkit/rdkit/dist/RDKit_minimal.js' {
  import type { RDKitLoader } from '@rdkit/rdkit'

  /** Emscripten loader: call it to get a Promise<RDKitModule>. */
  const initRDKitModule: RDKitLoader
  export default initRDKitModule
}

declare module '@rdkit/rdkit/dist/RDKit_minimal.wasm?url' {
  /** Vite emits the wasm as an asset and resolves this to its served URL. */
  const url: string
  export default url
}
