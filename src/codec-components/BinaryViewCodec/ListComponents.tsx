import {
  EditArray,
  EditComplexCodecComponentProps,
  EditSequence,
  EditTuple,
  NOTIN,
} from "@polkadot-api/react-builder"
import { compact } from "@polkadot-api/substrate-bindings"
import { useStateObservable } from "@react-rxjs/core"
import React, { ReactNode } from "react"
import { isActive$ } from "../common/paths.state"
import { useSubtreeFocus } from "../common/SubtreeFocus"
import {
  headerHighlight,
  highlight,
  MissingData,
  toConcatHex,
} from "./codec-components"

export const CSequence: EditSequence = (props) => <ListDisplay {...props} />

export const CArray: EditArray = (props) => (
  <ListDisplay {...props} fixedLength />
)

export const CTuple: EditTuple = (props) => (
  <ListDisplay {...props} fixedLength />
)

export const ListDisplay: React.FC<
  EditComplexCodecComponentProps<unknown[]> & {
    innerComponents: ReactNode[]
    fixedLength?: boolean
  }
> = (props) => {
  const { innerComponents, fixedLength, value, path } = props
  const isActive = useStateObservable(isActive$(path.join(".")))
  const focus = useSubtreeFocus()
  const sub = focus.getNextPath(path)
  if (sub) {
    return innerComponents[Number(sub)]
  }

  if (value === NOTIN) {
    return <MissingData />
  }

  return (
    <span className={highlight(isActive)}>
      {fixedLength ? null : (
        <span className={headerHighlight(isActive)}>
          {toConcatHex(compact.enc(value.length))}
        </span>
      )}
      {innerComponents.map((jsx, idx) => (
        <React.Fragment key={idx}>{jsx}</React.Fragment>
      ))}
    </span>
  )
}
