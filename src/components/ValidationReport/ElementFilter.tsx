import { useEffect, useRef, useState } from 'react'
import styles from './ValidationReport.module.css'

interface ElementFilterProps {
  /** Every element present in the report. */
  elements: string[]
  /** Currently selected elements; empty means no filter. */
  selected: Set<string>
  onToggle: (el: string) => void
  onClear: () => void
}

/**
 * The horizontally-scrolling row of element chips. Owns the edge-fade state:
 * it watches the chip row and shows a fade on whichever side has more content
 * scrolled out of view.
 */
export function ElementFilter(props: ElementFilterProps) {
  const chipsRef = useRef<HTMLDivElement>(null)
  const [fade, setFade] = useState({ left: false, right: false })

  useEffect(() => {
    const el = chipsRef.current
    if (!el) return
    const update = () => {
      setFade({
        left: el.scrollLeft > 1,
        right: Math.ceil(el.scrollLeft + el.clientWidth) < el.scrollWidth,
      })
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(el)
    el.addEventListener('scroll', update, { passive: true })
    return () => {
      observer.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [props.elements])

  return (
    <div className={styles.elementFilter}>
      <span className={styles.filterLabel}>Elements</span>
      <div
        ref={chipsRef}
        className={`${styles.filterChips} ${fade.left ? styles.fadeLeft : ''} ${
          fade.right ? styles.fadeRight : ''
        }`}
        role="group"
        aria-label="Filter by element"
      >
        {props.elements.map((el) => {
          const active = props.selected.has(el)
          return (
            <button
              key={el}
              type="button"
              aria-pressed={active}
              className={`${styles.filterChip} ${
                active ? styles.filterChipActive : ''
              }`}
              onClick={() => props.onToggle(el)}
            >
              {el}
            </button>
          )
        })}
      </div>
      {props.selected.size > 0 && (
        <button
          type="button"
          className={styles.filterClear}
          onClick={props.onClear}
        >
          Clear
        </button>
      )}
    </div>
  )
}
