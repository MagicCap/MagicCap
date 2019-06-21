import * as sharp from "sharp"

export default {
    name: "Hollow Circle",
    description: "Draws a hollow circle on the screen.",
    icon: "hollow_circle.png",
    expectsImageData: true,
    apply: async(partBuff: Buffer, rgb: Array<Number>): Promise<Buffer>  => {
        const metadata = await sharp(partBuff).metadata()
        const svg = Buffer.from(`
            <svg viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg" version="1.1" preserveAspectRatio="none">
                <circle cx="60" cy="60" r="50" stroke="rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})" stroke-width="2" fill="none" />
            </svg>     
        `)
        return sharp(svg)
            .resize({ width: metadata.width, height: metadata.height, })
            .png()
            .toBuffer()
    },
}
