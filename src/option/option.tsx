
import { createRoot } from "react-dom/client"
import "../asserts/tailwind.css"
const container = document.createElement('div')
document.body.appendChild(container)
const root = createRoot(container)
const popup = (
    <div>
        <h1 className="text-5xl bg-green-200">This is Option</h1>
        <img src="image.jpg"></img>
    </div>
)
root.render(popup)