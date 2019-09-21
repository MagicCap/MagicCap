<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div v-if="uploaderName === ''" class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Uploader Settings</p>
            </header>
            <section class="modal-card-body" id="uploaderConfigBody">
                <label class="input_container">Upload files once they are captured.
                    <input type="checkbox" id="uploaderUploadCheckbox" v-model="checkUploaderUpload">
                    <span class="custom_input"></span>
                </label>
                <label class="input_container">Open link in browser once uploaded.
                    <input type="checkbox" id="uploaderOpenCheckbox" v-model="checkUploaderOpen">
                    <span class="custom_input"></span>
                </label>
                <br/>
                <a class="button" style="margin-bottom:5px; margin-right:5px" v-on:click="renderUploader(uploaderKey)"
                   v-bind:key="uploaderKey" v-for="(uploader, uploaderKey) in uploaders">
                        <span class="icon is-medium">
                            <img class="rounded-img" :src="'../icons/' + uploader.icon">
                        </span>
                    <p>{{ uploader.name }}</p>
                </a>
                <br/><br/>
                <a class="button" @click="exportImport">Export or Import Uploader Configurations</a>
            </section>
        </div>
        <div v-else class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">{{ uploader.name }}</p>
            </header>
            <section class="modal-card-body" id="activeUploaderConfigBody">
                <article class="message is-danger" v-if="exception === 'requiredStuffMissing'"
                         id="requiredStuffMissing">
                    <div class="message-body">Required arguments are missing.</div>
                </article>
                <article class="message is-danger" v-else-if="exception === 'blankKey'" id="blankKey">
                    <div class="message-body">The key you gave was blank.</div>
                </article>
                <article class="message is-danger" v-else-if="exception === 'keyAlreadyUsed'" id="keyAlreadyUsed">
                    <div class="message-body">The key you gave was already used.</div>
                </article>
                <article class="message is-danger" v-else-if="exception === 'notAnInteger'" id="notAnInteger">
                    <div class="message-body">You provided a invalid integer.</div>
                </article>
                <article class="message is-success" v-else-if="exception === 'ayyyyDefaultSaved'"
                         id="ayyyyDefaultSaved">
                    <div class="message-body">Default uploader successfully saved.</div>
                </article>
                <article class="message is-success" v-else-if="exception === 'ayyyyTestWorked'" id="ayyyyTestWorked">
                    <div class="message-body">Uploader test was successful.</div>
                </article>
                <article class="message is-danger" v-else-if="exception === 'testFailed'" id="testFailed">
                    <div class="message-body">{{ exceptionData }}</div>
                </article>
                <div v-if="uploader.options.length === 0">
                    <p>There are no configuration options for this uploader.</p><br>
                </div>
                <div v-else>
                    <div v-for="option in uploader.options" v-bind:key="option.name">
                        <div v-if="option.type === 'text' || option.type === 'integer'">
                            <div class="field">
                                <label class="label" :for="option.value">{{ option.name }}:</label>
                                <div class="control">
                                    <input class="input" type="text" :id="option.value" :placeholder="option.name"
                                           :value="getDefaultValue(option)" v-on:change="changeOption(option)">
                                </div>
                            </div>
                        </div>
                        <div v-else-if="option.type === 'oauth2'">
                            <div class="field">
                                <label class="label" :for="option.value">{{ option.name }}:</label>
                                <div v-if="getDefaultValue(option) === undefined">
                                    <a class="button" id="oauthFlowInit" v-on:click="oauthLogin()">Authenticate</a>
                                </div>
                                <div v-else>
                                    <p>Already set. Do you want to <a v-on:click="resetValue(option)">reset this
                                        value?</a></p>
                                </div>
                            </div>
                        </div>
                        <div v-else-if="option.type === 'password'">
                            <div class="field">
                                <label class="label" :for="option.value">{{ option.name }}:</label>
                                <div class="control">
                                    <input class="input" type="password" :id="option.value" :placeholder="option.name"
                                           :value="getDefaultValue(option)" v-on:change="changeOption(option)">
                                </div>
                            </div>
                        </div>
                        <div v-else-if="option.type === 'boolean'">
                            <div class="field">
                                <label class="label" :for="option.value">{{ option.name }}:</label>
                                <div class="control">
                                    <label class="input_container">{{ option.name }}
                                        <input type="checkbox" :id="option.value" :checked="getDefaultValue(option)"
                                               v-on:change="changeOption(option)">
                                        <span class="custom_input"></span>
                                    </label>
                                </div>
                            </div>
                        </div>
                        <div v-else-if="option.type === 'object'">
                            <div class="field">
                                <label class="label" :for="option.value">{{ option.name }}:</label>
                                <table class="table is-bordered is-striped is-fullwidth" :id="option.value">
                                    <tbody>
                                    <tr v-bind:key="key" v-for="(value, key) in option.items">
                                        <td>{{ key }}</td>
                                        <td>{{ value }}</td>
                                        <td>
                                            <a class="button is-danger" v-on:click="deleteRow(key, option)">Delete
                                                Row</a>
                                        </td>
                                    </tr>
                                    </tbody>
                                    <tfoot>
                                    <tr>
                                        <th>
                                            <input name="name" class="input" :id="'Key' + option.value" type="text"
                                                   placeholder="Name">
                                        </th>
                                        <th>
                                            <input name="value" class="input" :id="'Value' + option.value" type="text"
                                                   placeholder="Value">
                                        </th>
                                        <th>
                                            <a class="button is-primary" v-on:click="addToTable(option)">Add</a>
                                        </th>
                                    </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
                <br>
                <a class="button is-info" v-on:click="testUploader()" id="testButton">Test Uploader</a>
                <span style="padding-left: 5px">
                        <a class="button is-success" v-on:click="setDefaultUploader()">Set As Default Uploader</a>
                    </span>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import saveConfig from "../save_config"
    import { ipcRenderer } from "electron"

    declare global {
        interface Window {
            uploaders: any,
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
    const uploaders = window.uploaders.uploaders

    export default Vue.extend({
        name: "UploaderConfig",
        data() {
            return {
                exception: "",
                exceptionData: "",
                uploaderName: "",
                uploaders: uploaders,
                uploader: {} as any,
                active: false,
                checkUploaderUpload: Boolean(window.config.o.upload_capture),
                checkUploaderOpen: Boolean(window.config.o.upload_open),
            }
        },
        watch: {
            checkUploaderOpen() {
                window.config.o.upload_open = this.$data.checkUploaderOpen
                saveConfig()
            },
            checkUploaderUpload() {
                window.config.o.upload_capture = this.$data.checkUploaderUpload
                saveConfig()
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
                this.$data.uploaderName = ""
                this.$data.exception = ""
            },
            exportImport() {
                this.$emit("appsettings-show")
            },
            getDefaultValue: (option: any) => {
                switch (option.type) {
                    case "boolean": {
                        const c = window.config.o[option.value]
                        if (c === undefined) {
                            if (option.default !== undefined) {
                                return option.default
                            }
                            return false
                        }
                        return c
                    }
                    default: {
                        if (window.config.o[option.value]) {
                            return window.config.o[option.value]
                        }
                        if (option.default !== undefined) {
                            return option.default
                        }
                        if (option.type === "token_from_json" || option.type === "oauth2") {
                            return undefined
                        }
                        return ""
                    }
                }
            },
            renderUploader(key: string) {
                const uploader = uploaders[key]
                const options = []
                for (const optionKey in uploader.config_options) {
                    const option = uploader.config_options[optionKey]
                    switch (option.type) {
                        case "text":
                        case "integer":
                        case "password":
                        case "boolean": {
                            options.push({
                                type: option.type,
                                value: option.value,
                                default: option.default,
                                required: option.required,
                                startUrl: option.startUrl,
                                endUrlRegex: option.endUrlRegex,
                                name: optionKey,
                            })
                            if (option.type === "boolean") {
                                window.config.o[option.value] = window.config.o[option.value] || false
                                saveConfig()
                            }
                            break
                        }
                        case "oauth2": {
                            options.push({
                                type: option.type,
                                default: option.default,
                                value: option.value,
                                required: option.required,
                                name: optionKey,
                            })
                            break
                        }
                        case "object": {
                            const i = window.config.o[option.value] || option.default || {}
                            options.push({
                                type: option.type,
                                value: option.value,
                                default: option.default,
                                required: option.required,
                                items: i,
                                name: optionKey,
                            })
                            window.config.o[option.value] = i
                            saveConfig()
                            break
                        }
                    }
                }
                this.$data.uploader = {
                    name: uploader.name,
                    options,
                }
                this.$data.uploaderName = key
            },
            resetValue(option: any) {
                delete window.config.o[option.value]
                saveConfig()
            },
            changeOption: (option: any) => {
                let res: undefined | any = (document.getElementById(option.value)! as HTMLInputElement).value
                if (res === "") {
                    res = undefined
                }
                switch (option.type) {
                    case "integer":
                        res = parseInt(res!) || option.default || undefined
                        break
                    case "boolean":
                        res = (document.getElementById(option.value)! as HTMLInputElement).checked
                        break
                }
                window.config.o[option.value] = res
                saveConfig()
            },
            validateConfig() {
                this.$set(this, "exception", "")
                this.$set(this, "exceptionData", "")
                for (const optionKey in this.uploader.options) {
                    const option = this.uploader.options[optionKey]
                    const c = window.config.o[option.value]
                    if (c === undefined && option.required) {
                        if (option.default) {
                            window.config.o[option.value] = option.default
                            saveConfig()
                        } else if (option.type === "integer" && !parseInt((document.getElementById(option.value)! as HTMLInputElement).value)) {
                            this.exception += "notAnInteger"
                            return false
                        } else {
                            this.exception += "requiredStuffMissing"
                            return false
                        }
                    }
                }
                return true
            },
            getFilename() {
                for (const file in uploaders) {
                    const import_ = (uploaders as any)[file]
                    if (import_.name === this.uploader.name) {
                        return file
                    }
                }
            },
            setDefaultUploader() {
                if (!this.validateConfig()) {
                    return
                }

                const file = this.getFilename()
                window.config.o.uploader_type = file
                saveConfig()
                this.exception += "ayyyyDefaultSaved"
            },
            testUploader() {
                if (!this.validateConfig()) {
                    return
                }
                document.getElementById("testButton")!.classList.add("is-loading")
                ipcRenderer.send("test-uploader", this.getFilename())
                ipcRenderer.once("test-uploader-res", (_: any, res: any) => {
                    document.getElementById("testButton")!.classList.remove("is-loading")
                    if (res[0]) {
                        this.$data.exception += "ayyyyTestWorked"
                    } else {
                        this.$data.exception += "testFailed"
                        this.$data.exceptionData += res[1]
                    }
                })
            },
            deleteRow(key: string, option: any) {
                delete option.items[key]
                window.config.o[option.value] = option.items
                this.$forceUpdate()
                saveConfig()
            },
            addToTable(option: any) {
                this.$data.exception = ""
                const key = (document.getElementById(`Key${option.value}`)! as HTMLInputElement).value || ""
                const value = (document.getElementById(`Value${option.value}`)! as HTMLInputElement).value || ""
                if (key === "") {
                    this.$data.exception += "blankKey"
                    return
                }
                if (option.items[key] !== undefined) {
                    this.$data.exception += "keyAlreadyUsed"
                    return
                }
                option.items[key] = value
                window.config.o[option.value] = option.items
                this.$forceUpdate()
                saveConfig()
            },
            async oauthLogin() {
                document.getElementById("oauthFlowInit")!.classList.add("is-loading")
                await ipcRenderer.send("oauth-flow-uploader", this.$data.uploader.name)
                const configDiff = await new Promise(res => {
                    ipcRenderer.once("oauth-flow-uploader-response", (_: any, diff: any) => {
                        res(diff)
                    })
                }) as any
                document.getElementById("oauthFlowInit")!.classList.remove("is-loading")
                if (!configDiff) {
                    return
                }
                for (const key of Object.keys(configDiff) as any) {
                    window.config.o[key] = configDiff[key]
                }
                saveConfig()
                this.$forceUpdate()
            },
        },
    })
</script>
