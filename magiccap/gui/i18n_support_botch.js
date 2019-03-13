(async() => {
    // Imports the i18n components.
    const i18n = require("../i18n")

    // Initialises the Sentry SDK.
    require("@sentry/electron").init({
        dsn: "https://968dcfa0651e40ddaa807bbe47b1aa91@sentry.io/1396847",
    })

    // Translates all the things.
    const parsed = await i18n.poParseHtml(document.documentElement.innerHTML)
    document.documentElement.innerHTML = parsed

    // Creates the element for the main GUI script.
    const s = document.createElement("script")
    s.src = "./gui.js"
    document.body.appendChild(s)
})()
