import { ChemistryInput } from '@/components/ChemistryInput'
import { DictionaryInput } from '@/components/DictionaryInput'
import { ModelInput } from '@/components/ModelInput'
import type { AnalyseMode, AnalyseRequest } from '@/lib/analyse'

/** Render the input UI for the chosen validation pathway. */
export function ValidationInput(props: {
  mode: AnalyseMode
  onSubmit: (request: AnalyseRequest) => void
}) {
  switch (props.mode) {
    case 'dictionary':
      return <DictionaryInput onSubmit={props.onSubmit} />
    case 'model':
      return <ModelInput onSubmit={props.onSubmit} />
    case 'chemistry':
      return <ChemistryInput onSubmit={props.onSubmit} />
  }
}
