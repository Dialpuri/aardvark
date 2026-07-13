import { useRef, useState } from 'react'
import { Button } from '@/components/Button'
import {
  formatFromFilename,
  wrapInput,
  type AnalyseRequest,
} from '@/lib/analyse'
import styles from './ValidationInput.module.css'

/** Text-entry formats (typed or pasted), as opposed to the file dropzone. */
type TextFormat = 'smiles' | 'inchi'
type Tab = TextFormat | 'file'

interface TextTabConfig {
  format: TextFormat
  /** Label shown on the tab. */
  tabLabel: string
  /** Extensions accepted when uploading this format as a plain-text file. */
  fileAccept: string
  /** Noun for the upload link, e.g. `.smi`. */
  fileNoun: string
  /** Starter value for the textarea. */
  initial: string
  examples: { name: string; value: string }[]
}

const TEXT_TABS: TextTabConfig[] = [
  {
    format: 'smiles',
    tabLabel: 'SMILES string',
    fileAccept: '.smi,.smiles,.txt',
    fileNoun: '.smi',
    initial: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C',
    examples: [
      { name: 'caffeine', value: 'CN1C=NC2=C1C(=O)N(C(=O)N2C)C' },
      { name: 'aspirin', value: 'CC(=O)OC1=CC=CC=C1C(=O)O' },
      { name: 'ibuprofen', value: 'CC(C)CC1=CC=C(C=C1)C(C)C(=O)O' },
    ],
  },
  {
    format: 'inchi',
    tabLabel: 'InChI',
    fileAccept: '.inchi,.txt',
    fileNoun: '.inchi',
    initial:
      'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3',
    examples: [
      {
        name: 'caffeine',
        value:
          'InChI=1S/C8H10N4O2/c1-10-4-9-6-5(10)7(13)12(3)8(14)11(6)2/h4H,1-3H3',
      },
      {
        name: 'aspirin',
        value:
          'InChI=1S/C9H8O4/c1-6(10)13-8-5-3-2-4-7(8)9(11)12/h2-5H,1H3,(H,11,12)',
      },
      {
        name: 'ibuprofen',
        value:
          'InChI=1S/C13H18O2/c1-9(2)8-11-4-6-12(7-5-11)10(3)13(14)15/h4-7,9-10H,8H2,1-3H3,(H,14,15)',
      },
    ],
  },
]

const FILE_ACCEPT = '.cif,.mol,.sdf,.mol2,.pdb,.ent'

// .smi / .inchi files hold one entry per line, optionally followed by a name or
// extra columns. Take the first token of the first non-empty line.
function firstToken(text: string): string {
  for (const line of text.split(/\r?\n/)) {
    const token = line.trim().split(/\s+/)[0]
    if (token) return token
  }
  return ''
}

/** Build a per-format record keyed by {@link TextFormat}, same value for each. */
function seedByFormat<T>(value: T): Record<TextFormat, T> {
  return { smiles: value, inchi: value }
}

interface ValidationInputProps {
  onSubmit: (request: AnalyseRequest) => void
}

export function ValidationInput(props: ValidationInputProps) {
  const [tab, setTab] = useState<Tab>('smiles')
  const [text, setText] = useState<Record<TextFormat, string>>({
    smiles: TEXT_TABS[0].initial,
    inchi: TEXT_TABS[1].initial,
  })
  const [uploadedName, setUploadedName] = useState<
    Record<TextFormat, string | null>
  >(seedByFormat(null))
  const [file, setFile] = useState<File | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const textFileInput = useRef<HTMLInputElement>(null)

  function setFormatText(
    format: TextFormat,
    value: string,
    name: string | null,
  ) {
    setText((prev) => ({ ...prev, [format]: value }))
    setUploadedName((prev) => ({ ...prev, [format]: name }))
  }

  async function loadTextFile(format: TextFormat, f: File | null) {
    if (!f) return
    setFormatText(format, firstToken(await f.text()), f.name)
  }

  // The visible text-tab config, or null while the file tab is active.
  const activeText = TEXT_TABS.find((c) => c.format === tab) ?? null
  const fileFormat = file ? formatFromFilename(file.name) : null
  const canSubmit = activeText
    ? text[activeText.format].trim() !== ''
    : fileFormat !== null

  async function submit() {
    if (activeText) {
      const value = text[activeText.format].trim()
      if (value !== '') props.onSubmit(wrapInput(activeText.format, value))
      return
    }
    if (!file || fileFormat === null) return
    props.onSubmit(wrapInput(fileFormat, await file.text()))
  }

  return (
    <div className={styles.panel}>
      <div className={styles.tabs} role="tablist">
        {TEXT_TABS.map((t) => (
          <button
            key={t.format}
            role="tab"
            aria-selected={tab === t.format}
            className={`${styles.tab} ${tab === t.format ? styles.tabActive : ''}`}
            onClick={() => setTab(t.format)}
          >
            {t.tabLabel}
          </button>
        ))}
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
        {activeText ? (
          <>
            <textarea
              className={styles.textarea}
              spellCheck={false}
              value={text[activeText.format]}
              onChange={(e) =>
                setFormatText(activeText.format, e.target.value, null)
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault()
                void loadTextFile(
                  activeText.format,
                  e.dataTransfer.files?.[0] ?? null,
                )
              }}
              aria-label={activeText.tabLabel}
            />
            <div className={styles.examples}>
              <span className={styles.examplesLabel}>Try:</span>
              {activeText.examples.map((ex) => (
                <button
                  key={ex.name}
                  className={`${styles.chip} ${text[activeText.format] === ex.value ? styles.chipBrand : ''}`}
                  onClick={() =>
                    setFormatText(activeText.format, ex.value, null)
                  }
                >
                  {ex.name}
                </button>
              ))}
            </div>
            <div className={styles.smilesUpload}>
              <input
                ref={textFileInput}
                type="file"
                accept={activeText.fileAccept}
                className={styles.fileInput}
                onChange={(e) => {
                  void loadTextFile(
                    activeText.format,
                    e.target.files?.[0] ?? null,
                  )
                  e.target.value = ''
                }}
              />
              <span>or</span>
              <button
                className={styles.uploadLink}
                onClick={() => textFileInput.current?.click()}
              >
                upload a <code>{activeText.fileNoun}</code> file
              </button>
              {uploadedName[activeText.format] && (
                <span className={styles.uploadedName}>
                  — loaded {uploadedName[activeText.format]}
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
