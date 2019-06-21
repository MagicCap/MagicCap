import * as sharp from "sharp"

export default {
    name: "Hollow Rectangle",
    description: "Draws a hollow rectangle on the screen.",
    icon: "hollow_rectangle.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer, rgb: Array<Number>): Promise<Buffer>  => {
        const metadata = await sharp(partBuff).metadata()
        const svg = Buffer.from(`
            <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" version="1.1" preserveAspectRatio="none">
                <rect width="100" height="100" stroke="rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" stroke-width="2" fill="none" />
            </svg>     
        `)
        return sharp(svg)
            .resize({ width: metadata.width, height: metadata.height, })
            .png()
            .toBuffer()
    },
}
