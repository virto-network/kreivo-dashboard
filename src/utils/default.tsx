import { NOTIN } from "@polkadot-api/react-builder"

export const withDefault: <T>(value: T | NOTIN, fallback: T) => T = (
  value,
  fallback,
) => (value === NOTIN ? fallback : value)
