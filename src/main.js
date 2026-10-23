import { mount } from "./dom.js";
import { App, initApp } from "./App.js";

mount(document.getElementById("root"), App);
const unsubscribe = initApp();
if (import.meta.hot) import.meta.hot.dispose(unsubscribe);
