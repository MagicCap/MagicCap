import "babel-polyfill"
import Vue from "vue"
import App from "./templates/app"
import { getConfig } from "./config"

getConfig().then(() => new Vue(App).$mount("#app"))
