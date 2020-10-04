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
    import config from "../interfaces/config"
    import clipboard from "../electron_functionality_ports/clipboard"
    import applicationInfo from "../interfaces/application_info"

    function safeConfig() {
        let newConfig = {} as any
        for (const key in config.o) {
            if (!config.o.hasOwnProperty(key)) continue
            let val = config.o[key]
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
                debugInfo: `MagicCap Version: ${applicationInfo.version}
System OS: ${applicationInfo.os.type} ${applicationInfo.os.release} / Platform: ${applicationInfo.platform}
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
                clipboard(this.$data.debugInfo)
            },
        },
    })
</script>
