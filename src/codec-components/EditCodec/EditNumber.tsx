/* eslint-disable react-hooks/rules-of-hooks */
import { FC } from "react"
import {
  EditBigNumber,
  EditBigNumberInterface,
  EditNumber,
  EditNumberInterface,
  NOTIN,
} from "@polkadot-api/react-builder"
import { TextInputField } from "./codec-components"
import { useSynchronizeInput } from "@/components/useSynchroniseInput"

const NumericEdit =
  <T extends number | bigint>(
    parseValue: (value: string) => T | NOTIN,
  ): FC<T extends bigint ? EditBigNumberInterface : EditNumberInterface> =>
  ({ value, onValueChanged, numType }) => {
    const getValidation = (value: string) => {
      const sign = numType.substring(0, 1)
      const size = Number(numType.substring(1))

      const maxValue = sign === "i" ? 2 ** size / 2 - 1 : 2 ** size - 1
      const minValue = sign === "i" ? -(2 ** size / 2) : 0

      const parsed = parseValue(value)
      if (parsed === NOTIN) return null
      if (parsed > maxValue) return "Too high. Max is " + maxValue
      if (parsed < minValue) return "Too low. Min is " + minValue
      return null
    }

    const [inputValue, setInputValue] = useSynchronizeInput(
      value as any,
      onValueChanged as any,
      (v) => (getValidation(v) ? NOTIN : parseValue(v)),
    )

    return (
      <TextInputField
        value={inputValue}
        onChange={setInputValue}
        placeholder={numType}
        warn={parseValue(inputValue) === NOTIN}
        error={getValidation(inputValue)}
      />
    )
  }

export const CNumber: EditNumber = NumericEdit((value: string) => {
  const parsed = Number(value)
  return value.trim() === "" || !Number.isSafeInteger(parsed) ? NOTIN : parsed
})
export const CBigNumber: EditBigNumber = NumericEdit((value: string) => {
  try {
    return value.trim() === "" ? NOTIN : BigInt(value)
  } catch (_) {
    return NOTIN
  }
})
