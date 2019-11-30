// This is used to generate a filename.
export default async function() {
    const res = await fetch("/filename")
    if (!res.ok) {
        throw res
    }
    return await res.json() as string
}
