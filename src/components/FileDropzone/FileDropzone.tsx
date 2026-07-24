import { useRef } from 'react'
import { Button } from '@/components/Button'
import styles from './FileDropzone.module.css'

/** Drag-and-drop / browse file picker shared by the file-based pathways. */
export function FileDropzone(props: {
  /** `accept` attribute for the file input. */
  accept: string
  /** Prompt shown when no file has been chosen yet. */
  hint: React.ReactNode
  /** The currently chosen file, or null. */
  file: File | null
  /** Called with the dropped/selected file (or null when cleared). */
  onFile: (file: File | null) => void
  /** Inline note shown after the file name, e.g. an unsupported-type warning. */
  error?: React.ReactNode
}) {
  const input = useRef<HTMLInputElement>(null)
  return (
    <div
      className={styles.dropzone}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        props.onFile(e.dataTransfer.files?.[0] ?? null)
      }}
    >
      <input
        ref={input}
        type="file"
        accept={props.accept}
        className={styles.fileInput}
        onChange={(e) => props.onFile(e.target.files?.[0] ?? null)}
      />
      <span className={styles.dropIcon} />
      {props.file ? (
        <div className={styles.dropTitle}>
          {props.file.name}
          {props.error && (
            <span className={styles.fileError}> — {props.error}</span>
          )}
        </div>
      ) : (
        <div className={styles.dropTitle}>{props.hint}</div>
      )}
      <div className={styles.dropOr}>or</div>
      <Button variant="secondary" onClick={() => input.current?.click()}>
        Browse files
      </Button>
    </div>
  )
}
