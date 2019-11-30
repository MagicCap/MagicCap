<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Updates</p>
            </header>
            <section class="modal-card-body">
                <h1 class="modal-card-title"><small class="muted">You are currently using</small> MagicCap v{{ version }}</h1>
                <p>Although MagicCap will automatically check for updates, you can always manually check for updates to ensure you are on the latest update.</p>
                <br/>
                <p><a class="button" href="#" @click="checkForUpdates">{{ check }}</a></p>

                <hr/>

                <h1 class="modal-card-title">Beta Updates</h1>
                <p>Beta updates provide newer features and improved functionality, but before stable release some aspects may not be functional or may prove to be unstable.</p>
                <br/>
                <label class="input_container">Only get stable updates.
                    <input type="radio" name="BetaAction" @click="changeAction(false)" :checked="!action">
                    <span class="custom_input"></span>
                </label>
                <label class="input_container">Get stable and beta updates.
                    <input type="radio" name="BetaAction" @click="changeAction(true)" :checked="action">
                    <span class="custom_input"></span>
                </label>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import saveConfig from "../save_config"

    export default Vue.extend({
        name: "Updates",
        data() {
            return {
                active: false,
                // @ts-ignore
                version: viewInterface.getVersion(),
                action: Boolean(window.config.beta_channel),
                check: "Check for Updates",
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            changeAction(actionBool: boolean) {
                this.$data.action = actionBool
                window.config.beta_channel = actionBool
                saveConfig()
            },
            checkForUpdates() {
                this.$data.check = "Checking..."
                const vm = this
                ipcRenderer.send("check-for-updates")
                ipcRenderer.once("check-for-updates-done", () => {
                    vm.$data.check = "Check for Updates"
                })
            },
        },
    })
</script>
