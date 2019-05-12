const electronLink = require("electron-link")
const fs = require("fs")

(async() => {
    const snapshotScript = await electronLink({
        baseDirPath: `${__dirname}/selector`,
        mainPath: `${__dirname}/selector/selector.js`,
    })

    fs.writeFileSync(`${__dirname}/selector/selector.linked.js`, snapshotScript)
})()
