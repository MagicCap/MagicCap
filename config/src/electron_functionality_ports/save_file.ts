// Used to pop up a save dialog and save a file.
export default async function(
    title: string, extension: string,
    extensionDescription: string, data: string
) {
    const res = await fetch("/save", {
        method: "POST",
        body: JSON.stringify({
            title, extension, extensionDescription, data,
        }),
    })
    if (!res.ok) throw res
}
