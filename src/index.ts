import { createApp } from 'vue';

import App from '~/App.vue';
import { createPinia } from 'pinia';
import createVueRouter from '~/Router';

import '~/styles/fontsLoader.styl';
import '~/styles/global.styl';
import swAPI from '~/serviceWorker/swAPI';

await swAPI.register();

const pinia = createPinia();
const Router = createVueRouter(pinia);
/*const _app = */createApp(App).use(pinia).use(Router).mount('#app');
