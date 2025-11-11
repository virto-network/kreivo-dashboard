import { useRefEffect } from "./useRefEffect"

export const useHeightObserver = (onChange: (height: number) => void) =>
  useRefEffect<HTMLElement>(
    (element) => {
      const observer = new ResizeObserver((cb) => {
        onChange(cb[0]?.borderBoxSize[0]?.blockSize ?? 0)
      })

      observer.observe(element)
      return () => {
        observer.unobserve(element)
        observer.disconnect()
      }
    },
    [onChange],
  )
