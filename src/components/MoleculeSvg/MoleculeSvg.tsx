import { useEffect, useState } from 'react'
import {
  smilesToSvg,
  smilesToSvgWithHighlights,
  type HighlightQuery,
} from '@/lib/rdkit'
import styles from './MoleculeSvg.module.css'

interface MoleculeSvgProps {
  /** SMILES string to depict. */
  smiles: string
  /** Pixel dimensions handed to RDKit; the SVG scales down responsively. */
  width?: number
  height?: number
  /**
   * Optional bond highlights, resolved per-molecule by SMARTS. Pass a stable
   * (module-level) array so the depiction isn't re-rendered every tick.
   */
  highlights?: HighlightQuery[]
  /** Accessible label for the rendered structure. */
  label?: string
  className?: string
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; svg: string }
  | { status: 'failed' }

export function MoleculeSvg(props: MoleculeSvgProps) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let alive = true
    setState({ status: 'loading' })
    const dimensions = { width: props.width, height: props.height }
    const render =
      props.highlights && props.highlights.length > 0
        ? smilesToSvgWithHighlights(props.smiles, props.highlights, dimensions)
        : smilesToSvg(props.smiles, dimensions)
    render
      .then((svg) => {
        if (!alive) return
        setState(svg === null ? { status: 'failed' } : { status: 'ready', svg })
      })
      .catch(() => {
        if (alive) setState({ status: 'failed' })
      })
    return () => {
      alive = false
    }
  }, [props.smiles, props.width, props.height, props.highlights])

  const classes = [styles.box, props.className].filter(Boolean).join(' ')
  // Reserve vertical space up front so the molecule doesn't shift the card
  // when it finishes loading.
  const minHeight = `${(props.height ?? 200) / 16}rem`

  if (state.status === 'failed') {
    return (
      <div className={classes} role="img" aria-label="Invalid structure">
        <span className={styles.message}>Couldn’t render structure</span>
      </div>
    )
  }

  if (state.status === 'loading') {
    return (
      <div
        className={classes}
        style={{ minHeight }}
        role="img"
        aria-label={props.label ?? 'Molecular structure'}
        aria-busy
      />
    )
  }

  return (
    <div
      className={classes}
      style={{ minHeight }}
      role="img"
      aria-label={props.label ?? 'Molecular structure'}
      // RDKit returns a trusted SVG it generated itself from the SMILES.
      dangerouslySetInnerHTML={{ __html: state.svg }}
    />
  )
}
