// Requirements go here.
import { mkdirSync, existsSync, readdirSync, unlinkSync } from "fs"
import { homedir } from "os"
import * as npm from "npm"
import * as path from "path"
import { spawn, exec } from "child_process"
import * as SQLite3 from "better-sqlite3"
import { handleUploaderRejigging, uploaders } from "./uploaders"

// Defines the database.
const db = SQLite3(`${homedir()}/magiccap.db`)

// The plugin loading result.
class PluginWrapper {
    public success: boolean
    public message: string | undefined
    public plugin: any

    constructor(success: boolean, message: string | undefined, plugin: any) {
        this.success = success
        this.message = message
        this.plugin = plugin
    }
}

// The main class handling plugin management.
class PluginManager {
    // Any attributes go here.
    public path: string
    public installedPlugins: string[]
    public pluginResults: {[key: string]: PluginWrapper}

    // Constructs the plugin manager.
    constructor() {
        this.path = `${homedir()}/magiccap-plugins`
        if (!existsSync(this.path)) mkdirSync(this.path)
        const amp = require("app-module-path")
        amp.addPath(this.path)
        amp.addPath(`${__dirname}/shared`)
        npm.load({})
        this.installedPlugins = []
        this._lsDb()
        this.pluginResults = {}
        for (const plugin of this.installedPlugins) this.load(plugin)
    }

    // Runs the npm command.
    async runNpmCmd(args: string[]) {
        const npmBin = path.join(npm.bin, "npm")
        let data = ""
        let err = ""
        try {
            return await new Promise((res, rej) => {
                const cmd = spawn(npmBin, args)
                cmd.stdout.on("data", chunk => { data += chunk })
                cmd.stderr.on("data", chunk => { err += chunk })
                cmd.on("exit", code => {
                    if (code !== 0) rej(err)
                    res(data)
                })
            })
        } finally {
            // Purge package-lock.json if it exists.
            if (existsSync(path.join(this.path, "package-lock.json"))) unlinkSync(path.join(this.path, "package-lock.json"))

            // If node_modules exists, take everything from the folder and move it.
            const nodeModules = path.join(this.path, "node_modules")
            for (const f of readdirSync(nodeModules)) {
                const fPath = path.join(this.path, f)
                if (existsSync(fPath)) {
                    await new Promise((res, rej) => {
                        exec(`rm -rf ${fPath}`, {
                            cwd: nodeModules,
                        }, b => {
                            if (b) rej(b)
                            else res()
                        })
                    })
                }
            }
            await new Promise((res, rej) => {
                exec("mv * ../", {
                    cwd: nodeModules,
                }, b => {
                    if (b) rej(b)
                    else res()
                })
            })
            await new Promise((res, rej) => {
                exec(`rm -rf ${nodeModules}`, {
                    cwd: nodeModules,
                }, b => {
                    if (b) rej(b)
                    else res()
                })
            })
        }
    }

    // Inserts into the DB.
    private _insertDb(importName: string) {
        db.prepare("INSERT INTO plugins VALUES (?)").run(importName)
        this.installedPlugins.push(importName)
    }

    // Removes from the DB.
    private _removeDb(importName: string) {
        db.prepare("DELETE FROM plugins WHERE importName = ?").run(importName)
        this.installedPlugins = this.installedPlugins.splice(this.installedPlugins.indexOf(importName), 1)
    }

    // Lists the DB.
    private _lsDb() {
        for (const x of db.prepare("SELECT * FROM plugins").iterate()) this.installedPlugins.push(x.importName)
    }

    // Loads the plugin.
    public async load(pluginName: string) {
        console.log(`Loading Plugin: ${pluginName}`)
        try {
            const r = require(pluginName)
            const c = new r(this)
            if (c.load !== undefined) await c.load()
            console.log(`Loaded ${pluginName}`)
            this.pluginResults[pluginName] = new PluginWrapper(
                true, undefined, c
            )
        } catch (e) {
            console.error(`Failed to load plugin ${pluginName}:\n${e.stack}`)
            this.pluginResults[pluginName] = new PluginWrapper(
                false, String(e), undefined
            )
        }
    }

    // Attempts to unload the plugin.
    public async unload(pluginName: string) {
        const result = this.pluginResults[pluginName]
        if (result.plugin) {
            if (result.plugin.unload === undefined) {
                // Log no unload function.
                console.log(`No unload function for ${pluginName}!`)
            } else {
                // Unload the plugin.
                await result.plugin.unload()
                console.log(`Unloaded ${pluginName}`)
            }
        }
    }

    // Deletes a plugin.
    public async delete(importName: string) {
        await this.runNpmCmd(["uninstall", "--prefix", this.path, importName])
        this._removeDb(importName)
        await this.unload(importName)
    }

    // Pulls a plugin from npm.
    public async install(installArg: string, importName: string) {
        await this.runNpmCmd(["i", "--prefix", this.path, installArg])
        this._insertDb(importName)
        await this.load(importName)
    }

    // Reloads all plugins.
    public async reload() {
        for (const k in this.pluginResults) {
            if (this.pluginResults[k].plugin) await this.unload(k)
            delete this.pluginResults[k]
            await this.load(k)
        }
    }

    // Loads in a uploader.
    public loadUploader(uploaderSlug: string, uploader: any) {
        (uploaders as any)[uploaderSlug] = uploader
        handleUploaderRejigging()
    }

    // Unloads the uploader.
    public unloadUploader(uploaderSlug: string) {
        delete (uploaders as any)[uploaderSlug]
        handleUploaderRejigging()
    }
}

// Imports a instance of the plugin manager.
export default new PluginManager()
