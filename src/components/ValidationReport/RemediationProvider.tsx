import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { RemediationEdit } from '@/lib/remediation'
import { RemediationContext, type RemediationValue } from './RemediationContext'

/** Holds remediation state for a report and provides it to the rows and panel. */
export function RemediationProvider(props: { children: ReactNode }) {
  const [editMode, setEditMode] = useState(false)
  const [edits, setEdits] = useState<Map<string, RemediationEdit>>(new Map())

  const getEdit = useCallback((key: string) => edits.get(key), [edits])

  const applyEdit = useCallback((edit: RemediationEdit) => {
    setEdits((prev) => new Map(prev).set(edit.key, edit))
  }, [])

  const revertEdit = useCallback((key: string) => {
    setEdits((prev) => {
      const next = new Map(prev)
      next.delete(key)
      return next
    })
  }, [])

  const revertAll = useCallback(() => setEdits(new Map()), [])

  const value = useMemo<RemediationValue>(
    () => ({
      editMode,
      setEditMode,
      edits,
      getEdit,
      applyEdit,
      revertEdit,
      revertAll,
    }),
    [editMode, edits, getEdit, applyEdit, revertEdit, revertAll],
  )

  return (
    <RemediationContext.Provider value={value}>
      {props.children}
    </RemediationContext.Provider>
  )
}
