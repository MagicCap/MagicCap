// Defines required items.
import { readFile } from "fs-nextra"
import * as uuidv4 from "uuid/v4"
import { get } from "chainfetch"
import config from "./shared/config"

// Used for testing a uploader.
export default async(uploader: any): Promise<(string | boolean)[]> => {
    const logo = await readFile(`${__dirname}/icons/magiccap.png`)
    try {
        const result = await uploader.upload(config, logo, "png", `${uuidv4()}.png`)
        try {
            await get(result)
        } catch (e) {
            throw new Error(`Upload fetch error: ${e}`)
        }
    } catch (e) {
        return [false, `${e}`]
    }
    return [true]
}
