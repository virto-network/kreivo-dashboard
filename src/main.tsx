import { dynamicBuilder$ } from "@/state/chains/chain.state"
import { RemoveSubscribe, Subscribe } from "@react-rxjs/core"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { BrowserRouter } from "react-router-dom"
import { merge } from "rxjs"
import App from "./App.tsx"
import { TooltipProvider } from "./components/papi/ui/tooltip.tsx"
import "./index.css"

const link = document.createElement("link")
link.href =
  "https://fonts.googleapis.com/css2?family=Outfit:wght@100..900&display=swap"
link.rel = "stylesheet"
document.head.appendChild(link)

createRoot(document.getElementById("root")!).render(
  <Subscribe source$={merge(dynamicBuilder$)}>
    <RemoveSubscribe>
      <StrictMode>
        <BrowserRouter>
          <TooltipProvider delayDuration={500}>
            <App />
          </TooltipProvider>
        </BrowserRouter>
      </StrictMode>
    </RemoveSubscribe>
  </Subscribe>,
)
