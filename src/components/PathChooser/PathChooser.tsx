import { motion } from 'framer-motion'
import { Card } from '@/components/Card'
import { chipIn, staggerContainer } from '@/lib/motion'
import type { AnalyseMode } from '@/lib/analyse'
import styles from './PathChooser.module.css'

interface PathOption {
  mode: AnalyseMode
  title: string
  tagline: string
  body: string
  accepts: string
}

const OPTIONS: PathOption[] = [
  {
    mode: 'dictionary',
    title: 'A dictionary',
    tagline: 'idealised geometry',
    body: 'Check the target geometry in a restraints dictionary. Provide an ACEDRG dictionary directly, or a SMILES / InChI and we build one on the server first.',
    accepts: 'dictionary CIF · SMILES · InChI',
  },
  {
    mode: 'model',
    title: 'A model or ligand',
    tagline: 'observed geometry',
    body: 'Check the geometry as actually built. Provide a coordinate model naming a ligand, or a standalone ligand file, and we score the measured bonds and angles.',
    accepts: 'PDB · mmCIF · MOL / SDF',
  },
]

interface PathChooserProps {
  onChoose: (mode: AnalyseMode) => void
}

export function PathChooser(props: PathChooserProps) {
  return (
    <motion.div
      className={styles.grid}
      variants={staggerContainer(0.1)}
      initial="hidden"
      animate="visible"
    >
      {OPTIONS.map((option) => (
        <motion.button
          key={option.mode}
          type="button"
          className={styles.option}
          variants={chipIn}
          onClick={() => props.onChoose(option.mode)}
        >
          <Card className={styles.card}>
            <span className={styles.tagline}>{option.tagline}</span>
            <h3 className={styles.title}>{option.title}</h3>
            <p className={styles.body}>{option.body}</p>
            <span className={styles.accepts}>{option.accepts}</span>
          </Card>
        </motion.button>
      ))}
    </motion.div>
  )
}
