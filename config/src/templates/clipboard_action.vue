<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Clipboard Action</p>
            </header>
            <section class="modal-card-body">
                <label class="input_container">Copy the uploaded URL to the clipboard (requires file uploads to be on).
                    <input type="radio" name="clipboardActionRadio" v-on:click="changeAction(2)" :checked="action === 2">
                    <span class="custom_input"></span>
                </label>
                <label class="input_container">Copy the captured image to the clipboard.
                    <input type="radio" name="clipboardActionRadio" v-on:click="changeAction(1)" :checked="action === 1">
                    <span class="custom_input"></span>
                </label>
                <label class="input_container">Do nothing with the clipboard after a capture.
                    <input type="radio" name="clipboardActionRadio" v-on:click="changeAction(0)" :checked="action === 0">
                    <span class="custom_input"></span>
                </label>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import config from "../config"

    export default Vue.extend({
        name: "ClipboardAction",
        data() {
            return {
                active: false,
                action: config.o.clipboard_action,
            }
        },
        methods: {
            changeAction(action: Number) {
                config.o.clipboard_action = action
                this.$data.action = action
                config.save()
            },
            toggle() {
                this.$data.active = !this.$data.active
            },
        },
    })
</script>
