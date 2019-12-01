<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Updates</p>
            </header>
            <section class="modal-card-body">
                <h1 class="modal-card-title"><small class="muted">You are currently using</small> MagicCap v{{ version }}</h1>

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
    import config from "../interfaces/config"
    import applicationInfo from "../interfaces/application_info"

    export default Vue.extend({
        name: "Updates",
        data() {
            return {
                active: false,
                version: applicationInfo.version,
                action: Boolean(config.o.beta_channel),
                check: "Check for Updates",
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            changeAction(actionBool: boolean) {
                this.$data.action = actionBool
                config.o.beta_channel = actionBool
                config.save()
            },
        },
    })
</script>
