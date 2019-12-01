<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
            <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">App Settings and Information</p>
            </header>
            <section class="modal-card-body">
                <h1 class="modal-card-title">MagicCap Application Settings</h1>

                <h1 class="modal-card-title">About: <small class="muted">MagicCap v{{ version }}</small></h1>

                <p>Copyright (C) MagicCap Development Team 2018-2019.</p>
                <p>This software is licensed under the <a @click="openMPL" class="url">MPL-2.0</a> license.</p>
                <p v-if="liteTouch">Some settings are managed by your system administrator.</p>
                <p>
                    <br/>
                    <small><a class="button is-small" @click="showDebug">Debug Information</a></small>
                </p>

                <hr/>

                <label class="input_container">Open MagicCap at login.
                    <input type="checkbox" id="OpenAtLogin" v-on:click="saveOpenAtLogin()" :checked="OpenAtLoginI">
                    <span class="custom_input"></span>
                </label>

                <hr/>

                <h1 class="modal-card-title">Export MagicCap Data</h1>

                <a class="button is-info" @click="exportConfig">Export All Settings</a>
                <a class="button is-info" @click="exportUploaders">Export Uploader Settings</a>
                <a class="button is-info" @click="exportHistory">Export Capture History</a>
                <br/><br/>
                <a class="button is-primary" @click="importMconf">Import MagicCap Data File (.mconf)</a>

                <hr/>

                <h1 class="modal-card-title">Danger Zone!</h1>

                <a class="button is-danger" @click="resetHistory">RESET Capture History</a>
                <a class="button is-danger" @click="resetConfig">RESET All MagicCap Settings</a>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import config from "../interfaces/config"
    import * as shell from "../electron_functionality_ports/shell"
    import applicationInfo from "../interfaces/application_info"
    import saveFile from "../electron_functionality_ports/save_file"
    import captures from "../interfaces/captures"
    import uploadersPromise from "../interfaces/uploaders"

    export default Vue.extend({
        name: "AppSettings",
        data() {
            return {
                active: false,
                OpenAtLoginI: config.o.open_login || false,
                version: applicationInfo.version,
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            showDialog(title: string, description: string, buttons: string[]) {
                const vm = this
                return new Promise(res => vm.$emit("open-dialog", title, description, buttons, res)) as Promise<number>
            },
 /*         saveOpenAtLogin() {
                config.o.open_login = (document.getElementById("OpenAtLogin")! as HTMLInputElement).checked
                // TODO: Handle open at login. I don't quite know how this'll work in Go.
                // remote.app.setLoginItemSettings({openAtLogin: window.config.open_login})
                config.save()
            },*/
            saveConfig(data: string) {
                saveFile("Save file...", "mconf", "MagicCap Configuration File", data)
            },
            encode(type: string, data: any) {
                const json = encodeURIComponent(JSON.stringify(data))
                // Double base64 encode to help keep plain-text logins & tokens safer
                const encoded = btoa(btoa(json))
                return `==BEGIN MAGICCAP ${type}==\n${encoded}`
            },
            decode(raw: string) {
                const data = raw.split("\n").slice(1).join("\n")
                const decoded = atob(atob(data))
                return JSON.parse(decodeURIComponent(decoded))
            },
            exportConfig() {
                const c = config.o

                // Clean install specific items
                if("ffmpeg_path" in c) delete c.ffmpeg_path
                if("install_id" in c) delete c.install_id

                // Convert to save format
                const data = this.encode("CONFIG", c)

                // Save
                this.saveConfig(data)
            },
            async exportUploaders() {
                const values = (item: any) => {
                    const x: any[] = []
                    for (const i in item) {
                        const y = item[i] as any
                        x.push(y)
                    }
                    return x
                }
                const options: any = {}
                for (const uploader of values(await uploadersPromise)) {
                    for (const option of values(uploader.configOptions)) {
                        if (config.o[option.value] !== undefined) {
                            options[option.value] = config.o[option.value]
                        }
                    }
                }
                const exported = {
                    version: 1,
                    config_items: options,
                }

                // Convert to save format
                const data = this.encode("UPLOADERS", exported)

                // Save
                this.saveConfig(data)
            },
            exportHistory() {
                // Convert to save format
                const data = this.encode("HISTORY", captures)

                // Save
                this.saveConfig(data)
            },/*
            importMconf() {
                remote.dialog.showOpenDialog({
                    title: "Open file...",
                    filters: [
                        {
                            extensions: ["mconf"],
                            name: "MagicCap Data File",
                        },
                    ],
                    // @ts-ignore
                    multiSelections: false,
                    openDirectory: false,
                    showsTagField: false,
                }, (file: any[]) => {
                    (async () => {
                        if (file === undefined) {
                            return
                        }

                        // Parse raw
                        let action: Function
                        let warning: string
                        const raw = String(readFileSync(file[0]))
                        let data: any
                        try {
                            data = this.decode(raw)
                        } catch (_) {
                            remote.dialog.showErrorBox("MagicCap", "Unable to parse mconf file")
                            return
                        }

                        // Parse type
                        switch (raw.split("\n")[0]) {
                            case "==BEGIN MAGICCAP CONFIG==": {
                                warning = "This WILL overwrite ALL values in your MagicCap config to match the configuration file. Do you want to continue?"
                                action = async () => {
                                    // Clean install specific items
                                    if("ffmpeg_path" in data) delete data.ffmpeg_path
                                    if("install_id" in data) delete data.install_id

                                    // Apply
                                    for (const key in data) {
                                        window.config[key] = data[key]
                                    }
                                    saveConfig()
                                    ipcRenderer.send("restartWindow")
                                }
                                break
                            }
                            case "==BEGIN MAGICCAP UPLOADERS==": {
                                warning = "This WILL overwrite ALL uploader settings MagicCap to match the configuration file. Do you want to continue?"
                                action = async () => {
                                    const parse = await window.mconf.parse(data)
                                    for (const key in parse) {
                                        window.config[key] = parse[key]
                                    }
                                    saveConfig()
                                    ipcRenderer.send("restartWindow")
                                }
                                break
                            }
                            case "==BEGIN MAGICCAP HISTORY==": {
                                warning = "This will RESET the ENTIRE MagicCap capture history to match the data file. Do you want to continue?"
                                action = async () => {
                                    db.transaction(() => {
                                        db.prepare("DELETE FROM captures WHERE 1").run()
                                        for (const item of data) {
                                            const keys = Object.keys(item)
                                            const stmt = `INSERT INTO captures (${keys.join(", ")}) VALUES (${keys.map(x => `@${x}`).join(", ")})`
                                            db.prepare(stmt).run(item)
                                        }
                                    })()
                                    ipcRenderer.send("restartWindow")
                                }
                                break
                            }
                            default: {
                                remote.dialog.showErrorBox("MagicCap", "Unable to parse mconf file")
                                return
                            }
                        }

                        // Confirm action
                        await remote.dialog.showMessageBox({
                            type: "warning",
                            buttons: ["Yes", "No"],
                            title: "MagicCap",
                            message: warning,
                        }, async response => {
                            switch (response) {
                                case 0: {
                                    try {
                                        await action();
                                    } catch (err) {
                                        remote.dialog.showErrorBox("MagicCap", `${err.message}`)
                                    }
                                    break
                                }
                            }
                        })
                    })()
                })
            },
            */
            resetHistory() {
                this.showDialog(
                    "MagicCap", "This WILL remove ALL capture history from MagicCap. Do you want to continue?",
                    ["Yes", "No"],
                ).then(async response => {
                    switch (response) {
                        case 0: {
                            const res = await fetch("/captures/purge", {method: "GET"})
                            if (!res.ok) throw res
                            break
                        }
                    }
                })
            },
            resetConfig() {
                this.showDialog(
                    "MagicCap", "This WILL reset ALL your settings in MagicCap to their defaults. Do you want to continue?",
                    ["Yes", "No"],
                ).then(async response => {
                    switch (response) {
                        case 0: {
                            config.o = {
                                install_id: config.o.install_id,
                                ffmpeg_path: config.o.ffmpeg_path,
                            }
                            await config.save()
                            break
                        }
                    }
                })
            },
            showDebug() {
                this.$emit("debug-show")
            },
            openMPL() {
                shell.openExternal("https://www.mozilla.org/en-US/MPL/2.0")
            },
        },
    })
</script>
