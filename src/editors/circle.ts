import * as sharp from "sharp"

export default {
    name: "Circle",
    description: "Draws a circle on the screen.",
    icon: "circle.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer, rgb: number[]): Promise<Buffer> => {
        const metadata = await sharp(partBuff).metadata()
        const y = Math.floor(metadata.height! / 2)
        const x = Math.floor(metadata.width! / 2)
        const svg = Buffer.from(`
            <svg viewBox="0 0 ${metadata.width} ${metadata.height}" xmlns="http://www.w3.org/2000/svg">
                <circle style="fill:rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" cx="${x}" cy="${y}" r="${x > y ? y : x}"/>
            </svg>
        `)
        return sharp(svg)
            .resize(metadata.width!, metadata.height!)
            .png()
            .toBuffer()
    },
}
