// A list of the displayed captures.
const displayedCaptures: any[] = []
export default displayedCaptures

// Defines the time of last edit.
let lastEdit: number | undefined

// Gets the captures.
export async function getCaptures() {
    const res = await fetch("/captures")
    if (!res.ok) {
        throw res
    }
    const newCaptures = await res.json()
    displayedCaptures.length = 0
    for (const c of newCaptures) displayedCaptures.push(c)
}
getCaptures().then(() => setInterval(async() => {
    const res = await fetch("/changefeed")
    const j = await res.json()
    if (j !== lastEdit) {
        await getCaptures()
        lastEdit = j
    }
}, 100))
