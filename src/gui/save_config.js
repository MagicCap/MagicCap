import { ipcRenderer } from "electron"

export default () => {
    window.config.save()
    ipcRenderer.send("config-edit", window.config.o)
}