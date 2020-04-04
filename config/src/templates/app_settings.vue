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

                <p>Copyright (C) MagicCap Development Team 2018-2020.</p>
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
                <input type="file" style="display: none" id="fileInput" />
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
            saveOpenAtLogin() {
                config.o.open_login = (document.getElementById("OpenAtLogin")! as HTMLInputElement).checked
                config.save()
            },
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
                const c = {} as any
                for (const x in config.o) c[x] = config.o[x]

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
            },
            parseMconf(data: any) {
                const version = data.version as number
                if (version !== 1) throw new Error("This version of MagicCap cannot read the config file given.")
                if (data.config_items === undefined || typeof data.config_items !== "object") throw new Error("MagicCap couldn't parse the config file.")
                return data.config_items
            },
            importMconf() {
                const fileInput = document.getElementById("fileInput")!
                fileInput.click()
                fileInput.onchange = async e => {
                    const loadedFile = (e as any).target.files[0]
                    const raw = await new Promise(res => {
                        const reader = new FileReader()
                        reader.readAsText(loadedFile, "UTF-8")

                        reader.onload = readerEvent => res((readerEvent.target as any).result)
                    }) as string

                    // Parse raw.
                    let data: any
                    try {
                        data = this.decode(raw)
                    } catch (_) {
                        this.showDialog("MagicCap", "Unable to parse mconf file", ["OK"])
                        return
                    }

                    // Parse type
                    let action: Function
                    let warning: string
                    switch (raw.split("\n")[0]) {
                        case "==BEGIN MAGICCAP CONFIG==": {
                            warning = "This WILL overwrite ALL values in your MagicCap config to match the configuration file. Do you want to continue?"
                            action = async () => {
                                // Clean install specific items
                                if("ffmpeg_path" in data) delete data.ffmpeg_path
                                if("install_id" in data) delete data.install_id

                                // Apply
                                for (const key in data) config.o[key] = data[key]
                                await config.save()
                                await fetch("/restart", {method: "GET"})
                            }
                            break
                        }
                        case "==BEGIN MAGICCAP UPLOADERS==": {
                            warning = "This WILL overwrite ALL uploader settings MagicCap to match the configuration file. Do you want to continue?"
                            action = async () => {
                                const parse = this.parseMconf(data)
                                for (const key in parse) config.o[key] = parse[key]
                                await config.save()
                                await fetch("/restart", {method: "GET"})
                            }
                            break
                        }
                        case "==BEGIN MAGICCAP HISTORY==": {
                            warning = "This will RESET the ENTIRE MagicCap capture history to match the data file. Do you want to continue?"
                            action = async () => {
                                const parse = this.parseMconf(data)
                                const res = await fetch("/captures/replace", {
                                    method: "POST",
                                    body: JSON.stringify(parse),
                                })
                                if (!res.ok) throw res
                                await fetch("/restart", {method: "GET"})
                            }
                            break
                        }
                        default: {
                            this.showDialog("MagicCap", "Unable to parse mconf file", ["OK"])
                            return
                        }
                    }

                    // Handle applying the config.
                    this.showDialog("MagicCap", warning, ["Yes", "No"]).then(async response => {
                        switch (response) {
                            case 0: {
                                try {
                                    await action();
                                } catch (err) {
                                    this.showDialog("MagicCap", `${err.message}`, ["OK"])
                                }
                                break
                            }
                        }
                    })
                }
            },
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
