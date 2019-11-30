// Defines the config interface.
class ConfigInterface {
    public o: any

    public constructor() {
        this.o = {}
    }

    public async save() {
        await fetch("/config", {
            method: "POST",
            body: JSON.stringify(this.o),
        })
    }
}

// Defines the config interface.
let c: ConfigInterface = new ConfigInterface()
export default c

// Gets the config.
export async function getConfig() {
    const res = await fetch("/config", {
        method: "GET",
    })
    if (!res.ok) {
        throw res
    }
    c.o = await res.json()
}
