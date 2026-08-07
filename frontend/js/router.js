import { LoginView } from '/js/auth/login.js';
import { RegisterView } from '/js/auth/register.js';
import { loadFeed, renderHomeFeed } from '/js/post/feed.js';
import { CreatePostView } from '/js/post/createPost.js';
import { loadPostCard } from '/js/post/postDetails.js';
import { updateAuthUI } from '/js/compenents/navbar.js';
import { ErrorPageView } from '/js/errorPage.js';
// import { ChatView } from '/js/chat/chat.js';

const routes = {
    '/': () => {
        const dom = document.createElement('div');
        renderHomeFeed(dom);
        return { dom, logic: loadFeed };
    },
    '/login': LoginView,
    '/register': RegisterView,
    '/create-post': CreatePostView,
    // '/messages': ChatView,
    '/404': ErrorPageView,
};

// Validate session with server, fallback to localStorage if offline
async function checkSession() {
    try {
        const res = await fetch('/api/session');
        if (res.status === 401) {
            localStorage.removeItem('isAuthenticated');
            localStorage.removeItem('currentUser');
            return false;
        }
        if (!res.ok) throw new Error();
        const { user } = await res.json();
        localStorage.setItem('isAuthenticated', 'true');
        if (user) localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
    } catch {
        // Network error — trust cached auth state
        const wasAuthed = localStorage.getItem('isAuthenticated') === 'true';
        if (!wasAuthed) { localStorage.removeItem('isAuthenticated'); localStorage.removeItem('currentUser'); }
        return wasAuthed;
    } finally {
        updateAuthUI();
    }
}

export async function navigateTo(path) {
    window.history.pushState(null, '', path);
    await render(path);
}
window.navigateTo = navigateTo;

async function render(path) {
    const isAuthPage = path === '/login' || path === '/register';
    const authed = await checkSession();

    if (!authed && !isAuthPage) return navigateTo('/login');
    if (authed && isAuthPage) return navigateTo('/');

    const hide = isAuthPage ? 'none' : '';
    document.querySelector('.sidebar')?.style.setProperty('display', hide);
    document.getElementById('chatSidebar')?.style.setProperty('display', hide);
    document.querySelector('.navbar')?.style.setProperty('display', hide);
    if (isAuthPage) document.getElementById('contentLayout')?.classList.remove('chat-active');

    // Auth pages need full width — reset margin/padding overrides
    const main = document.querySelector('.main');
    if (main) { main.style.marginLeft = hide ? '0' : ''; main.style.width = hide ? '100%' : ''; }

    const app = document.getElementById('app');
    if (!app) return;
    if (isAuthPage) { app.style.padding = '0'; app.style.maxWidth = 'none'; }
    else { app.style.padding = ''; app.style.maxWidth = ''; }

    if (path.startsWith('/post/')) {
        const id = Number(path.split('/')[2]);
        if (id) {
            app.innerHTML = '<div id="feed-container"></div>'
            return loadPostCard(id);
        }
    }

    // Match route or fallback to 404
    const route = routes[path] || ErrorPageView;
    const view = route();
    app.innerHTML = '';
    app.appendChild(view.dom);
    view.logic?.();
}

export function initRouter() {
    // Browser back/forward buttons
    window.addEventListener('popstate', () => render(location.pathname));

    // Intercept internal <a> clicks for SPA navigation
    document.body.addEventListener('click', (e) => {
        const a = e.target.closest('a[href]');
        if (!a || a.origin !== location.origin) return;
        e.preventDefault();
        navigateTo(a.pathname + a.search + a.hash);
    });

    render(location.pathname);
}
