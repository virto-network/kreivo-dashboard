import { useSubtreeFocus } from "../common/SubtreeFocus"
import { EditTuple } from "@polkadot-api/react-builder"

export const CTuple: EditTuple = ({ innerComponents, path }) => {
  const focus = useSubtreeFocus()
  const sub = focus.getNextPath(path)
  if (sub) {
    return innerComponents[Number(sub)]
  }

  return (
    <>
      <span>Tuple</span>
      <ul className="flex flex-col gap-2">
        {innerComponents.map((jsx, idx) => (
          <li key={idx}>{jsx}</li>
        ))}
      </ul>
    </>
  )
}
