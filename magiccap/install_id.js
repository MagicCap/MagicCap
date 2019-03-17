// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

// Requirements go here.
const magicImports = require("magicimports")
const { machineId } = require("node-machine-id")
const { get } = magicImports("chainfetch")

// Creates the install ID.
module.exports = async function newInstallId() {
    const newMachineId = await machineId()
    const siteGet = await get(`https://api.magiccap.me/install_id/new/${newMachineId}`)
    return siteGet.body
}
