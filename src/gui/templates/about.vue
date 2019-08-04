<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
            <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">About</p>
            </header>
            <section class="modal-card-body">
                <h1 class="title">MagicCap v{{ version }}</h1>
                <p>Copyright (C) Jake Gealer, Rhys O'Kane &amp; Matt Cowley 2018-2019.</p>
                <p>This software is licensed under the {license} license.</p>
                <p v-if="liteTouch">Some settings are managed by your system administrator.</p>
                <p>
                    <br/>
                    <small><a class="button is-small" @click="showDebug">Debug Information</a></small>
                </p>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import { remote } from "electron"

    export default Vue.extend({
        name: "About",
        data() {
            return {
                active: false,
                version: remote.app.getVersion(),
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            showDebug() {
                this.$emit("debug-show")
            }
        },
    })
</script>
