import * as Jimp from "jimp"

export default {
    name: "Pixelate",
    description: "Allows you to pixelate a image.",
    icon: "pixelate.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer): Promise<Buffer> => {
        const image = await Jimp.read(partBuff)
        return image.pixelate(10).getBufferAsync("image/png")
    },
}
