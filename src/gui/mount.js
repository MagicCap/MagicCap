import Vue from "vue"
import App from "./templates/app"
import * as Sentry from "@sentry/electron"

Sentry.init({
    dsn: "https://968dcfa0651e40ddaa807bbe47b1aa91@sentry.io/1396847",
})

Sentry.configureScope(scope => {
    scope.setUser({ id: window.config.o.install_id })
})

new Vue(App).$mount("#app")
