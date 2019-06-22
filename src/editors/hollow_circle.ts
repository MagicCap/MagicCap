import * as sharp from "sharp"

export default {
    name: "Hollow Circle",
    description: "Draws a hollow circle on the screen.",
    icon: "hollow_circle.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer, rgb: Array<Number>): Promise<Buffer>  => {
        const metadata = await sharp(partBuff).metadata()
        const y = Math.floor(metadata.height / 2)
        const x = Math.floor(metadata.width / 2)
        const svg = Buffer.from(`
            <svg viewBox="0 0 ${metadata.width} ${metadata.height}" xmlns="http://www.w3.org/2000/svg">
                <circle stroke="rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" cx="${x}" cy="${y}" r="${(x > y ? y : x) - 2}"  stroke-width="2" fill="none" />
            </svg>
        `)
        return sharp(svg)
            .resize({ width: metadata.width, height: metadata.height, })
            .png()
            .toBuffer()
    },
}
