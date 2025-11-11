import { EditAccountId, NOTIN } from "@polkadot-api/react-builder"

export const CAccountId: EditAccountId = ({ value, onValueChanged }) => {
  return (
    <div className="space-y-2">
      <input 
        type="text"
        className="w-full p-2 border rounded font-mono text-sm"
        placeholder="Enter account address..."
        value={value === NOTIN ? "" : value}
        onChange={(e) => {
          const newValue = e.target.value.trim()
          onValueChanged(newValue === "" ? NOTIN : newValue)
        }}
      />
      {value !== NOTIN && (
        <div className="text-xs text-muted-foreground font-mono break-all">
          {value}
        </div>
      )}
    </div>
  )
}
