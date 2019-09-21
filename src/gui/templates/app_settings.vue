<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
            <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">App Settings and Information</p>
            </header>
            <section class="modal-card-body">
                <label class="input_container">Open MagicCap at login.
                    <input type="checkbox" id="OpenAtLogin" v-on:click="saveOpenAtLogin()" :checked="OpenAtLoginI">
                    <span class="custom_input"></span>
                </label>

                <br/>

                <a class="button is-info" @click="exportConfig">Export All Settings</a>
                <a class="button is-info" @click="exportUploaders">Export Uploader Settings</a>

                <a class="button is-primary" @click="importMconf" style="margin-left: 2em">Import MagicCap Configuration File (.mconf)</a>

                <hr/>

                <h1 class="modal-card-title">About: <small class="muted">MagicCap v{{ version }}</small></h1>
                <p>Copyright (C) Jake Gealer, Rhys O'Kane &amp; Matt Cowley 2018-2019.</p>
                <p>This software is licensed under the <a @click="openMPL" class="url">MPL-2.0</a> license.</p>
                <p v-if="liteTouch">Some settings are managed by your system administrator.</p>
                <p>
                    <br/>
                    <small><a class="button is-small" @click="showDebug">Debug Information</a></small>
                </p>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import { remote, shell } from "electron"
    import saveConfig from "../save_config"
    import { writeFileSync, readFileSync } from "fs"

    declare global {
        interface Window {
            config: {
                saveConfig: () => void,
                o: any,
            },
            mconf: {
                newConfig: () => any,
                parse: (data: any) => any,
            }
        }
    }

    export default Vue.extend({
        name: "AppSettings",
        data() {
            return {
                active: false,
                OpenAtLoginI: window.config.o.open_login || false,
                version: remote.app.getVersion(),
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            saveOpenAtLogin() {
                window.config.o.open_login = (document.getElementById("OpenAtLogin")! as HTMLInputElement).checked
                remote.app.setLoginItemSettings({openAtLogin: window.config.o.open_login})
                saveConfig()
            },
            saveConfig(data: String) {
                // Save config
                remote.dialog.showSaveDialog({
                    title: "Save file...",
                    filters: [
                        {
                            extensions: ["mconf"],
                            name: "MagicCap Configuration File",
                        },
                    ],
                    showsTagField: false,
                }, (file: string | undefined) => {
                    (async () => {
                        if (file === undefined) {
                            return
                        }
                        if (!file.endsWith(".mconf")) {
                            file += ".mconf"
                        }
                        try {
                            writeFileSync(file, data)
                        } catch (err) {
                            console.log(err)
                        }
                    })()
                })
            },
            exportConfig() {
                const config = window.config.o

                // Clean install specific items
                if("ffmpeg_path" in config) delete config.ffmpeg_path
                if("install_id" in config) delete config.install_id

                // Convert to save format
                // Double base64 encode to help keep plain-text logins & tokens safer
                const data = `==BEGIN MAGICCAP CONFIG==\n${btoa(btoa(JSON.stringify(window.config.o)))}`

                // Save
                this.saveConfig(data)
            },
            exportUploaders() {
                const exported = window.mconf.newConfig()

                // Convert to save format
                // Double base64 encode to help keep plain-text logins & tokens safer
                const data = `==BEGIN MAGICCAP UPLOADERS==\n${btoa(btoa(JSON.stringify(exported)))}`

                // Save
                this.saveConfig(data)
            },
            importMconf() {
                remote.dialog.showOpenDialog({
                    title: "Open file...",
                    filters: [
                        {
                            extensions: ["mconf"],
                            name: "MagicCap Configuration File",
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

                        let action: Function
                        const raw = String(readFileSync(file[0]))
                        const data = JSON.parse(atob(atob(raw.split("\n").slice(1).join("\n"))))
                        switch (raw.split("\n")[0]) {
                            case "==BEGIN MAGICCAP CONFIG==": {
                                action = async () => {
                                    console.log(data)
                                    // for (const key in data) {
                                    //     window.config.o[key] = data[key]
                                    // }
                                    // saveConfig()
                                }
                                break
                            }
                            case "==BEGIN MAGICCAP UPLOADERS==": {
                                action = async () => {
                                    const parse = await window.mconf.parse(data)
                                    console.log(parse)
                                    // for (const key in data) {
                                    //     window.config.o[key] = data[key]
                                    // }
                                    // saveConfig()
                                }
                                break
                            }
                            default: {
                                remote.dialog.showErrorBox("MagicCap", "Unable to parse mconf file")
                                return
                            }
                        }

                        await remote.dialog.showMessageBox({
                            type: "warning",
                            buttons: ["Yes", "No"],
                            title: "MagicCap",
                            message: "This WILL overwrite any values in your MagicCap config which are also in this configuration file. Do you want to continue?",
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
            showDebug() {
                this.$emit("debug-show")
            },
            openMPL() {
                shell.openExternal("https://www.mozilla.org/en-US/MPL/2.0")
            },
        },
    })
</script>
