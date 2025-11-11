import { Trigger, Arrow, Content, Portal, Root } from "@radix-ui/react-popover"
import { FC, PropsWithChildren, ReactNode } from "react"

export const Popover: FC<
  PropsWithChildren<{ content: ReactNode; open?: boolean }>
> = ({ children, content, open }) => (
  <Root open={open}>
    <Trigger asChild>{children}</Trigger>
    <Portal>
      <Content className="bg-popover text-popover-foreground border p-2 rounded max-w-[100vw]">
        {content}
        <Arrow className="fill-border" />
      </Content>
    </Portal>
  </Root>
)
