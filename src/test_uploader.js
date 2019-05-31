// Defines required items.
const { readFile } = require("fs-nextra")
const uuidv4 = require("uuid/v4")
const { get } = require("chainfetch")

// Used for testing a uploader.
module.exports = async uploader => {
    const logo = await readFile(`${__dirname}/icons/magiccap.png`)
    try {
        const result = await uploader.upload(logo, "png", `${uuidv4()}.png`)
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
