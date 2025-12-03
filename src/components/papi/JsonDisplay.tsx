import JsonView from "react18-json-view"
import "react18-json-view/src/style.css"
import "./jsonDisplay.css"

interface JsonDisplayProps {
  src: unknown
  collapsed?: boolean | number
}

export const JsonDisplay = ({ src, collapsed }: JsonDisplayProps) => {
  return (
    <JsonView
      src={src}
      collapsed={collapsed}
      dark={false}
      theme="a11y"
      customizeCopy={(v) => JSON.stringify(v, null, 2)}
    />
  )
}
