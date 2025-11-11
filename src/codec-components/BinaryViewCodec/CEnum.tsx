import { EditEnum, NOTIN } from "@polkadot-api/react-builder"
import { u8 } from "@polkadot-api/substrate-bindings"
import { useStateObservable } from "@react-rxjs/core"
import { isActive$ } from "../common/paths.state"
import { useSubtreeFocus } from "../common/SubtreeFocus"
import {
  headerHighlight,
  highlight,
  MissingData,
  toConcatHex,
} from "./codec-components"

export const CEnum: EditEnum = ({ value, inner, path, shape }) => {
  const isActive = useStateObservable(isActive$(path.join(".")))
  const focus = useSubtreeFocus()
  const sub = focus.getNextPath(path)
  if (sub) {
    return inner
  }

  if (value === NOTIN) return <MissingData />

  const entry = shape.value[value.type]
  if (!entry) {
    console.log(shape.value, value.type)
    throw new Error("Type not found??")
  }
  return (
    <span className={highlight(isActive)}>
      <span className={headerHighlight(isActive)}>
        {toConcatHex(u8.enc(entry.idx))}
      </span>
      {inner}
    </span>
  )
}
