// Allows you to write text to the clipboard.
export default async function(text: string) {
    await fetch("/clipboard", {
        method: "POST",
        body: text,
    })
}
