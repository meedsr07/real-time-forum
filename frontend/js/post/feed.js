import { ApiRequest } from "../api.js"
import { createReaction } from "./reactionPost.js"

export async function loadFeed() {
    const feed = document.getElementById("feed-container");
    if (!feed) return;

    document.querySelectorAll('.cat-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-cat') === 'all') {
            btn.classList.add('active');
        }
    });

    feed.innerHTML = "<p>Loading...</p>";
    try {
        const posts = await ApiRequest("/api/posts");

        if (!posts || posts.length === 0) {
            showEmpty();
            return;
        }

        renderPosts(posts);
    } catch (error) {
        console.error("Error loading feed:", error);
        feed.innerHTML = "<p>Error loading posts.</p>";
    }
}

export function showEmpty(category) {
    const feedContainer = document.getElementById("feed-container");

    feedContainer.innerHTML = "";

    const container = document.createElement("div");
    container.className = "empty-feed";

    const iconContainer = document.createElement("div");
    iconContainer.className = "empty-feed-icon";
    iconContainer.innerHTML = `
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
    `;

    const title = document.createElement("h2");
    title.textContent = category === "liked" ? "No Liked Posts Yet" : "No Posts Yet";

    const message = document.createElement("p");
    message.textContent = category === "liked"
        ? "Posts that you like will appear here once you react to them."
        : "Be the first to create a post and start a conversation in this category.";

    const createBtn = document.createElement("button");
    createBtn.className = "empty-feed-btn";
    createBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
        <span>Create First Post</span>
    `;
    if (category === "liked") {
        createBtn.style.display = "none";
    } else {
        createBtn.onclick = () => window.navigateTo ? window.navigateTo('/create-post') : null;
    }

    container.appendChild(iconContainer);
    container.appendChild(title);
    container.appendChild(message);
    container.appendChild(createBtn);

    feedContainer.appendChild(container);
}

export function renderPosts(posts) {
    const feedContainer = document.getElementById("feed-container");

    feedContainer.innerHTML = "";

    posts.forEach(post => {
        const postCard = createPostCard(post)
        postCard.addEventListener('click', () => {
            console.log('there is a click here:' , post.id)
            window.navigateTo(`/post/${post.id}`);
        })
        feedContainer.appendChild(postCard);
    });
}

export function renderHomeFeed(container) {
    if (container) container.innerHTML = '<div id="feed-container"></div>';
}

function createPostCard(post) {
    const article = document.createElement("article");
    article.className = "post-card";

    // Header
    const header = document.createElement("div");
    header.className = "post-header";

    const user = document.createElement("span");
    user.className = "post-user";
    user.textContent = post.nickname || post.Nickname || "Anonymous";

    const category = document.createElement("span");
    category.className = "post-category";
    category.textContent = post.categories ? post.categories.join(', ') : '';

    header.appendChild(user);
    header.appendChild(category);

    // Title
    const title = document.createElement("h2");
    title.className = "post-title";
    title.textContent = post.title;

    // Content
    const content = document.createElement("p");
    content.className = "post-content";
    content.textContent = post.content;

    // Footer
    const footer = document.createElement("div");
    footer.className = "post-footer";

    const date = document.createElement("span");
    date.textContent = formatDate(post.created_at);

    const comments = document.createElement("span");
    const count = post.comments_count || post.CommentsCount || 0;
    comments.textContent = `${count} ${count === 1 ? 'Comment' : 'Comments'}`;

    const reactionsUI = createReaction(post.id, post.likes || 0, post.dislikes || 0);

    footer.appendChild(date);
    footer.appendChild(comments);
    footer.appendChild(reactionsUI);

    // Build article
    article.appendChild(header);
    article.appendChild(title);
    article.appendChild(content);
    article.appendChild(footer);

    return article;
}

function formatDate(date) {
    return new Date(date).toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}