const BASE_DIR = "docs"
const BASE_URL = `https://api.github.com/repos/MagicCap/MagicCap/contents/${BASE_DIR}?ref=develop`
const HELP_BODY = document.getElementById("helpModalBody")
const HELP_TITLE = document.getElementById("helpModalTitle")
const HELP_TITLE_DEFAULT = String(HELP_TITLE.textContent)
const MD = window.markdownit({
    html: true,
    linkify: true,
    typographer: true,
})

function fileElement(item) {
    const li = document.createElement("li")
    const a = document.createElement("a")
    a.href = `javascript:showDocs("${encodeURI(item.url)}")`
    a.setAttribute("data-link-wrapped", true)
    a.textContent = item.name
    li.appendChild(a)
    return li
}

function directoryElement(item, contents) {
    const li = document.createElement("li")
    const text = document.createTextNode(item.name)
    const br = document.createElement("br")
    const ul = document.createElement("ul")
    contents.forEach(child => {
        ul.appendChild(child.html)
    })
    ul.style.marginLeft = ".1em"
    ul.style.borderLeft = "1px solid var(--separator)"
    ul.style.paddingLeft = "1.4em"
    li.appendChild(text)
    li.appendChild(br)
    li.appendChild(ul)
    return li
}

async function getStruct(url) {
    let data = []
    try {
        const response = await fetch(url)
        const json = await response.json()
        for (const index in json) {
            const item = json[index]
            if (item.type === "file") {
                data.push({
                    name: item.name,
                    path: item.path,
                    type: item.type,
                    html: fileElement(item),
                })
            } else if (item.type === "dir") {
                const contents = await getStruct(item.url)
                data.push({
                    name: item.name,
                    path: item.path,
                    type: item.type,
                    contents: contents,
                    html: directoryElement(item, contents),
                })
            }
        }
    } catch (e) {
        console.error(url, e)
    }
    return data
}

async function getStructure() {
    const data = await getStruct(BASE_URL)
    const ul = document.createElement("ul")
    data.forEach(item => {
        ul.appendChild(item.html)
    })
    return ul
}

function renderDoc(markdown, back, full) {
    HELP_BODY.innerHTML = ""
    HELP_BODY.style.width = full ? "100%" : "auto"
    HELP_BODY.style.height = full ? "100%" : "auto"

    if (back) {
        const a = document.createElement("a")
        a.href = "javascript:showHelpModal()"
        a.className = "button is-primary is-small"
        a.innerText = "Back"
        HELP_BODY.appendChild(a)
    }

    const div = document.createElement("div")
    div.className = "markdown"
    div.innerHTML = MD.render(markdown)
    div.querySelectorAll("a:not([data-link-wrapped])").forEach(item => {
        const link = String(item.href)
        item.href = `javascript:openURL("${encodeURI(link)}")`
        item.classList.add("url")
        item.setAttribute("data-link-wrapped", true)
    })
    HELP_BODY.appendChild(div)
}

async function showDocs(url) {
    renderDoc("## Loading file...", true, false)

    const response = await fetch(url)
    const json = await response.json()

    HELP_TITLE.textContent = `${HELP_TITLE_DEFAULT} - ${(json.path.startsWith(BASE_DIR) ? json.path.substr(BASE_DIR.length) : json.path).replace(/^\/+/g, "")}`
    renderDoc(atob(json.content), true, true)
}

async function showHelpModal() {
    HELP_TITLE.textContent = HELP_TITLE_DEFAULT
    renderDoc("## Loading menu...", false, false)
    showModal("helpModal")

    const html = await getStructure()
    renderDoc(html.outerHTML, false, true)
}
