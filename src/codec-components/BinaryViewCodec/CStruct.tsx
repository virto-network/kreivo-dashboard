import { EditStruct, NOTIN } from "@polkadot-api/react-builder"
import { useStateObservable } from "@react-rxjs/core"
import React from "react"
import { isActive$ } from "../common/paths.state"
import { useSubtreeFocus } from "../common/SubtreeFocus"
import { highlight, MissingData } from "./codec-components"

export const CStruct: EditStruct = ({ innerComponents, value, path }) => {
  const isActive = useStateObservable(isActive$(path.join(".")))
  const focus = useSubtreeFocus()
  const sub = focus.getNextPath(path)
  if (sub) {
    const field = Object.entries(innerComponents).find(([key]) => key === sub)
    return field?.[1]
  }

  if (value === NOTIN) {
    return <MissingData />
  }

  return (
    <span className={highlight(isActive)}>
      {Object.entries(innerComponents).map(([key, jsx]) => (
        <React.Fragment key={key}>{jsx}</React.Fragment>
      ))}
    </span>
  )
}
