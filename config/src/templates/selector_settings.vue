<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
            <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">Selector Settings</p>
            </header>
            <section class="modal-card-body">
                <label class="input_container">Show the magnifier in the region selector.
                    <input type="checkbox" v-model="magnifier">
                    <span class="custom_input"></span>
                </label>
                <label class="input_container">Attempt to hide the cursor during selection.
                    <input type="checkbox" v-model="hideCursor">
                    <span class="custom_input"></span>
                </label>
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import saveConfig from "../save_config"

    declare global {
        interface Window {
            config: any,
        }
    }

    export default Vue.extend({
        name: "SelectorSettings",
        data() {
            return {
                active: false,
                magnifier: window.config.magnifier === undefined ? true : window.config.magnifier,
                hideCursor: window.config.hide_cursor === undefined ? true : window.config.hide_cursor,
            }
        },
        watch: {
            magnifier() {
                window.config.magnifier = this.$data.magnifier;
                saveConfig()
            },
            hideCursor() {
                window.config.hide_cursor = this.$data.hideCursor;
                saveConfig()
            },
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
            },
        },
    })
</script>
