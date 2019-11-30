import "babel-polyfill"
import Vue from "vue"
import App from "./templates/app"
import { getApplicationInfo } from "./interfaces/application_info"
import { getConfig } from "./interfaces/config"

// TODO: Implement Sentry.

Promise.all([getApplicationInfo(), getConfig()]).then(() => new Vue(App).$mount("#app"))
