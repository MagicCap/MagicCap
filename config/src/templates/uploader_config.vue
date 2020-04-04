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
                   v-bind:key="uploaderKey" v-for="(uploader, uploaderKey) in uploaders" v-if="uploader.icon">
                        <span class="icon is-medium">
                            <img class="rounded-img" :src="uploader.icon.startsWith('PD94bW') ? `data:image/svg+xml;base64,${uploader.icon}` : `data:image/xyz;base64,${uploader.icon}`">
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
                        <div v-else-if="option.type === 'sxcu__EDGECASE'">
                            <div class="field">
                                <label class="label" :for="option.value">{{ option.name }}:</label>
                                <div class="control">
                                    <div v-if="getDefaultValue(option)">
                                        <p>
                                            <a @click="unlinkSxcu()" style="color: #add8e6">
                                                A ShareX file is already configured. Click here to remove it from your current configuration.
                                            </a>
                                        </p>
                                    </div>
                                    <div v-else>
                                        <input type="file" @change="loadSxcu">
                                    </div>
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
    import config from "../interfaces/config"
    import uploadersPromise from "../interfaces/uploaders"

    const uploaders = {} as any
    uploadersPromise.then(u => {
        uploaders.length = 0
        for (const x in u) uploaders[x] = u[x]
    })

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
                checkUploaderUpload: config.o.upload_capture === undefined ? true : config.o.upload_capture,
                checkUploaderOpen: Boolean(config.o.upload_open),
            }
        },
        watch: {
            checkUploaderOpen() {
                config.o.upload_open = this.$data.checkUploaderOpen
                config.save()
            },
            checkUploaderUpload() {
                config.o.upload_capture = this.$data.checkUploaderUpload
                config.save()
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
                        const c = config.o[option.value]
                        if (c === undefined) {
                            if (option.default !== undefined) {
                                return option.default
                            }
                            return false
                        }
                        return c
                    }
                    default: {
                        if (config.o[option.value]) {
                            return config.o[option.value]
                        }
                        if (option.default !== undefined) {
                            return option.default
                        }
                        if (option.type === "token_from_json") {
                            return undefined
                        }
                        return ""
                    }
                }
            },
            loadSxcu(ev: any) {
                this.$data.exception = ""
                const vm = this
                const file = ev.target.files[0]
                const reader = new FileReader()

                reader.onload = async e => {
                    config.o.sxcu_data = e.target.result
                    await config.save()
                    vm.$forceUpdate()
                }
                reader.readAsText(file)
            },
            renderUploader(key: string) {
                const uploader = uploaders[key]
                const options = []
                for (const optionKey in uploader.configOptions) {
                    const option = uploader.configOptions[optionKey]
                    switch (option.type) {
                        case "text":
                        case "integer":
                        case "password":
                        case "sxcu__EDGECASE":
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
                                config.o[option.value] = config.o[option.value] || false
                                config.save()
                            }
                            break
                        }
                        case "object": {
                            const i = config.o[option.value] || option.default || {}
                            options.push({
                                type: option.type,
                                value: option.value,
                                default: option.default,
                                required: option.required,
                                items: i,
                                name: optionKey,
                            })
                            config.o[option.value] = i
                            config.save()
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
                delete config.o[option.value]
                config.save()
            },
            unlinkSxcu() {
                this.$data.exception = ""
                config.o.sxcu_data = undefined
                const vm = this
                config.save().then(() => vm.$forceUpdate())
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
                config.o[option.value] = res
                config.save()
            },
            validateConfig() {
                this.$set(this, "exception", "")
                this.$set(this, "exceptionData", "")
                for (const optionKey in this.uploader.options) {
                    const option = this.uploader.options[optionKey]
                    const c = config.o[option.value]
                    if (c === undefined && option.required) {
                        if (option.default) {
                            config.o[option.value] = option.default
                            config.save()
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
                config.o.uploader_type = file
                config.save()
                this.exception += "ayyyyDefaultSaved"
            },
            testUploader() {
                if (!this.validateConfig()) {
                    return
                }
                document.getElementById("testButton")!.classList.add("is-loading")
                const vm = this
                fetch("/uploader/test", {method: "POST", body: this.getFilename()}).then(async res => {
                    if (res.ok) {
                        this.$data.exception += "ayyyyTestWorked"
                    } else {
                        vm.$data.exception += "testFailed"
                        vm.$data.exceptionData += await res.json()
                    }
                    document.getElementById("testButton")!.classList.remove("is-loading")
                })
            },
            deleteRow(key: string, option: any) {
                delete option.items[key]
                config.o[option.value] = option.items
                this.$forceUpdate()
                config.save()
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
                config.o[option.value] = option.items
                this.$forceUpdate()
                config.save()
            },
        },
    })
</script>
