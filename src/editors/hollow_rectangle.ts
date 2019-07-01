import * as sharp from "sharp"

export default {
    name: "Hollow Rectangle",
    description: "Draws a hollow rectangle on the screen.",
    icon: "hollow_rectangle.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer, rgb: Array<Number>): Promise<Buffer>  => {
        const metadata = await sharp(partBuff).metadata()
        const svg = Buffer.from(`
            <svg viewBox="0 0 ${metadata.width} ${metadata.height}" xmlns="http://www.w3.org/2000/svg" version="1.1" preserveAspectRatio="none">
                <rect width="${metadata.width}" height="${metadata.height}" stroke="rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" stroke-width="4" fill="none" />
            </svg>
        `)
        return sharp(svg)
            .resize(metadata.width!, metadata.height!)
            .png()
            .toBuffer()
    },
}
