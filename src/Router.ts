import { createRouter, createWebHistory, Router, RouteLocationNormalized, NavigationGuardNext } from 'vue-router';
import { type Store } from '~/types/store';

// Components:
import PageChat from '~/views/PageChat.vue';
import Page404 from '~/views/Page404.vue';
import routes from '~/routes';
import { RouteRecordRaw } from 'vue-router';

type MyRoute = RouteRecordRaw & {
  path: keyof typeof routes,
  meta?: {
    noLoginRequired?: boolean
    loginRequired?: boolean
  }
}

export default function createVueRouter(_Store: Store): Router {
  const routesList: MyRoute[] = [
    { path: '/', name: 'default', redirect: { name: 'chat' } },
    { path: '/chat', name: 'chat', component: PageChat },

    { path: '/:pathMatch(.*)*', name: 'page404', component: Page404 },
  ];

  const Router = createRouter({
    history: createWebHistory(),
    routes: routesList,
  });

  Router.beforeEach(async (to: RouteLocationNormalized, _, next: NavigationGuardNext) => {
    if (to.path === '/' || to.path === '') {
      next({ name: 'chat' });
      return;
    }

    next();
  });

  Router.beforeResolve(async () => {
    if (window?.onbeforeunload) {
      if (confirm('Изменения не сохранены. Вы уверены, что хотите покинуть страницу?')) {
        window.onbeforeunload = null;
      } else {
        return false;
      }
    }
  });

  return Router;
}
