import { createContext, useContext } from 'react'
import type { RemediationEdit } from '@/lib/remediation'

/**
 * Shared remediation state for a report: whether the editor is on, and the map
 * of saved restraint overrides keyed by {@link recordKey}. Lives in context
 * because both the per-row editors and the summary diff panel read and write it,
 * and the rows sit two levels below the panel. Provided by
 * {@link RemediationProvider}.
 */
export interface RemediationValue {
  editMode: boolean
  setEditMode: (on: boolean) => void
  /** Saved edits, keyed by record key. */
  edits: Map<string, RemediationEdit>
  getEdit: (key: string) => RemediationEdit | undefined
  /** Add or replace the edit under `edit.key`. */
  applyEdit: (edit: RemediationEdit) => void
  /** Drop the edit for one record (revert to the dictionary value). */
  revertEdit: (key: string) => void
  /** Drop every edit. */
  revertAll: () => void
}

export const RemediationContext = createContext<RemediationValue | null>(null)

/** Read the remediation state. Must be called under a {@link RemediationProvider}. */
export function useRemediation(): RemediationValue {
  const value = useContext(RemediationContext)
  if (value === null) {
    throw new Error('useRemediation must be used within a RemediationProvider')
  }
  return value
}
