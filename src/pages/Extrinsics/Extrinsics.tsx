import { BinaryDisplay } from "@/codec-components/LookupTypeEdit"
import { ButtonGroup } from "@/components/ButtonGroup"
import { LoadingMetadata } from "@/components/Loading"
import NotificationContainer from "@/components/NotificationContainer"
import Spinner from "@/components/Spinner"
import { withSubscribe } from "@/components/withSuspense"
import { useNotification } from "@/hooks/useNotification"
import { useSpinner } from "@/hooks/useSpinner"

import {
  localRuntimeCtx$,
} from "@/state/chains/chain.state"
import {
  CodecComponentType,
  CodecComponentValue,
} from "@polkadot-api/react-builder"
import { Binary } from "@polkadot-api/substrate-bindings"
import { state, useStateObservable } from "@react-rxjs/core"
import { useState } from "react"
import { map } from "rxjs"
import { twMerge } from "tailwind-merge"
import { EditMode } from "./EditMode"
import { JsonMode } from "./JsonMode"

const extrinsicProps$ = state(
  localRuntimeCtx$.pipe(
    map(({ dynamicBuilder, lookup }) => {
      const codecType =
        "call" in lookup.metadata.extrinsic
          ? lookup.metadata.extrinsic.call
          : // TODO v14 is this one?
            lookup.metadata.extrinsic.type
      return {
        metadata: lookup.metadata,
        codecType,
        codec: dynamicBuilder.buildDefinition(codecType),
      }
    }),
  ),
)

export interface ExtrinsicsProps {
  onSend?: (encodedCallHex: string) => void;
  isLoading?: boolean;
  setIsLoading?: (loading: boolean) => void;
}

const ExtrinsicsInner: React.FC<ExtrinsicsProps> = ({ onSend, isLoading = false, setIsLoading }) => {
  const [viewMode, setViewMode] = useState<"edit" | "json">("edit")
  const [error, setError] = useState<string>('')
  const extrinsicProps = useStateObservable(extrinsicProps$)

  const { notifications, showSuccessNotification, showErrorNotification, removeNotification } = useNotification()
  const { isSpinnerVisible, spinnerText, showSpinner, hideSpinner } = useSpinner()

  const [componentValue, setComponentValue] = useState<CodecComponentValue>({
    type: CodecComponentType.Initial,
    value: "",
  })

  const binaryValue =
    (componentValue.type === CodecComponentType.Initial
      ? componentValue.value
      : componentValue.value.empty
        ? null
        : componentValue.value.encoded) ?? null

  const encodedHex: string | null = (() => {
    if (!binaryValue) return null
    if (typeof binaryValue === "string") {
      return binaryValue.startsWith("0x") ? binaryValue : `0x${binaryValue}`
    }
    try {
      return Binary.fromBytes(binaryValue as Uint8Array).asHex()
    } catch {
      return null
    }
  })()

  const handleSendExtrinsic = async (encodedCallHex: string) => {
    if (!encodedCallHex) {
      setError('No encoded call data available')
      showErrorNotification("Validation Error", "No encoded call data available")
      return
    }

    if (setIsLoading) setIsLoading(true)
    setError('')
    showSpinner('Sending transaction...')

    try {
      if (onSend) {
        await onSend(encodedCallHex)
        showSuccessNotification("Transaction Sent!", "Your custom extrinsic has been submitted successfully.")
      }
    } catch (err: any) {
      const errorMsg = `Failed to send transaction: ${err?.message || 'Please try again'}`
      console.error('Custom transaction failed:', err)
      setError(errorMsg)
      showErrorNotification("Transaction Error", errorMsg)
    } finally {
      if (setIsLoading) setIsLoading(false)
      hideSpinner()
    }
  }

  return (
    <div
      className={twMerge(
        "flex flex-col h-full overflow-hidden gap-2 p-4 pb-0",
        // Bypassing top-level scroll area, since we need a specific scroll area for the tree view
        "absolute w-full max-w-[88%] max-h-[65%]",
      )}
    >

      <BinaryDisplay
        {...extrinsicProps}
        value={componentValue}
        onUpdate={(value) =>
          setComponentValue({ type: CodecComponentType.Updated, value })
        }
      />

      <div className="flex flex-row justify-between px-2 items-center gap-2">
        <ButtonGroup
          value={viewMode}
          onValueChange={setViewMode as any}
          items={[
            {
              value: "edit",
              content: "Edit",
            },
            {
              value: "json",
              content: "JSON",
              disabled: !binaryValue,
            },
          ]}
        />
        <button
          type="button"
          className={`extrinsic-send-button ${!encodedHex || isLoading ? 'disabled' : ''}`}
          disabled={!encodedHex || isLoading}
          onClick={() => {
            if (!encodedHex || isLoading) return
            handleSendExtrinsic(encodedHex)
          }}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>

      {error && (
        <div className="px-2">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {viewMode === "edit" ? (
        <EditMode
          {...extrinsicProps}
          value={componentValue}
          onUpdate={(value) =>
            setComponentValue({ type: CodecComponentType.Updated, value })
          }
        />
      ) : (
        <JsonMode
          value={
            typeof binaryValue === "string"
              ? Binary.fromHex(binaryValue).asBytes()
              : binaryValue
          }
          decode={extrinsicProps.codec.dec}
        />
      )}

      <NotificationContainer
        notifications={notifications}
        onRemoveNotification={removeNotification}
      />
      
      <Spinner
        isVisible={isSpinnerVisible}
        text={spinnerText}
      />
    </div>
  )
}

export const Extrinsics = withSubscribe<ExtrinsicsProps>(ExtrinsicsInner, {
  fallback: <LoadingMetadata />,
})
