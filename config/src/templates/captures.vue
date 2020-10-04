<template>
    <div class="column" v-if="active">
        <table class="table is-responsive is-fullwidth is-fullheight">
            <tbody>
                <tr v-for="capture in captures" :key="capture.timestamp">
                    <td v-if="capture.success">
                        <span data-tooltip="Capture successful" data-tooltip-position="right">
                            <i class="fas fa-check"></i></span>
                    </td>
                    <td v-else>
                        <span data-tooltip="Capture failed" data-tooltip-position="right">
                            <i class="fas fa-times"></i></span>
                    </td>
                    <td>{{ capture.filename }}</td>
                    <td>{{ new Date(capture.timestamp).toLocaleString() }}</td>
                    <td v-if="capture.url">
                        <a v-on:click="openScreenshotURL(capture.url)" class="url">{{ capture.url }}</a>
                    </td>
                    <td v-else></td>
                    <td v-if="!capture.success"></td>
                    <td v-else>
                        <a class="button is-primary" @click="capture.file_path ? openScreenshotFile(capture.file_path) : openScreenshotURL(capture.url)">View</a>
                    </td>
                    <td>
                        <a class="button is-danger" @click="rmCapture(capture.timestamp)">Remove</a>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import * as shell from "../electron_functionality_ports/shell"
    import captures, { getCaptures } from "../interfaces/captures"

    export default Vue.extend({
        name: "Captures",
        data() {
            return {
                captures,
                active: true,
            }
        },
        methods: {
            rmCapture: async(timestamp: number) => {
                await fetch("/captures/delete", {
                    method: "POST",
                    body: String(timestamp),
                })
                await getCaptures()
            },
            openScreenshotURL: async(url: string) => {
                await shell.openExternal(url)
            },
            openScreenshotFile: async(filePath: string) => {
                await shell.openItem(filePath)
            },
            toggle() {
                this.$data.active = !this.$data.active
            },
        },
    })
</script>
