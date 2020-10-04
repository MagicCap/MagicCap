// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Matt Cowley (MattIPv4) <me@mattcowley.co.uk> 2019.

// Imports markdownit.
window.markdownit = require("markdown-it")
const shell = require("./electron_functionality_ports/shell")
window.openURL = url => shell.openExternal(url)

/**
 * Converts a string to title case
 * @param {string} str - The string to convert
 * @returns {string}
 */
const titleCase = str => str.replace(/\w\S*/g, txt => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase())

/**
 * Formats a file item name; Stripping file extension, replacing underscores & hyphens with spaces, using title case
 * @param {string} name - The name to format
 * @returns {string}
 */
function nameFormat(name) {
    if (name.includes(".")) {
        name = name
            .split(".")
            .slice(0, -1)
            .join(".")
    }

    return titleCase(name.replace(/[_-]/g, " ").replace(/(\S)\/(\S)/g, "$1 / $2"))
}

window.backToHelpModal = () => {
    window.docsVueEl.toggle()
    window.docsVueEl.toggle()
}

const BASE_DIR = "docs"
const BASE_URL = `https://api.github.com/repos/MagicCap/MagicCap/contents/${BASE_DIR}?ref=develop`
const HELP_TITLE_DEFAULT = "Help (Docs)"
const MD_ONLY = true
const MD = window.markdownit({
    html: true,
    linkify: true,
    typographer: true,
})

/**
 * Generates an HTML item for the file item given
 * @param {any} item - The file item to generate HTML for.
 * @returns {HTMLLIElement} - The HTML element.
 */
function fileElement(item) {
    const li = document.createElement("li")
    const a = (document.createElement("a"))
    a.href = `javascript:showDocs("${encodeURI(item.url)}")`
    a.setAttribute("data-link-wrapped", "true")
    a.textContent = nameFormat(item.name)
    li.appendChild(a)
    return li
}

/**
 * Creates an HTML item for a directory object and given item contents
 * @param {any} item - The directory item
 * @param {any[]} contents - The contents of the given directory
 * @returns {HTMLLIElement}
 */
function directoryElement(item, contents) {
    const li = document.createElement("li")

    const text = document.createElement("span")
    text.innerText = nameFormat(item.name)
    li.appendChild(text)

    const br = document.createElement("br")
    li.appendChild(br)

    const ul = document.createElement("ul")
    contents.forEach(child => {
        ul.appendChild(child.html)
    })
    ul.style.marginLeft = ".4em"
    ul.style.borderLeft = "1px solid var(--separator)"
    ul.style.paddingLeft = "1.4em"
    li.appendChild(ul)

    return li
}

/**
 * Recursively generates the structure data for a given GitHub API repo url
 * @param {string} url - The GitHub API repo contents URL to scan
 * @returns {Promise<Array<any>>}
 */
async function getStruct(url) {
    let data = []
    // Fetch the GitHub data
    const response = await fetch(url)
    const json = await response.json()

    // Sort by type then name
    json.sort((a, b) => {
        if (a.type === b.type) {
            // Use name once type is the same
            return a.name.localeCompare(b.name)
        }
        // Files before directories
        return b.type.localeCompare(a.type)
    })

    // Loop and process
    for (const index in json) {
        if (!json.hasOwnProperty(index)) continue
        const item = json[index]
        if (item.type === "file") {
            if (MD_ONLY && !item.name.endsWith(".md")) continue
            data.push({
                name: item.name,
                path: item.path,
                type: item.type,
                html: fileElement(item),
            })
        } else if (item.type === "dir") {
            try {
                const contents = await getStruct(item.url)
                if (contents.length === 0) continue
                data.push({
                    name: item.name,
                    path: item.path,
                    type: item.type,
                    contents: contents,
                    html: directoryElement(item, contents),
                })
            } catch (e) {
                // If a recursive dir fails who cares, but first call should raise the error, hence catch is here
                console.log(item.url, e)

                // Create an error message
                const li = document.createElement("li")
                li.style.fontStyle = "italic"
                li.textContent = "Failed to load this directory"
                const contents = [{ name: "*Failed to load this directory*", html: li }]

                // Append directory with error message child
                data.push({
                    name: item.name,
                    path: item.path,
                    type: item.type,
                    contents: contents,
                    html: directoryElement(item, contents),
                })
            }
        }
    }
    return data
}

/**
 * Fetches the full structure data and generates the HTML menu for the repo contents
 * @returns {Promise<HTMLUListElement>}
 */
async function getStructure() {
    const data = await getStruct(BASE_URL)
    const ul = document.createElement("ul")
    ul.className = "docs-menu"
    data.forEach(item => {
        ul.appendChild(item.html)
    })
    return ul
}

/**
 * Renders the given markdown (or HTML) to the help modal body
 * @param {string} markdown - The markdown (or HTML) to render
 * @param {boolean} back - Display the back buttons
 * @param {boolean} full - Make the modal body full width/height
 * @param {boolean} cls - Give the wrapper the .markdown class
 */
function renderDoc(markdown, back, full, cls) {
    const HELP_BODY = document.getElementById("helpModalBody")

    /**
     * Generates a back button to return to the main help menu
     * @returns {HTMLAnchorElement}
     */
    const backButton = () => {
        const a = document.createElement("a")
        a.href = "javascript:backToHelpModal()"
        a.className = "button is-primary is-small"
        a.innerText = "Back"
        return a
    }

    HELP_BODY.innerHTML = ""
    HELP_BODY.style.width = full ? "100%" : "auto"
    HELP_BODY.style.height = full ? "100%" : "auto"
    HELP_BODY.style.margin = `${full ? "0" : "auto"} 10vw`

    if (back) {
        HELP_BODY.appendChild(backButton())
    }

    const div = document.createElement("div")
    div.className = cls ? "markdown" : ""
    div.innerHTML = MD.render(markdown)
    // @ts-ignore
    div.querySelectorAll("a:not([data-link-wrapped])").forEach(item => {
        const link = String(item.href)
        item.href = `javascript:openURL("${encodeURI(link)}")`
        item.classList.add("url")
        item.setAttribute("data-link-wrapped", "true")
    })
    HELP_BODY.appendChild(div)
}

/**
 * Show the help doc file at the given GitHub API file url
 * @param {string} url - The GitHUB API file location to display
 * @returns {Promise<void>}
 */
window.showDocs = async function showDocs(url) {
    renderDoc("## Loading file...", true, false, true)

    const response = await fetch(url)
    const json = await response.json()

    const HELP_TITLE = document.getElementById("helpModalTitle")

    const path = json.path.startsWith(BASE_DIR) ? json.path.substr(BASE_DIR.length) : json.path
    HELP_TITLE.textContent = `${HELP_TITLE_DEFAULT} - ${nameFormat(path.replace(/^\/+/g, ""))}`
    const content = `${atob(json.content)}\n\n<hr class="oss-docs-divider"/>\n\n<blockquote class="oss-docs-link">This file is open source on our GitHub repository at <a href="${json.html_url}">${json.html_url}</a>.</blockquote>`
    renderDoc(content, true, true, true)
}

/**
 * Trigger the initial help (documentation) modal with the file menu
 * @returns {Promise<void>}
 */
export default async function showHelpModal() {
    renderDoc("## Loading menu...", false, false, true)

    const HELP_TITLE = document.getElementById("helpModalTitle")
    HELP_TITLE.textContent = HELP_TITLE_DEFAULT

    try {
        const html = await getStructure()
        renderDoc(html.outerHTML, false, true, false)
    } catch (e) {
        console.log(BASE_URL, e)
        renderDoc(`<div style="text-align: center;"><h3>Unfortunately the help documentation could not be loaded at this time. Please try again later.</h3></div><br/><br/><hr/><p>Debug Information:</p><pre><code>${e}</code></pre>`, false, false, true)
    }
}
