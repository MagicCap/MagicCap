// Defines the application info.
const applicationInfo: {
    version: string;
    os: {
      type: string;
      release: string;
    };
    platform: string;
} = {} as any
export default applicationInfo

// Gets the application info.
export async function getApplicationInfo() {
    const res = await fetch("/application_info")
    if (!res.ok) throw res
    const j = await res.json()
    for (const key in j) applicationInfo[key] = j[key]
}
