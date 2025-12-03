import { EditBytes } from "@polkadot-api/react-builder"
import { BinaryInput } from "@/components/papi/BinaryInput"

export const CBytes: EditBytes = ({ value, onValueChanged, len }) => (
  <BinaryInput 
    encodedValue={value as any} 
    onValueChanged={onValueChanged as any} 
    len={len} 
  />
)
