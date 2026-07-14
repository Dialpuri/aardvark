import { useEffect, useRef, useState } from 'react'
import { Viewer } from 'gemmimol/gemmimol.js'
import { loadGemmi } from '@/lib/gemmi'
import styles from './MoleculeViewer.module.css'

interface MoleculeViewerProps {
  /** Coordinate-file text (mmCIF/PDB) to render. */
  text: string
  /** File-name hint whose extension tells gemmi the format. */
  name: string
}

/** Unique DOM ids — gemmimol locates its container via getElementById. */
let nextId = 0

type Status = 'loading' | 'ready' | 'error'

/**
 * A gemmimol (Gemmi + WebGL) 3D viewer for a single ligand. gemmimol is an
 * imperative, DOM-id-driven viewer, so we bridge it into React by handing it a
 * container we own and tearing the GL context down on unmount.
 */
export function MoleculeViewer(props: MoleculeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    const container = containerRef.current
    if (container === null) return

    const id = `gm-viewer-${nextId++}`
    container.id = id
    let viewer: Viewer | null = null
    let cancelled = false

    setStatus('loading')
    loadGemmi()
      .then((gemmi) => {
        if (cancelled) return
        viewer = new Viewer({
          viewer: id,
          hud: null,
          help: null,
          // Attach key handling to the canvas (not window) so the viewer only
          // grabs the keyboard while focused.
          focusable: true,
          gemmi,
        })
        return viewer.load_model_from_text(props.text, props.name, gemmi)
      })
      .then(() => {
        if (cancelled || viewer === null) return
        viewer.resize()
        viewer.recenter()
        viewer.request_render()
        setStatus('ready')
      })
      .catch((err) => {
        console.error('gemmimol could not render the ligand', err)
        if (!cancelled) setStatus('error')
      })

    return () => {
      cancelled = true
      if (viewer !== null) {
        // gemmimol registers a bound window 'resize' handler it never removes;
        // dropping the container reference makes that handler a no-op.
        viewer.container = null
        viewer.renderer?.forceContextLoss?.()
        viewer.renderer?.dispose?.()
      }
      container.innerHTML = ''
    }
  }, [props.text, props.name])

  return (
    <div className={styles.viewer}>
      <div ref={containerRef} className={styles.canvas} />
      {status !== 'ready' && (
        <div className={styles.state} role="status">
          {status === 'loading'
            ? 'Loading 3D view…'
            : 'Could not load the 3D view.'}
        </div>
      )}
    </div>
  )
}
