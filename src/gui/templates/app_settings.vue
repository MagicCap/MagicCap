<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
            <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">App Settings and Information</p>
            </header>
            <section class="modal-card-body">
                <label class="input_container">Open MagicCap at login.
                    <input type="checkbox" id="OpenAtLogin" v-on:click="saveOpenAtLogin()" :checked="OpenAtLoginI">
                    <span class="custom_input"></span>
                </label>

                <hr/>

                <h1 class="modal-card-title">About: <small class="muted">MagicCap v{{ version }}</small></h1>
                <p>Copyright (C) Jake Gealer, Rhys O'Kane &amp; Matt Cowley 2018-2019.</p>
                <p>This software is licensed under the <a @click="openMPL" class="url">MPL-2.0</a> license.</p>
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
    import { remote, shell } from "electron"
    import saveConfig from "../save_config"

    export default Vue.extend({
        name: "AppSettings",
        data() {
            return {
                active: false,
                OpenAtLoginI: window.config.o.open_login || false,
                version: remote.app.getVersion(),
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
            saveOpenAtLogin() {
                window.config.o.open_login = (document.getElementById("OpenAtLogin")! as HTMLInputElement).checked
                remote.app.setLoginItemSettings({openAtLogin: window.config.o.open_login})
                saveConfig()
            },
            showDebug() {
                this.$emit("debug-show")
            },
            openMPL() {
                shell.openExternal("https://www.mozilla.org/en-US/MPL/2.0")
            },
        },
    })
</script>
