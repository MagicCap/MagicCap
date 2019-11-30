import "babel-polyfill"
import Vue from "vue"
import App from "./templates/app"
import { getConfig } from "./config"

// TODO: Implement Sentry.

getConfig().then(() => new Vue(App).$mount("#app"))
