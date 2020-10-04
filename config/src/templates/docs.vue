<template>
    <div :class="`modal ${active ? 'is-active' : ''}`">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title" id="helpModalTitle">Help (Docs)</p>
            </header>
            <section class="modal-card-body" id="helpModalBody">
            </section>
        </div>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import showHelpModal from "../docs"

    export default Vue.extend({
        name: "Docs",
        data() {
            return {
                active: false,
            }
        },
        methods: {
            toggle() {
                this.$data.active = !this.$data.active
                if (this.$data.active) showHelpModal()
                window.docsVueEl = this
            },
        },
    })
</script>
