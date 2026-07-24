import { useState } from 'react'
import { FileDropzone } from '@/components/FileDropzone'
import { InputPanel } from '@/components/InputPanel'
import {
  formatFromFilename,
  wrapInput,
  type AnalyseRequest,
} from '@/lib/analyse'
import styles from './ModelInput.module.css'

/** Validate the geometry as built in a coordinate model. */
export function ModelInput(props: {
  onSubmit: (request: AnalyseRequest) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [compId, setCompId] = useState('')
  const fileFormat = file ? formatFromFilename(file.name) : null
  // Every accepted format (CIF / mmCIF / PDB) describes a whole structure, so a
  // ligand code is always needed to pick out the residue to validate.
  const canSubmit = fileFormat !== null && compId.trim() !== ''

  async function submit() {
    if (!file || fileFormat === null || compId.trim() === '') return
    props.onSubmit(
      wrapInput('model', fileFormat, await file.text(), compId.trim()),
    )
  }

  return (
    <InputPanel canSubmit={canSubmit} onSubmit={() => void submit()}>
      <FileDropzone
        accept=".cif,.mmcif,.pdb"
        hint={
          <>
            Drop a model <code>.cif</code> / <code>.pdb</code> file
          </>
        }
        file={file}
        onFile={setFile}
        error={
          file && fileFormat === null ? 'unsupported file type' : undefined
        }
      />
      <label className={styles.compId}>
        <span className={styles.compIdLabel}>Ligand code</span>
        <input
          className={styles.compIdInput}
          value={compId}
          spellCheck={false}
          placeholder="e.g. A1C3B"
          onChange={(e) => setCompId(e.target.value)}
        />
      </label>
    </InputPanel>
  )
}
