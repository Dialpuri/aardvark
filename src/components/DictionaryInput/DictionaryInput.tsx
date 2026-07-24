import { useState } from 'react'
import { FileDropzone } from '@/components/FileDropzone'
import { InputPanel } from '@/components/InputPanel'
import {
  formatFromFilename,
  wrapInput,
  type AnalyseRequest,
} from '@/lib/analyse'

/** Validate the idealised geometry in a restraints `.cif` dictionary. */
export function DictionaryInput(props: {
  onSubmit: (request: AnalyseRequest) => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const fileFormat = file ? formatFromFilename(file.name) : null
  const canSubmit = fileFormat !== null

  async function submit() {
    if (!file || fileFormat === null) return
    props.onSubmit(wrapInput('dictionary', fileFormat, await file.text()))
  }

  return (
    <InputPanel canSubmit={canSubmit} onSubmit={() => void submit()}>
      <FileDropzone
        accept=".cif"
        hint={
          <>
            Drop a restraints <code>.cif</code> dictionary
          </>
        }
        file={file}
        onFile={setFile}
        error={
          file && fileFormat === null ? 'unsupported file type' : undefined
        }
      />
    </InputPanel>
  )
}
