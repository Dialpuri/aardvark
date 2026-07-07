import { useRef, useState } from 'react'
import { Button } from '@/components/Button'
import {
  formatFromFilename,
  wrapInput,
  type AnalyseRequest,
} from '@/lib/analyse'
import styles from './ValidationInput.module.css'

type Tab = 'smiles' | 'file'

const examples = [
  { name: 'caffeine', smiles: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
  { name: 'aspirin', smiles: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
  { name: 'ibuprofen', smiles: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O' },
]

const FILE_ACCEPT = '.cif,.mol,.sdf,.mol2,.pdb,.ent'
const SMILES_FILE_ACCEPT = '.smi,.smiles,.txt'

// .smi files hold one molecule per line, optionally followed by a name/extra
// columns. Take the first token of the first non-empty line.
function smilesFromFileText(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const token = line.trim().split(/\s+/)[0]
    if (token) return token
  }
  return ''
}

interface ValidationInputProps {
  onSubmit: (request: AnalyseRequest) => void
}

export function ValidationInput(props: ValidationInputProps) {
  const [tab, setTab] = useState<Tab>('smiles')
  const [smiles, setSmiles] = useState('CN1C=NC2=C1C(=O)N(C(=O)N2C)C')
  const [file, setFile] = useState<File | null>(null)
  const [smilesFileName, setSmilesFileName] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const smilesFileInput = useRef<HTMLInputElement>(null)

  async function loadSmilesFile(f: File | null) {
    if (!f) return
    setSmiles(smilesFromFileText(await f.text()))
    setSmilesFileName(f.name)
  }

  const fileFormat = file ? formatFromFilename(file.name) : null
  const canSubmit =
    tab === 'smiles' ? smiles.trim() !== '' : fileFormat !== null

  async function submit() {
    if (tab === 'smiles') {
      props.onSubmit(wrapInput('smiles', smiles.trim()))
      return
    }
    if (!file || fileFormat === null) return
    props.onSubmit(wrapInput(fileFormat, await file.text()))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === 'smiles'}
          className={`${styles.tab} ${tab === 'smiles' ? styles.tabActive : ''}`}
          onClick={() => setTab('smiles')}
        >
          SMILES string
        </button>
        <button
          role="tab"
          aria-selected={tab === 'file'}
          className={`${styles.tab} ${tab === 'file' ? styles.tabActive : ''}`}
          onClick={() => setTab('file')}
        >
          Molecule file
        </button>
      </div>

      <div className={styles.body}>
        {tab === 'smiles' ? (
          <>
            <textarea
              className={styles.textarea}
              spellCheck={false}
              value={smiles}
              onChange={(e) => {
                setSmiles(e.target.value)
                setSmilesFileName(null)
              }}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                void loadSmilesFile(e.dataTransfer.files?.[0] ?? null)
              }}
              aria-label="SMILES string"
            />
            <div className={styles.examples}>
              <span className={styles.examplesLabel}>Try:</span>
              {examples.map((ex, i) => (
                <button
                  key={ex.name}
                  className={`${styles.chip} ${i === 0 ? styles.chipBrand : ''}`}
                  onClick={() => {
                    setSmiles(ex.smiles)
                    setSmilesFileName(null)
                  }}
                >
                  {ex.name}
                </button>
              ))}
            </div>
            <div className={styles.smilesUpload}>
              <input
                ref={smilesFileInput}
                type="file"
                accept={SMILES_FILE_ACCEPT}
                className={styles.fileInput}
                onChange={(e) => {
                  void loadSmilesFile(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
              <span>or</span>
              <button
                className={styles.uploadLink}
                onClick={() => smilesFileInput.current?.click()}
              >
                upload a <code>.smi</code> file
              </button>
              {smilesFileName && (
                <span className={styles.uploadedName}>
                  — loaded {smilesFileName}
                </span>
              )}
            </div>
          </>
        ) : (
          <div
            className={styles.dropzone}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              setFile(e.dataTransfer.files?.[0] ?? null)
            }}
          >
            <input
              ref={fileInput}
              type="file"
              accept={FILE_ACCEPT}
              className={styles.fileInput}
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className={styles.dropIcon} />
            {file ? (
              <div className={styles.dropTitle}>
                {file.name}
                {fileFormat === null && (
                  <span className={styles.fileError}>
                    {' '}
                    — unsupported file type
                  </span>
                )}
              </div>
            ) : (
              <div className={styles.dropTitle}>
                Drop a <code>.cif</code> / <code>.mol</code> / <code>.pdb</code>{' '}
                file
              </div>
            )}
            <div className={styles.dropOr}>or</div>
            <Button
              variant="secondary"
              onClick={() => fileInput.current?.click()}
            >
              Browse files
            </Button>
          </div>
        )}

        <button
          className={styles.submit}
          disabled={!canSubmit}
          onClick={() => void submit()}
        >
          Validate geometry →
        </button>
      </div>
    </div>
  )
}
