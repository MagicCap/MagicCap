const BASE_URL = "https://api.github.com/repos/MagicCap/MagicCap/contents/docs?ref=develop"
const HELP_BODY = document.getElementById("helpModalBody")
const HELP_TITLE = document.getElementById("helpModalTitle")
const HELP_TITLE_DEFAULT = String(HELP_TITLE.textContent)

function fileElement(item) {
    const li = document.createElement("li")
    const a = document.createElement("a")
    a.href = `javascript:showDocs("${encodeURI(item.url)}")`
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
    return data
}

async function getStructure() {
    const data = await getStruct(BASE_URL)
    console.log(data)
    const ul = document.createElement("ul")
    data.forEach(item => {
        ul.appendChild(item.html)
    })
    return ul
}

async function showDocs(url) {
    HELP_BODY.textContent = "Loading..."

    const response = await fetch(url)
    const json = await response.json()

    HELP_TITLE.textContent = `${HELP_TITLE_DEFAULT} - ${json.path}`
    HELP_BODY.textContent = atob(json.content)
}

async function showHelpModal() {
    HELP_TITLE.textContent = HELP_TITLE_DEFAULT
    HELP_BODY.textContent = "Loading..."
    showModal("helpModal")

    const html = await getStructure()
    HELP_BODY.innerHTML = html.outerHTML
}
