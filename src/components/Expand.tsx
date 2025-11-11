import { ComponentProps, FC } from "react"
import { ChevronRight } from "lucide-react"
import { twMerge } from "tailwind-merge"

export const ExpandBtn: FC<
  {
    expanded: boolean
    direction?: "horizontal" | "vertical"
  } & ComponentProps<typeof ChevronRight>
> = ({ expanded, direction = "horizontal", ...props }) => (
  <ChevronRight
    size={16}
    {...props}
    className={twMerge(
      "transition-transform",
      direction === "horizontal"
        ? expanded && "rotate-90"
        : expanded
          ? "-rotate-90"
          : "rotate-90",
      props.className,
    )}
  />
)
