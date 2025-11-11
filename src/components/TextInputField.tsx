import { FC, ReactNode, useState } from "react"
import { twMerge } from "tailwind-merge"

export const TextInputField: FC<{
  className?: string
  error?: string | boolean | null
  softError?: string | boolean | null
  warn?: string | boolean | null
  placeholder?: string
  value: string
  onChange: (value: string) => void
  children?: (inputElement: ReactNode) => ReactNode
}> = ({
  className,
  error,
  softError,
  warn,
  value,
  placeholder,
  onChange,
  children = (v) => v,
}) => {
  const [hasBlurred, blur] = useState(false)

  return (
    <div className="flex gap-1 items-center">
      {children(
        <input
          className={twMerge(
            "px-4 py-2 border border-border leading-tight text-foreground",
            warn ? "border-orange-400" : null,
            error ? "border-red-600" : null,
            className,
          )}
          value={value}
          placeholder={placeholder}
          onChange={(evt) => onChange(evt.target.value)}
          onFocus={() => blur(false)}
          onBlur={() => blur(true)}
        />,
      )}
      {(hasBlurred || error) &&
        (typeof (error || softError) === "string" ? (
          <span className="text-red-600 text-sm">{error || softError}</span>
        ) : typeof warn === "string" ? (
          <span className="text-orange-400 text-sm">{warn}</span>
        ) : null)}
    </div>
  )
}
