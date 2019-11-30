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
                    <td v-if="capture.success === 0"></td>
                    <td v-else>
                        <a class="button is-primary" v-on:click="capture.file_path ? openScreenshotFile(capture.file_path) : openScreenshotURL(capture.url)">View</a>
                    </td>
                    <td>
                        <a class="button is-danger" v-on:click="rmCapture(capture.timestamp)">Remove</a>
                    </td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"

    // A list of the displayed captures.
    const displayedCaptures: any[] = []

    // Gets the captures.
    async function getCaptures() {
        const res = await fetch("/captures")
        if (!res.ok) {
            throw res
        }
        const newCaptures = await res.json()
        displayedCaptures.length = 0
        for (const c of newCaptures) displayedCaptures.push(c)
    }
    getCaptures().then(() => setInterval(async() => {
        const res = await fetch("/changefeed")
        if (await res.json()) getCaptures()
    }, 100))

    export default Vue.extend({
        name: "Captures",
        data() {
            return {
                captures: displayedCaptures,
                active: true,
            }
        },
        methods: {
            rmCapture: async(timestamp: number) => {
                //db.prepare("DELETE FROM captures WHERE timestamp = ?").run(timestamp)
                //await getCaptures()
            },
            openScreenshotURL: async(url: string) => {
                //await shell.openExternal(url)
            },
            openScreenshotFile: async(filePath: string) => {
                //await shell.openItem(filePath)
            },
            toggle() {
                //getCaptures()
                this.$data.active = !this.$data.active
            },
        },
    })
</script>
