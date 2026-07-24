import styles from './InputPanel.module.css'

/**
 * The card shell shared by every validation input pathway: an optional tab bar,
 * a body slot for the pathway's fields, and the submit button.
 */
export function InputPanel(props: {
  /** Optional tab bar rendered above the body (chemistry paste tabs). */
  tabs?: React.ReactNode
  children: React.ReactNode
  canSubmit: boolean
  onSubmit: () => void
  /** Label on the submit button. */
  submitLabel?: string
}) {
  return (
    <div className={styles.panel}>
      {props.tabs}
      <div className={styles.body}>
        {props.children}
        <button
          className={styles.submit}
          disabled={!props.canSubmit}
          onClick={() => props.onSubmit()}
        >
          {props.submitLabel ?? 'Validate geometry →'}
        </button>
      </div>
    </div>
  )
}
