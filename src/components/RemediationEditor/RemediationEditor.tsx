import { useEffect, useState } from 'react'
import type { AngleRecord, BondRecord } from '@/types/cod'
import { KINDS, type Kind } from '@/components/ValidationReport/kinds'
import { useRemediation } from '@/components/ValidationReport/RemediationContext'
import {
  formatAt,
  geometryEditLabel,
  makeEditFor,
  recordKey,
  type RemediationSource,
} from '@/lib/remediation'
import styles from './RemediationEditor.module.css'

interface RemediationEditorProps {
  record: BondRecord | AngleRecord
  kind: Kind
}

/** Parse a decimal field, falling back to `fallback` while it's mid-edit/invalid. */
function num(text: string, fallback: number): number {
  const parsed = Number.parseFloat(text)
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Per-row restraint editor: shows the current dictionary target next to the COD
 * mean, and lets the user draft a new target/esd — snapping to the COD mean or
 * typing a custom value — then Save it to the tracker. Sits below the COD
 * observations in each expanded row. Commits through {@link useRemediation}.
 */
export function RemediationEditor(props: RemediationEditorProps) {
  const remediation = useRemediation()
  const cfg = KINDS[props.kind]
  const dict = props.record.dict
  const key = recordKey(props.kind, props.record)
  const saved = remediation.getEdit(key)

  // The fields are a local draft; nothing reaches the tracker until Save. We
  // reseed the draft from the saved edit (or the dictionary) only when that
  // changes from outside — a Save, a Revert, or "Reset all" from the panel.
  const [valueText, setValueText] = useState(() =>
    dict ? formatAt(props.kind, (saved ?? dict).value) : '',
  )
  const [esdText, setEsdText] = useState(() =>
    dict ? formatAt(props.kind, (saved ?? dict).esd) : '',
  )
  const [source, setSource] = useState<RemediationSource>(
    saved?.source ?? 'custom',
  )

  useEffect(() => {
    const base = saved ?? dict
    if (!base) return
    setValueText(formatAt(props.kind, base.value))
    setEsdText(formatAt(props.kind, base.esd))
    setSource(saved?.source ?? 'custom')
  }, [saved, dict, props.kind])

  if (!dict) {
    return (
      <p className={styles.noDict}>
        No dictionary restraint for this geometry — nothing to remediate.
      </p>
    )
  }

  const hasCodMean = props.record.mean !== null

  const draftValue = num(valueText, NaN)
  const draftEsd = num(esdText, NaN)
  const valid =
    Number.isFinite(draftValue) && Number.isFinite(draftEsd) && draftEsd >= 0

  // Compare at the CIF precision so a reformatted-but-equal draft isn't "dirty".
  const baseline = saved ?? dict
  const dirty =
    valid &&
    (formatAt(props.kind, draftValue) !==
      formatAt(props.kind, baseline.value) ||
      formatAt(props.kind, draftEsd) !== formatAt(props.kind, baseline.esd))

  function useCodMean() {
    const sd = props.record.sd
    setValueText(formatAt(props.kind, props.record.mean!))
    setEsdText(formatAt(props.kind, sd && sd > 0 ? sd : dict!.esd))
    setSource('cod-mean')
  }

  function save() {
    if (!valid) return
    remediation.applyEdit(
      makeEditFor(
        props.kind,
        props.record,
        dict!,
        draftValue,
        draftEsd,
        source,
      ),
    )
  }

  function revert() {
    if (saved) {
      remediation.revertEdit(key) // effect reseeds the draft to the dictionary
    } else {
      setValueText(formatAt(props.kind, dict!.value))
      setEsdText(formatAt(props.kind, dict!.esd))
      setSource('custom')
    }
  }

  return (
    <div className={styles.editor}>
      <dl className={styles.figures}>
        <div className={styles.figure}>
          <dt className={styles.figureLabel}>Dictionary target</dt>
          <dd className={styles.figureValue}>
            {formatAt(props.kind, dict.value)} ±{' '}
            {formatAt(props.kind, dict.esd)}
            {cfg.unit}
          </dd>
        </div>
        <div className={styles.figure}>
          <dt className={styles.figureLabel}>COD mean</dt>
          <dd className={styles.figureValue}>
            {hasCodMean ? (
              <>
                {formatAt(props.kind, props.record.mean!)} ±{' '}
                {formatAt(props.kind, props.record.sd ?? 0)}
                {cfg.unit}
              </>
            ) : (
              <span className={styles.absent}>no reference</span>
            )}
          </dd>
        </div>
        <div className={styles.figure}>
          <dt className={styles.figureLabel}>
            New target
            {dirty ? (
              <span className={styles.tagUnsaved}>unsaved</span>
            ) : saved ? (
              <span className={styles.tagSaved}>saved</span>
            ) : null}
          </dt>
          <dd
            className={`${styles.figureValue} ${
              dirty || saved ? styles.newTargetOn : ''
            }`}
          >
            {valueText || '—'} ± {esdText || '—'}
            {cfg.unit}
          </dd>
        </div>
      </dl>

      <div className={styles.controls}>
        <div className={styles.fields}>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>Target{cfg.unit}</span>
            <input
              type="number"
              inputMode="decimal"
              className={styles.input}
              step={cfg.step}
              value={valueText}
              onChange={(e) => {
                setValueText(e.target.value)
                setSource('custom')
              }}
            />
          </label>
          <label className={styles.field}>
            <span className={styles.fieldLabel}>esd{cfg.unit}</span>
            <input
              type="number"
              inputMode="decimal"
              className={styles.input}
              step={cfg.step}
              min={0}
              value={esdText}
              onChange={(e) => {
                setEsdText(e.target.value)
                setSource('custom')
              }}
            />
          </label>
        </div>

        <div className={styles.actions}>
          <button
            type="button"
            className={styles.secondary}
            onClick={useCodMean}
            disabled={!hasCodMean}
            title={
              hasCodMean
                ? 'Fill the fields with the COD reference mean'
                : 'No COD reference for this geometry'
            }
          >
            Use COD mean
          </button>
          <button
            type="button"
            className={styles.ghost}
            onClick={revert}
            disabled={saved === undefined && !dirty}
          >
            Revert
          </button>
          <button
            type="button"
            className={styles.save}
            onClick={save}
            disabled={!dirty}
          >
            Save change
          </button>
        </div>
      </div>

      <p className={styles.hint}>
        Editing the idealised {geometryEditLabel(props.kind)} restraint — the
        measured value here is unaffected. Saved changes appear in the summary
        panel above.
      </p>
    </div>
  )
}
