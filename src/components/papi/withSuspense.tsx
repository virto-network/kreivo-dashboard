import { Subscribe } from "@react-rxjs/core"
import { ComponentType, ReactNode } from "react"
import { Observable } from "rxjs"

export const withSubscribe =
  <T extends object>(
    Component: ComponentType<T>,
    options: Partial<{
      source$: Observable<unknown>
      fallback: ReactNode
    }> = {},
  ) =>
  (props: T) => (
    <Subscribe {...options}>
      <Component {...props} />
    </Subscribe>
  )
