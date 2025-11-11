import { useCallback, useEffect, useRef } from "react"

export const useRefEffect = <T extends any>(
  effect: (value: T) => () => void,
  deps: any[] = [],
) => {
  const ref = useRef<[(() => void) | null, T] | null>(null)
  const setRef = useCallback((value: T | null) => {
    if (ref.current?.[0]) {
      ref.current?.[0]()
    }
    ref.current = value ? [effect(value), value] : null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (ref.current && !ref.current[0]) {
      ref.current[0] = effect(ref.current[1])
    }
    return () => {
      if (ref.current) {
        ref.current[0]?.()
        ref.current[0] = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return setRef
}
