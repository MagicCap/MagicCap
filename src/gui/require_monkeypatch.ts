// This code is a part of MagicCap which is a MPL-2.0 licensed project.
// Copyright (C) Jake Gealer <jake@gealer.email> 2019.

export function patch(obj: any) {
    const oldRequire = obj.require
    const path = oldRequire("path")
    obj.require = (name: string) => {
        if (name === "monkeypatch_assert") {
            return "Hi"
        } else if (name === "vue") {
            return { default: oldRequire("vue/dist/vue") }
        } else if (name.startsWith(".")) {
            let patchedPath = path.join("./gui", name)
            if (!patchedPath.startsWith(".")) {
                patchedPath = `./${patchedPath}`
            }
            return oldRequire(patchedPath)
        } else {
            return oldRequire(name)
        }
    }
}
