<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div v-if="uploaderName === ''">
            <div class="modal-card">
                <header class="modal-card-head">
                    <p class="modal-card-title">Uploader Settings</p>
                </header>
                <section class="modal-card-body" id="uploaderConfigBody">
                    <label class="input_container">Upload files once they are captured.
                        <input type="checkbox" id="uploaderUploadCheckbox" :checked="checkUploaderUpload" v-on:change="toggleUpload()">
                        <span class="custom_input"></span>
                    </label>
                    <label class="input_container">Open link in browser once uploaded.
                        <input type="checkbox" id="uploaderOpenCheckbox" :checked="checkUploaderOpen" v-on:change="toggleOpen()">
                        <span class="custom_input"></span>
                    </label>
                    <br/>
                    <a class="button" style="margin-bottom:5px; margin-right:5px" v-on:click="renderUploader(uploaderKey)" v-bind:key="uploaderKey" v-for="(uploader, uploaderKey) in uploaders">
                        <span class="icon is-medium">
                            <img class="rounded-img" :src="'../icons/' + uploader.icon">
                        </span>
                        <p>{{ uploader.name }}</p>
                    </a>
                    <br/><br/>
                    <a class="button" @click="exportMconf">Export Uploader Configurations</a>
                    <a class="button" @click="importMconf" style="padding-left: 10px">Import Uploader Configurations</a>
                </section>
            </div>
        </div>
        <div v-else>

        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"

    declare global {
        interface Window {
            uploaders: any,
        }
    }
    const uploaders = window.uploaders.uploaders

    export default Vue.extend({
        name: "UploaderConfig",
        data() {
            return {
                uploaderName: "",
                uploaders: uploaders,
                active: false,
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
                this.$data.uploaderName = ""
            },
        },
    })
</script>
