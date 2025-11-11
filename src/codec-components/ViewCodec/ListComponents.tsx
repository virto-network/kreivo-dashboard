import { ViewArray, ViewSequence, ViewTuple } from "@polkadot-api/react-builder"
import { useStateObservable } from "@react-rxjs/core"
import { FC, PropsWithChildren, ReactNode } from "react"
import { ListItem } from "../common/ListItem"
import { isActive$ } from "../common/paths.state"
import { useSubtreeFocus } from "../common/SubtreeFocus"
import { CopyChildBinary } from "./CopyBinary"
import { ChildProvider } from "./TitleContext"
import {
  ArrayVar,
  SequenceVar,
  TupleVar,
  Var,
} from "@polkadot-api/metadata-builders"
import { isComplexNested } from "./utils"

const ListItemComponent: FC<
  PropsWithChildren<{
    idx: number
    path: string[]
    field: Var
    value: unknown
  }>
> = ({ idx, path, children, field, value }) => {
  const pathStr = path.join(".")
  const isActive = useStateObservable(isActive$(pathStr))
  const isComplexShape = isComplexNested(field, value)

  return (
    <ChildProvider titleElement={null}>
      <ListItem
        idx={idx}
        path={path}
        actions={
          <div className="flex-1 text-right">
            <CopyChildBinary visible={isActive} />
          </div>
        }
        inline={!isComplexShape}
      >
        {children}
      </ListItem>
    </ChildProvider>
  )
}

const ListComponent: FC<{
  innerComponents: ReactNode[]
  path: string[]
  shape: ArrayVar | TupleVar | SequenceVar
  value: unknown[]
}> = ({ innerComponents, path, shape, value }) => {
  const focus = useSubtreeFocus()
  const sub = focus.getNextPath(path)
  if (sub) {
    return innerComponents[Number(sub)]
  }

  return (
    <ul className="w-full">
      {innerComponents.length ? (
        innerComponents.map((jsx, idx) => (
          <ListItemComponent
            key={idx}
            idx={idx}
            path={[...path, String(idx)]}
            field={shape.type === "tuple" ? shape.value[idx] : shape.value}
            value={value[idx]}
          >
            {jsx}
          </ListItemComponent>
        ))
      ) : (
        <span className="text-sm text-foreground/60">(Empty)</span>
      )}
    </ul>
  )
}

export const CArray: ViewArray = (props) => <ListComponent {...props} />
export const CSequence: ViewSequence = (props) => <ListComponent {...props} />
export const CTuple: ViewTuple = (props) => <ListComponent {...props} />
