import { parseQuery, getAppRootPath } from './utils/urlUt';
import { callCapturedEventListeners } from './utils/navEvent';
import { asyncForEach, toMiddleWare, getPath, createEvent } from './utils';
import {
  RouterConfig,
  setRouterConfig,
  RouterInfo,
  __GARFISH_ROUTER_UPDATE_FLAG__,
  __GARFISH_ROUTER_FLAG__,
  __GARFISH_BEFORE_ROUTER_EVENT__,
} from './config';
import CustomEvent from './utils/customEvent';
import { linkTo } from './linkTo';

export const normalAgent = () => {
  // By identifying whether have finished listening, if finished listening, listening to the routing changes do not need to hijack the original event
  // Support nested scene
  const addRouterListener = function () {
    window.addEventListener(__GARFISH_BEFORE_ROUTER_EVENT__, function (env) {
      RouterConfig.routerChange && RouterConfig.routerChange(location.pathname);
      linkTo((env as any).detail);
    });
  };

  if (!window[__GARFISH_ROUTER_FLAG__]) {
    // Listen for pushState and replaceState, call linkTo, processing, listen back
    // Rewrite the history API method, triggering events in the call

    const rewrite = function (type: keyof History) {
      const hapi = history[type];
      return function () {
        const urlBefore = window.location.pathname + window.location.hash;
        const stateBefore = history?.state;
        const res = hapi.apply(this as any, arguments);
        const urlAfter = window.location.pathname + window.location.hash;
        const stateAfter = history?.state;

        const e = createEvent(type);
        (e as any).arguments = arguments;

        if (urlBefore !== urlAfter || stateBefore !== stateAfter) {
          // RouterConfig.routerChange && RouterConfig.routerChange(urlAfter);
          window.dispatchEvent(
            new CustomEvent(__GARFISH_BEFORE_ROUTER_EVENT__, {
              detail: {
                toRouterInfo: {
                  fullPath: urlAfter,
                  query: parseQuery(location.search),
                  path: getPath(RouterConfig.basename!, urlAfter),
                  state: stateBefore,
                },
                fromRouterInfo: {
                  fullPath: urlBefore,
                  query: parseQuery(location.search),
                  path: getPath(RouterConfig.basename!, urlBefore),
                  state: stateAfter,
                },
                eventType: type,
              },
            }),
          );
        }
        // window.dispatchEvent(e);
        return res;
      };
    };

    history.pushState = rewrite('pushState');
    history.replaceState = rewrite('replaceState');

    // Before the collection application sub routing, forward backward routing updates between child application
    window.addEventListener(
      'popstate',
      function () {
        window.dispatchEvent(
          new CustomEvent(__GARFISH_BEFORE_ROUTER_EVENT__, {
            detail: {
              toRouterInfo: {
                fullPath: location.pathname,
                query: parseQuery(location.search),
                path: getPath(RouterConfig.basename!, location.pathname),
              },
              fromRouterInfo: {
                fullPath: RouterConfig.current!.fullPath,
                path: RouterConfig.current!.path,
                query: RouterConfig.current!.query,
              },
              eventType: 'popstate',
            },
          }),
        );
      },
      false,
    );

    window[__GARFISH_ROUTER_FLAG__] = true;
  }
  addRouterListener();
};

export const initRedirect = () => {
  linkTo({
    toRouterInfo: {
      fullPath: location.pathname,
      path: getPath(RouterConfig.basename!),
      query: parseQuery(location.search),
      state: history.state,
    },
    fromRouterInfo: {
      fullPath: '/',
      path: '/',
      query: {},
      state: {},
    },
    eventType: 'pushState',
  });
};

export const listen = () => {
  normalAgent();
  initRedirect();
};
