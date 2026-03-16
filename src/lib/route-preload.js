const routeLoaders = {
    '/': () => import('@/pages/Home'),
    '/explore': () => import('@/pages/Explore'),
    '/browse': () => import('@/pages/Browse'),
    '/search': () => import('@/pages/SearchResults'),
    '/review': () => import('@/pages/Review'),
    '/tv': () => import('@/pages/TvShow'),
    '/person': () => import('@/pages/Person'),
    '/watchlist': () => import('@/pages/Watchlist'),
    '/lists': () => import('@/pages/Lists'),
    '/profile': () => import('@/pages/Profile'),
    '/notifications': () => import('@/pages/Notifications'),
    '/messages': () => import('@/pages/Messages'),
    '/control-room': () => import('@/pages/ControlRoom'),
    '/login': () => import('@/pages/Login'),
    '/signup': () => import('@/pages/Signup'),
};
const preloadedRoutes = new Set();
function getRouteKey(pathname) {
    if (pathname.startsWith('/review/'))
        return '/review';
    if (pathname.startsWith('/tv/'))
        return '/tv';
    if (pathname.startsWith('/person/'))
        return '/person';
    if (pathname.startsWith('/profile/'))
        return '/profile';
    return pathname;
}
export function preloadAppRoute(pathname) {
    const routeKey = getRouteKey(pathname);
    if (preloadedRoutes.has(routeKey))
        return;
    const loadRoute = routeLoaders[routeKey];
    if (!loadRoute)
        return;
    preloadedRoutes.add(routeKey);
    void loadRoute().catch(() => {
        preloadedRoutes.delete(routeKey);
    });
}
export function preloadCoreRoutes() {
    ['/browse', '/explore', '/search'].forEach(preloadAppRoute);
}
