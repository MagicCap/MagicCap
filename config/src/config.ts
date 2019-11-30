// Defines the config interface.
class ConfigInterface {
    public o: any

    public constructor(o: any) {
        this.o = o
    }

    public async save() {
        await fetch("/config", {
            method: "POST",
            body: this.o,
        })
    }
}

// Defines the config interface.
let c: ConfigInterface
export default c

// Gets the config.
export async function getConfig() {
    const res = await fetch("/config", {
        method: "GET",
    })
    if (!res.ok) {
        throw res
    }
    c = new ConfigInterface(await res.json())
}
