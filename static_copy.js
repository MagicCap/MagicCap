const walk = require("walk")
const path = require("path")
const fs = require("fs")
const mkdirp = require("mkdirp")
const walker = walk.walk("./src")
walker.on("file", (root, fileStats, next) => {
    if (!fileStats.name.endsWith(".js") && !fileStats.name.endsWith(".ts")) {
        const newRoot = root.replace("src", "dist")
        try {
            mkdirp.sync(newRoot)
        } catch(_) {
            // Do nothing.
        }
        fs.copyFileSync(path.join(root, fileStats.name), path.join(newRoot, fileStats.name))
    }
    next()
})
