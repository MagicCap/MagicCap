import * as sharp from "sharp"

export default {
    name: "Blur",
    description: "Allows you to blur a image.",
    icon: "blur.png",
    expectsImageData: true,
    apply: partBuff => sharp(partBuff).blur(10).toBuffer(),
}
