const walk = require("walk")
const path = require("path")
const fs = require("fs")
const mkdirp = require("mkdirp")
const walker = walk.walk("./src")
walker.on("file", (root, fileStats, next) => {
    if (!fileStats.name.endsWith(".js") && !fileStats.name.endsWith(".ts")) {
        const newRoot = root.replace("src", "dist")
        if (!newRoot.includes("gui") || fileStats.name.endsWith(".css") || fileStats.name.endsWith(".scss") || fileStats.name.endsWith(".woff") || fileStats.name.endsWith(".woff2") || fileStats.name.endsWith(".ttf")) {
            try {
                mkdirp.sync(newRoot)
            } catch(_) {
                // Do nothing.
            }
            fs.copyFileSync(path.join(root, fileStats.name), path.join(newRoot, fileStats.name))
        }
    }
    next()
})
