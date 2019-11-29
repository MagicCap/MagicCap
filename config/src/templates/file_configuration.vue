<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">File Configuration</p>
            </header>
            <section class="modal-card-body" id="fileConfigBody">
                <div class="field">
                    <label class="input_container">Save files to your device after capturing.
                        <input type="checkbox" id="fileConfigCheckbox" v-on:click="saveSaveCapture()" :checked="fileConfigCheckboxI">
                        <span class="custom_input"></span>
                    </label>
                </div>
                <div class="field fileNamePattern">
                    <label class="label" for="fileNamingPattern">File Naming Pattern:</label>
                    <p>You can use <code>"</code> to represent a random character, <code>%emoji%</code> for a random emoji, <code>%date%</code> for the date and <code>%time%</code> for the time.</p>
                    <div class="control">
                        <input class="input" type="text" id="fileNamingPattern" placeholder="File Naming Pattern" :value="fileNamingPatternI" v-on:change="saveNamingPattern()">
                    </div>
                    <p>Filename Preview: <code id="fileNamingPreview" class="preview">{{fileNamingPreview}}</code></p>
                </div>
                <div class="field">
                    <label class="label" for="fileSaveFolder">File Save Folder:</label>
                    <div class="control">
                        <input class="input" type="text" id="fileSaveFolder" placeholder="File Save Folder" :value="fileSaveFolderI" v-on:change="saveFilePath()">
                    </div>
                </div>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import saveConfig from "../save_config"

    declare global {
        interface Window {
            filename: any,
            config: any,
        }
    }

    export default Vue.extend({
        name: "ClipboardAction",
        data() {
            return {
                active: false,
                action: window.config.clipboard_action,
                fileConfigCheckboxI: window.config.save_capture || false,
                fileNamingPatternI: window.config.file_naming_pattern || "screenshot_%date%_%time%",
                fileSaveFolderI: window.config.save_path,
                fileNamingPreview: window.filename.newFilename(),
            }
        },
        watch: {
            fileNamingPatternI() {
                this.$data.fileNamingPreview = window.filename.newFilename()
            },
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            saveSaveCapture() {
                window.config.save_capture = (document.getElementById("fileConfigCheckbox")! as HTMLInputElement).checked
                saveConfig()
            },
            saveNamingPattern() {
                const val = (document.getElementById("fileNamingPattern")! as HTMLInputElement).value
                this.$data.fileNamingPatternI = val
                window.config.file_naming_pattern = val
                saveConfig()
            },
            saveFilePath() {
                let val = (document.getElementById("fileSaveFolder")! as HTMLInputElement).value
                if (!val.endsWith(path.sep)) val += path.sep
                this.$data.fileSaveFolderI = val
                window.config.save_path = val
                saveConfig()
            },
        },
    })
</script>
