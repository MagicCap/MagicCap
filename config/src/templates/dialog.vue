<template>
    <div class="modal is-active" v-if="active">
        <div class="modal-background"></div>
        <div class="modal-card">
            <header class="modal-card-head">
                <p class="modal-card-title">{{ title }}</p>
            </header>
            <section class="modal-card-body">
                <p>{{ description }}</p>
                <br>
                <div class="buttons">
                    <a class="button" v-for="(title, index) in buttons" @click="clickButton(index)">
                        {{ title }}
                    </a>
                </div>
            </section>
        </div>
    </div>
</template>

<script>
    export default {
        name: "Dialog",
        props: {
            active: Boolean,
        },
        data() {
            return {
                title: "",
                description: "",
                buttons: [],
                resolver: null,
            }
        },
        methods: {
            clickButton(index) {
                this.$data.resolver(index)
            },
        },
    }
</script>
