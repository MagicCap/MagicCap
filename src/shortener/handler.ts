// Defines the config and API client.
import { config } from "../config"
import apiClient from "./api_client"

// Defines Electron's shell function.
import { shell } from "electron"

// Sets the theme.
const stylesheet = document.createElement("link")
stylesheet.setAttribute("rel", "stylesheet")
if (config.light_theme) {
    stylesheet.setAttribute("href", "../gui/css/bulmaswatch/default/bulmaswatch.min.css")
} else {
    stylesheet.setAttribute("href", "../gui/css/bulmaswatch/darkly/bulmaswatch.min.css")
}
document.getElementsByTagName("head")[0].appendChild(stylesheet)

// Handles editing the URL.
const inDom = document.getElementById("urlIn")
const outDom = document.getElementById("urlOut")
inDom!.oninput = async() => {
    const value = ((inDom! as unknown) as any).value as string
    if (value === "") {
        outDom!.innerHTML = "--"
    } else {
        const res = await apiClient(value)
        if (res === null) {
            outDom!.innerHTML = "--"
        } else {
            outDom!.innerHTML = `<a href="javascript:openLink('${res}')">${res}</a>`
        }
    }
}

// Used to externally open links.
const openLink = (url: string) => {
    shell.openExternal(url)
}
