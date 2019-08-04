<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Debug Information</p>
            </header>
            <section class="modal-card-body">
                <p>Copy everything below to where the debug information has been requested.</p>
                <pre><code>{{ debugInfo }}</code></pre>
                <br/>
                <a class="button" @click="copyDebug">{{ copy }}</a>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import { remote } from "electron"
    import * as os from "os"

    declare global {
        interface Window {
            config: {
                saveConfig: () => void,
                o: any,
            },
        }
    }

    function safeConfig() {
        let newConfig = {} as any
        for (const key in window.config.o) {
            if (!window.config.o.hasOwnProperty(key)) continue
            let val = window.config.o[key]
            if (key.toLowerCase().match(/(\b|_)password(\b|_)/g)) val = "PASSWORD REDACTED"
            if (key.toLowerCase().match(/(\b|_)username(\b|_)/g)) val = "USERNAME REDACTED"
            if (key.toLowerCase().match(/(\b|_)secret(\b|_)/g)) val = "SECRET REDACTED"
            if (key.toLowerCase().match(/(\b|_)token(\b|_)/g)) val = "TOKEN REDACTED"
            if (key.toLowerCase().match(/(\b|_)key(\b|_)/g)) val = "KEY REDACTED"
            newConfig[key] = val
        }
        return newConfig
    }

    export default Vue.extend({
        name: "Debug",
        data() {
            return {
                active: false,
                debugInfo: `MagicCap Version: ${remote.app.getVersion()}
System OS: ${os.type()} ${os.release()} / Platform: ${process.platform}
Installation ID: ${window.config.o.install_id}
Config: ${JSON.stringify(safeConfig())}`,
                copy: "Copy to clipboard",
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            copyDebug() {
                this.$data.copy = "Copied!"
                remote.clipboard.writeText(this.$data.debugInfo)
            },
        },
    })
</script>
