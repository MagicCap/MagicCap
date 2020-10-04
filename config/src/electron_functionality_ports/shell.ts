// This is used to open an URL.
export async function openExternal(url: string) {
    await fetch("/open/url", {
        method: "POST",
        body: url,
    })
}

// This is used to open an item.
export async function openItem(item: string) {
    await fetch("/open/item", {
        method: "POST",
        body: item,
    })
}
