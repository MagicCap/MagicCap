import * as sharp from "sharp"

export default {
    name: "Circle",
    description: "Draws a circle on the screen.",
    icon: "circle.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer, rgb: Array<Number>): Promise<Buffer>  => {
        const metadata = await sharp(partBuff).metadata()
        const svg = Buffer.from(`
            <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
                <circle style="fill:rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" cx="60" cy="60" r="50"/>
            </svg>
        `)
        return sharp(svg)
            .resize({ width: metadata.width, height: metadata.height, })
            .png()
            .toBuffer()
    },
}
