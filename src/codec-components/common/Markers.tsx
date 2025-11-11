import { useHeightObserver } from "@/components/useHeightObserver"
import { useRefEffect } from "@/components/useRefEffect"
import {
  createContext,
  FC,
  PropsWithChildren,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { twMerge } from "tailwind-merge"

const MarkersContext = createContext<{
  observer: IntersectionObserver
  onMarkerRemoved: (id: string[]) => void
  range: [number, number]
} | null>(null)

export const Marker: FC<{ id: string[] }> = ({ id }) => {
  const ctx = useContext(MarkersContext)
  const ref = useRefEffect<HTMLElement>(
    (element) => {
      if (!ctx) return () => {}
      ctx.observer.observe(element)
      return () => {
        ctx.onMarkerRemoved(id)
        ctx.observer.unobserve(element)
      }
    },
    [ctx?.observer, id],
  )

  return <div id={"marker-" + id.join(".")} ref={ref} />
}

export const MarkersContextProvider: FC<PropsWithChildren> = ({ children }) => {
  const positions = useConstant(
    () => new Map<string, { top: number; height: number }>(),
  )
  const [range, setRange] = useState<[number, number]>([0, 0])

  const refreshRange = () => {
    const values = Array.from(positions.values())
    const min = values.reduce((a, b) => Math.min(a, b.top), values[0]?.top ?? 0)
    const max = values.reduce((a, b) => Math.max(a, b.top + b.height), 0)

    setRange([min, max])
  }

  const observer = useConstant(
    () =>
      new IntersectionObserver((cb) => {
        cb.forEach((v) => {
          if (v.isIntersecting) {
            const element = document.querySelector(
              `[data-marker="${v.target.id}"]`,
            )
            if (!element || !(element instanceof HTMLElement)) {
              return
            }
            positions.set(v.target.id, {
              top: element.offsetTop,
              height: element.offsetHeight,
            })
          } else {
            positions.delete(v.target.id)
          }
        })
        refreshRange()
      }),
  )

  const onMarkerRemoved = (id: string[]) => {
    const key = "marker-" + id.join(".")
    if (positions.has(key)) {
      positions.delete(key)
      refreshRange()
    }
  }

  return (
    <MarkersContext.Provider value={{ observer, range, onMarkerRemoved }}>
      {children}
    </MarkersContext.Provider>
  )
}

const useWindowTransition = (isAllVisible: boolean) => {
  const wasOff = useRef(false)

  useEffect(() => {
    wasOff.current = isAllVisible
  }, [isAllVisible])

  return !isAllVisible || !wasOff.current
}
export const VisibleWindow = () => {
  const ctx = useContext(MarkersContext)
  const [height, setHeight] = useState<number | null>(null)
  const ref = useHeightObserver(setHeight)

  const isAllVisible = // 🔫 always has been
    !!ctx &&
    ((Math.round(ctx.range[0]) === 0 &&
      Math.round(ctx.range[1]) === Math.round(height ?? NaN)) ||
      ctx.range[1] === 0)
  const transitionEnabled = useWindowTransition(isAllVisible)
  if (!ctx) return null

  const window = twMerge(
    "absolute left-0 right-0 ease-linear bg-foreground/5",
    transitionEnabled && "transition-all",
  )

  return (
    <div
      ref={ref}
      className={twMerge(
        "absolute top-0 right-0 left-0 bottom-0 pointer-events-none transition-all",
        isAllVisible && "border-x-0 border-y-0",
      )}
    >
      <div
        className={window}
        style={{
          top: ctx.range[0],
          height: ctx.range[1] - ctx.range[0],
        }}
      ></div>
    </div>
  )
}

const useConstant = <T extends any>(fn: () => T): T => {
  const ref = useRef<T | null>(null)
  if (!ref.current) {
    ref.current = fn()
  }

  return ref.current
}
