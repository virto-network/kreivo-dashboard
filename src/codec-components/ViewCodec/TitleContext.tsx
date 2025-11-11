import { createContext, FC, PropsWithChildren } from "react"
import { CopyBinaryProvider } from "./CopyBinary"

export const TitleContext = createContext<HTMLElement | null>(null)

export const ChildProvider: FC<
  PropsWithChildren<{ titleElement: HTMLElement | null }>
> = ({ titleElement, children }) => (
  <TitleContext.Provider value={titleElement}>
    <CopyBinaryProvider>{children}</CopyBinaryProvider>
  </TitleContext.Provider>
)
