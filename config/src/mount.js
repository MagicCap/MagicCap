import "babel-polyfill"
import Vue from "vue"
import App from "./templates/app"

// TODO: Sentry here!

window.config = viewInterface.GetConfig()
new Vue(App).$mount("#app")
