import { XSquare } from "lucide-react"
import {
  FC,
  PropsWithChildren,
  ReactNode,
  createContext,
  useEffect,
  useState,
} from "react"
import { Portal } from "react-portal"
import { twMerge } from "tailwind-merge"
import "./modal.css"

export type ModalProps = PropsWithChildren<{
  title?: ReactNode
  open?: boolean
  // On some cases you have to disable this (e.g. when using non-native select boxes, those popups will go under the native dialog)
  useNative?: boolean
  onClose?: () => void
  className?: string
}>

export const ModalRefContext = createContext<HTMLElement | null>(null)

export const Modal: FC<ModalProps> = ({
  title,
  open,
  children,
  useNative = true,
  onClose,
  className,
}) => {
  const [ref, setRef] = useState<HTMLDialogElement | null>(null)
  const isDialogCompatible =
    useNative &&
    Boolean(typeof window === "undefined" || globalThis.HTMLDialogElement)

  useEffect(() => {
    if (!ref) return
    if (ref.open && !open) {
      ref.close()
    } else if (!ref.open && open) {
      // Not sure why, having this run in a useEffect (or useLayoutEffect) causes
      // an issue: on EditCodec+Tree, when hovering over a line of the tree view
      // and pressing on "Edit binary", the modal causes the `mouseleave` event
      // to not trigger, so the line becomes "Active" (and the binary view shows
      // highlight of something not being hovered on).
      // Seems that if `.showModal()` is called synchronously it doesn't happen.
      // It doesn't happen if `.showModal()` is called in a setTimeout.
      // But within a useEffect, the issue is present.
      let canceled = false
      setTimeout(() => {
        if (canceled) {
          return
        }
        ref.showModal()
      })
      return () => {
        canceled = true
      }
    }
  }, [open, ref])

  usePreventBodyScroll(open)
  const showContent = usePersistOpen(open)

  const content = showContent ? (
    <ModalContent title={title} onClose={onClose} className={className}>
      {children}
    </ModalContent>
  ) : null

  if (isDialogCompatible) {
    return (
      <dialog
        className="modal extrinsic-modal-dark rounded backdrop:backdrop-blur-[2px] backdrop:backdrop-contrast-75 flex flex-col overflow-hidden"
        ref={setRef}
        onClose={onClose}
        style={{
          background: "#12211E",
          border: "1px solid #263333",
          color: "#ded0f1",
        }}
      >
        <ModalRefContext.Provider value={ref}>
          {content}
        </ModalRefContext.Provider>
      </dialog>
    )
  }

  return (
    <Portal node={document.body}>
      <ModalPolyfill open={open} onClose={onClose}>
        {content}
      </ModalPolyfill>
    </Portal>
  )
}

const ModalPolyfill: FC<ModalProps> = ({ open, children, onClose }) => {
  useEffect(() => {
    const handleKeyDown = (evt: KeyboardEvent) => {
      if (evt.key === "Escape") onClose?.()
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [onClose])

  if (!open) return null

  return (
    <div
      className="z-[9998] fixed left-0 top-0 w-full h-full backdrop-blur-sm bg-black/60 flex items-center justify-center overflow-hidden"
      onScroll={(evt) => {
        evt.stopPropagation()
        evt.preventDefault()
      }}
      onClick={(e) => {
        // Close modal when clicking on backdrop
        if (e.target === e.currentTarget) {
          onClose?.()
        }
      }}
    >
      <div
        className="modal extrinsic-modal-dark rounded flex flex-col overflow-hidden z-[9999] relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#12211E",
          border: "1px solid #263333",
          color: "#ded0f1",
        }}
      >
        {children}
      </div>
    </div>
  )
}

const ModalContent: FC<
  PropsWithChildren<{
    title?: ReactNode
    onClose?: () => void
    className?: string
  }>
> = ({ title, onClose, children, className }) => (
  <>
    <div
      className="px-4 py-3 border-b flex overflow-hidden min-w-[10rem] shrink-0"
      style={{
        borderColor: "#263333",
      }}
    >
      <div className="flex-1 flex font-bold" style={{ color: "#ded0f1" }}>
        {title}
      </div>
      <button
        type="button"
        className="shrink-0"
        onClick={onClose}
        style={{
          color: "#ded0f1",
          opacity: 0.7,
          background: "transparent",
          border: "none",
          cursor: "pointer",
          transition: "opacity 0.2s ease",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = "0.7")}
      >
        <XSquare />
      </button>
    </div>
    <div
      className={twMerge("p-4 flex flex-col overflow-auto", className)}
      style={{ background: "#12211E", color: "#ded0f1" }}
    >
      {children}
    </div>
  </>
)

const usePreventBodyScroll = (open?: boolean) =>
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden"
      return () => {
        document.body.style.overflow = ""
      }
    }
  }, [open])

// Persists the `open` property to let the modal animate out before removing the children.
const usePersistOpen = (open?: boolean) => {
  const [persist, setPersist] = useState(Boolean(open))

  useEffect(() => {
    if (open) {
      setPersist(true)
    } else {
      const token = setTimeout(() => setPersist(false), 500)
      return () => clearTimeout(token)
    }
  }, [open])

  return open || persist
}
