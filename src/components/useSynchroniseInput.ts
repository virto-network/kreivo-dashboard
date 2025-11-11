import { NOTIN } from "@polkadot-api/react-builder"
import { useEffect, useLayoutEffect, useRef, useState } from "react"

export const useGenericSynchronizeInput = <T extends unknown, R>(
  value: T | NOTIN,
  onValueChanged: (value: T | NOTIN) => void,
  parseValue: (value: R) => T | NOTIN,
  defaultValue: R,
  serializeValue: (value: T) => R,
  eqFn: (input: R, value: T | NOTIN) => boolean,
) => {
  const [inputValue, setInputValue] = useState<R>(defaultValue)
  const values = useRef({
    editor: value,
    input: inputValue,
  })

  useLayoutEffect(() => {
    values.current.editor = value
    if (!eqFn(values.current.input, value)) {
      const r = value === NOTIN ? defaultValue : serializeValue(value)
      setInputValue(r)
    }
  }, [value])

  useEffect(() => {
    if (inputValue === values.current.input) return
    values.current.input = inputValue
    const parsed = parseValue(inputValue)
    if (parsed !== values.current.editor) {
      onValueChanged(parsed)
    }
  }, [inputValue])

  return [inputValue, setInputValue] as const
}

export const useSynchronizeInput = <T extends unknown>(
  value: T | NOTIN,
  onValueChanged: (value: T | NOTIN) => void,
  parseValue: (value: string) => T | NOTIN,
) =>
  useGenericSynchronizeInput(
    value,
    onValueChanged,
    parseValue,
    "",
    String,
    (input, value) => parseValue(input) === value,
  )
