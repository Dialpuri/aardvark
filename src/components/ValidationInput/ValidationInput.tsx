import { useRef, useState } from 'react'
import { Button } from '@/components/Button'
import {
  formatFromFilename,
  wrapInput,
  type AnalyseMode,
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

/** Per-mode configuration of the file dropzone (accepted files + labels). */
interface FileTabConfig {
  /** Label on the file tab (dictionary mode) / not shown in model mode. */
  tabLabel: string
  /** `accept` attribute for the dropzone file input. */
  accept: string
  /** The dropzone's prompt, e.g. `<code>.cif</code>` snippets. */
  hint: React.ReactNode
}

const FILE_TABS: Record<AnalyseMode, FileTabConfig> = {
  dictionary: {
    tabLabel: 'Dictionary file',
    accept: '.cif',
    hint: (
      <>
        Drop a restraints <code>.cif</code> dictionary
      </>
    ),
  },
  model: {
    tabLabel: 'Molecule file',
    accept: '.cif,.mmcif,.pdb,.ent,.mol,.sdf,.mol2',
    hint: (
      <>
        Drop a <code>.pdb</code> / <code>.cif</code> / <code>.mol</code> file
      </>
    ),
  },
  chemistry: {
    tabLabel: 'Chemistry file',
    accept: '.mol,.sdf,.mol2,.smi,.inchi',
    hint: (
      <>
        Drop a <code>.mol</code> / <code>.sdf</code> chemistry file
      </>
    ),
  },
}

/**
 * Model-path formats that describe a whole structure and so need a `comp_id` to
 * pick out the ligand. Single-ligand formats (MOL/SDF) don't.
 */
function needsCompId(format: ReturnType<typeof formatFromFilename>): boolean {
  return format === 'pdb' || format === 'cif'
}

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
  mode: AnalyseMode
  onSubmit: (request: AnalyseRequest) => void
}

export function ValidationInput(props: ValidationInputProps) {
  // The dictionary and chemistry paths take a chemical description, so they
  // offer typed SMILES/InChI as well as a file; the model path is file-only
  // (plus a ligand code), so it opens straight on the dropzone.
  const textTabs = props.mode === 'model' ? [] : TEXT_TABS
  const fileTab = FILE_TABS[props.mode]
  const [tab, setTab] = useState<Tab>(
    props.mode === 'model' ? 'file' : 'smiles',
  )
  const [text, setText] = useState<Record<TextFormat, string>>({
    smiles: TEXT_TABS[0].initial,
    inchi: TEXT_TABS[1].initial,
  })
  const [uploadedName, setUploadedName] = useState<
    Record<TextFormat, string | null>
  >(seedByFormat(null))
  const [file, setFile] = useState<File | null>(null)
  const [compId, setCompId] = useState('')
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
  const activeText = textTabs.find((c) => c.format === tab) ?? null
  const fileFormat = file ? formatFromFilename(file.name) : null
  const compIdRequired = props.mode === 'model' && needsCompId(fileFormat)
  const canSubmit = activeText
    ? text[activeText.format].trim() !== ''
    : fileFormat !== null && (!compIdRequired || compId.trim() !== '')

  async function submit() {
    if (activeText) {
      const value = text[activeText.format].trim()
      if (value !== '')
        props.onSubmit(wrapInput(props.mode, activeText.format, value))
      return
    }
    if (!file || fileFormat === null) return
    if (compIdRequired && compId.trim() === '') return
    props.onSubmit(
      wrapInput(
        props.mode,
        fileFormat,
        await file.text(),
        compId.trim() || undefined,
      ),
    )
  }

  return (
    <div className={styles.panel}>
      {textTabs.length > 0 && (
        <div className={styles.tabs} role="tablist">
          {textTabs.map((t) => (
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
            {fileTab.tabLabel}
          </button>
        </div>
      )}

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
          <>
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
                accept={fileTab.accept}
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
                <div className={styles.dropTitle}>{fileTab.hint}</div>
              )}
              <div className={styles.dropOr}>or</div>
              <Button
                variant="secondary"
                onClick={() => fileInput.current?.click()}
              >
                Browse files
              </Button>
            </div>

            {props.mode === 'model' && (
              <label className={styles.compId}>
                <span className={styles.compIdLabel}>
                  Ligand code
                  {compIdRequired ? '' : ' (optional)'}
                </span>
                <input
                  className={styles.compIdInput}
                  value={compId}
                  spellCheck={false}
                  placeholder="e.g. A1C3B"
                  onChange={(e) => setCompId(e.target.value)}
                />
              </label>
            )}
          </>
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
