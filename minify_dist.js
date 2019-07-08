const walk = require("walk")
const path = require("path")
const fs = require("fs")
const Terser = require("terser")
const walker = walk.walk("./dist")
let i = 0
walker.on("file", (root, fileStats, next) => {
    if (fileStats.name.endsWith(".js")) {
        const fp = path.join(root, fileStats.name)
        const data = fs.readFileSync(fp).toString()
        const result = Terser.minify(data, {
            compress: true,
        })
        fs.writeFileSync(fp, `\/\/ This code is a minified copy of the MagicCap source for this release. It is licensed under the MPL-2.0. If you want to edit this, grab a copy from GitHub!\n${result.code}`)
    }
    i++
    next()
})

walker.on("end", () => console.log(`Minified ${i} files.`))
