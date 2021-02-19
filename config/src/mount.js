// Imports vue.
import Vue from "vue"

// Sets up Sentry.
import * as Sentry from "@sentry/browser"
import * as Integrations from "@sentry/integrations"
Sentry.init({
    dsn: "https://88e6f6453e2a42c6a18cb7bc0c66b1cc@sentry.io/1865767",
    integrations: [new Integrations.Vue({Vue, attachProps: true})],
})

// Initialises the remainder on the application.
import App from "./templates/app"
import { getApplicationInfo } from "./interfaces/application_info"
import { getConfig } from "./interfaces/config"
Promise.all([getApplicationInfo(), getConfig()]).then(() => new Vue(App).$mount("#app"))
