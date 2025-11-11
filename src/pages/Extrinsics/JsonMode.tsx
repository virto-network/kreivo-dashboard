import { JsonDisplay } from "@/components/JsonDisplay"
import { FC, useMemo } from "react"

export const JsonMode: FC<{
  decode: (value: Uint8Array) => unknown
  value: Uint8Array | null
}> = ({ decode, value }) => {
  const src = useMemo(() => (value ? decode(value) : null), [value, decode])

  return (
    <div className="overflow-auto p-2 text-sm">
      <JsonDisplay src={src} />
    </div>
  )
}
