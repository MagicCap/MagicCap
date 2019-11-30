<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Hotkey Settings</p>
            </header>
            <section class="modal-card-body" id="hotkeyConfigBody">
                <p>You can use <a @click="openAcceleratorDocs" class="url">this documentation</a> in order to learn how to format your hotkey. Due to autosave causing possible issues when writing, it will be saved when the save button is pressed.</p>
                <br>
                <div class="field">
                    <label class="label" for="screenshotHotkey">Screenshot Hotkey:</label>
                    <div class="control">
                        <input class="input" type="text" id="screenshotHotkey" placeholder="Screenshot Hotkey" :value="screenshotHotkey">
                    </div>
                </div>
                <div class="field">
                    <label class="label" for="gifHotkey">GIF Hotkey:</label>
                    <div class="control">
                        <input class="input" type="text" id="gifHotkey" placeholder="GIF Hotkey" :value="gifHotkey">
                    </div>
                </div>
                <div class="field">
                    <label class="label" for="clipboardHotkey">Clipboard Hotkey:</label>
                    <div class="control">
                        <input class="input" type="text" id="clipboardHotkey" placeholder="Clipboard Hotkey" :value="clipboardHotkey">
                    </div>
                </div>
                <br>
                <a class="button is-link" @click="saveHotkeyConfig">Save Hotkey Configuration</a>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import saveConfig from "../save_config"

    export default Vue.extend({
        name: "ClipboardAction",
        data() {
            return {
                active: false,
                gifHotkey: window.config.gif_hotkey || "",
                screenshotHotkey: window.config.hotkey || "",
                clipboardHotkey: window.config.clipboard_hotkey || "",
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            saveHotkeyConfig() {
                const text = (document.getElementById("screenshotHotkey")! as HTMLInputElement).value
                this.$data.screenshotHotkey = text
                const gifText = (document.getElementById("gifHotkey")! as HTMLInputElement).value
                this.$data.gifHotkey = gifText
                const clipboardText = (document.getElementById("clipboardHotkey")! as HTMLInputElement).value
                this.$data.clipboardHotkey = clipboardText

                let changed = false

                if (window.config.hotkey !== text) {
                    changed = true
                    if (text === "") {
                        window.config.hotkey = null
                    } else {
                        window.config.hotkey = text
                    }
                }

                if (window.config.gif_hotkey !== gifText) {
                    changed = true
                    if (gifText === "") {
                        window.config.gif_hotkey = null
                    } else {
                        window.config.gif_hotkey = gifText
                    }
                }

                if (window.config.clipboard_hotkey !== clipboardText) {
                    changed = true
                    if (clipboardText === "") {
                        window.config.clipboard_hotkey = null
                    } else {
                        window.config.clipboard_hotkey = clipboardText
                    }
                }

                if (changed) {
                    saveConfig()
                    ipcRenderer.send("hotkey-change")
                }
            },
            openAcceleratorDocs() {
                shell.openExternal("https://electronjs.org/docs/api/accelerator")
            },
        },
    })
</script>
