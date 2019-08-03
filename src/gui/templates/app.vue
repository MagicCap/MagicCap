<template>
    <div class="columns is-gapless">
        <aside class="column aside" id="sidebar">
            <aside class="menu">
                <ul class="menu-list">
                    <li>
                        <a
                            @click="toggleCoreModal('Captures')"
                            :data-tooltip="_('View all your previous captures')"
                            data-tooltip-position="right">
                            <i class="far fa-images"></i> {{ _('Capture History') }}</a>
                    </li>
                    <li>
                        <a
                            @click="toggleCoreModal('ClipboardAction')"
                            data-tooltip="Control what will be on your clipboard after capture"
                            data-tooltip-position="right">
                            <i class="far fa-clipboard"></i> {{ _('Clipboard Action') }}</a>
                    </li>
                    <li>
                        <a
                            @click="toggleCoreModal('FileConfig')"
                            data-tooltip="Configure capture file naming and local file saving"
                            data-tooltip-position="right">
                                <i class="far fa-file-alt"></i> File Configuration</a>
                    </li>
                    <li>
                        <a
                            @click="toggleCoreModal('HotkeySettings')"
                            data-tooltip="Define hotkeys to trigger capture actions"
                            data-tooltip-position="right">
                            <i class="far fa-keyboard"></i> Hotkey Settings</a>
                    </li>
                    <li>
                        <a
                            @click="toggleCoreModal('UploaderConfig')"
                            data-tooltip="Enable uploading captures and configure the upload target"
                            data-tooltip-position="right">
                            <i class="fas fa-upload"></i> Uploader Settings</a>
                    </li>
                </ul>
            </aside>
        </aside>
        <Captures ref="Captures"></Captures>
        <ClipboardAction ref="ClipboardAction"></ClipboardAction>
        <FileConfig ref="FileConfig"></FileConfig>
        <HotkeySettings ref="HotkeySettings"></HotkeySettings>
        <UploaderConfig ref="UploaderConfig"></UploaderConfig>
    </div>
</template>

<script lang="ts">
    import Vue from "vue"
    import Captures from "./captures"
    import ClipboardAction from "./clipboard_action"
    import FileConfig from "./file_configuration"
    import HotkeySettings from "./hotkey_settings"
    import UploaderConfig from "./uploader_config"

    export default Vue.extend({
        name: "App",
        components: {
            Captures,
            ClipboardAction,
            FileConfig,
            HotkeySettings,
            UploaderConfig,
        },
        data() {
            return {
                default: "Captures",
            }
        },
        methods: {
            _(text: string) {
                return text
            },
            toggleCoreModal(name: string) {
                this.$refs[this.$data.default].toggle()
                this.$refs[name].toggle()
                this.$data.default = name
            },
        },
    })
</script>
