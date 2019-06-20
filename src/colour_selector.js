let selectionFramework

if (require("os").platform() === "darwin") {
    selectionFramework = require("macos-node-colour-selector")
} else {
    selectionFramework = require("kcolorchooser-node")
}

module.exports = (r, g, b) => selectionFramework(r, g, b)
