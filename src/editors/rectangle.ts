import * as sharp from "sharp"

export default {
    name: "Rectangle",
    description: "Draws a rectangle on the screen.",
    icon: "rectangle.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer, rgb: Array<Number>): Promise<Buffer>  => {
        const metadata = await sharp(partBuff).metadata()
        return sharp({
            create: {
                width: metadata.width,
                height: metadata.height,
                background: { r: rgb[0], g: rgb[1], b: rgb[2], },
                channels: 4,
            },
        }).png().toBuffer()
    },
}
