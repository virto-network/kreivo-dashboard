import { createContext, useContext } from "react"
import { noop } from "rxjs"

const SubtreeFocusContext = createContext<{
  callback: (path: string[]) => void
  path: null | string[]
} | null>(null)

export const SubtreeFocus = SubtreeFocusContext.Provider

export const useSubtreeFocus = () => {
  const ctx = useContext(SubtreeFocusContext)
  if (!ctx) {
    return {
      setFocus: noop,
      getNextPath: () => null,
    }
  }

  return {
    setFocus: ctx.callback,
    getNextPath: (path: string[]) => {
      if (!ctx.path || path.length >= ctx.path.length) return null
      return ctx.path[path.length]
    },
  }
}
