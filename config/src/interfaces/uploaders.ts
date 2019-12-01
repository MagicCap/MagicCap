// Gets all of the uploaders.
export async function getUploaders() {
    const res = await fetch("/uploaders", {method: "GET"})
    if (!res.ok) throw res
    return await res.json() as Record<string, {
        icon: string;
        name: string;
        description: string;
        configOptions: Record<string, {
            required: boolean | undefined,
            type: string,
            value: string,
            default: any,
        }>;
    }>
}

// Defines all of the uploaders.
export default getUploaders()
