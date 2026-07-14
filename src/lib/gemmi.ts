import type { MainModule } from 'gemmimol/vendor/wasm/gemmi.js'

declare global {
  interface Window {
    /** The gemmi factory, registered globally once gemmi.js has loaded. */
    Gemmi?: (options?: unknown) => Promise<MainModule>
  }
}

/**
 * gemmi.js and gemmi.wasm are copied into `public/gemmi/` by
 * `scripts/copy-gemmi-wasm.mjs` (run from `dev` / `build`). We load gemmi.js as
 * a *classic* script rather than bundling it: its Emscripten glue finds the
 * `.wasm` via `document.currentScript.src`, which is only populated for classic
 * scripts — bundled as an ES module it resolves to a wrong, route-relative URL.
 * Loading it as a sibling static file makes the `.wasm` lookup route-independent.
 */
const SCRIPT_URL = `${import.meta.env.BASE_URL}gemmi/gemmi.js`

let modulePromise: Promise<MainModule> | null = null

/** Inject gemmi.js as a classic script, resolving once `window.Gemmi` exists. */
function loadGemmiScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Gemmi) {
      resolve()
      return
    }
    const onError = () => reject(new Error('Failed to load gemmi.js'))
    const existing =
      document.querySelector<HTMLScriptElement>('script[data-gemmi]')
    if (existing) {
      existing.addEventListener('load', () => resolve())
      existing.addEventListener('error', onError)
      return
    }
    const script = document.createElement('script')
    script.src = SCRIPT_URL
    script.async = true
    script.dataset.gemmi = ''
    script.addEventListener('load', () => resolve())
    script.addEventListener('error', onError)
    document.head.appendChild(script)
  })
}

/**
 * Load and cache the gemmi WebAssembly module. gemmimol's viewer needs it to
 * parse coordinate files; we reuse the single instance across every viewer.
 */
export function loadGemmi(): Promise<MainModule> {
  if (modulePromise === null) {
    modulePromise = loadGemmiScript().then(() => {
      if (!window.Gemmi) {
        throw new Error('gemmi.js did not register globalThis.Gemmi')
      }
      return window.Gemmi()
    })
  }
  return modulePromise
}
