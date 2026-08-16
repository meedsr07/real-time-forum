import { sendWebSocketMessage } from "../websocket.js";
import { loadUsers, moveUserToTop, showChatNotification } from "./onlineUsers.js";
import { addThrottledScrollListener } from "./chatHelpers.js";
import {
    appendMessage,
    loadMessages,
    loadMoreMessages,
    messagesContainer,
    resetMessages,
    senderNickname,
} from "./messages.js";
import { handleTyping, handleStopTyping } from "./typingIndicator.js";

const THROTTLE_MS = 300;
const chatForm = document.getElementById("chat-input-box");
const chatInput = document.getElementById("sidebar-chat-input");


// Sidebar controls (called from the HTML)
export function toggleChatSidebar() {
    const layout = document.getElementById("contentLayout");
    const closing = layout.classList.contains("chat-active");

    layout.classList.toggle("chat-active");
    if (!closing) {
        switchChatView("users");
        loadUsers();
    } else {
        window.currentChatUser = null;
    }
}
window.toggleChatSidebar = toggleChatSidebar;


export function switchChatView(view) {
    const usersView = document.getElementById("chat-view-users");
    const convView = document.getElementById("chat-view-conversation");

    usersView.classList.toggle("hidden", view !== "users");
    convView.classList.toggle("hidden", view !== "conversation");

    if (view === "users") {
        window.currentChatUser = null;
    }
}
window.switchChatView = switchChatView;

// Open a conversation with a user
export function openChat(userId, nickname) {
    window.currentChatUser = userId;

    document.getElementById("active-chat-username").textContent = nickname;
    document.getElementById("sidebar-receiver-id").value = userId;
    switchChatView("conversation");
    resetMessages();
    loadMessages();
    chatInput?.focus();
}
window.openChat = openChat;

export function sendMessage(event) {
    event.preventDefault();
    if (!window.currentChatUser) return;

    const content = chatInput.value.trim();
    if (!content) return;
    if (content.length > 1000) {
        return;
    }

    sendWebSocketMessage(window.currentChatUser, content);

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");

    const optimistic = {
        senderId: currentUser.id,
        receiverId: window.currentChatUser,
        content,
        createdAt: new Date().toISOString(),
    };
    appendMessage(optimistic);
    moveUserToTop(window.currentChatUser, optimistic);

    chatInput.value = "";
    handleStopTyping(window.currentChatUser);
}

// Handle a new real-time message received over the WebSocket
export function updateChatMessages(message) {
    moveUserToTop(message.senderId, message);
    const layout = document.getElementById("contentLayout");
    const isSidebarOpen = layout ? layout.classList.contains("chat-active") : false;
    const convView = document.getElementById("chat-view-conversation");
    const isConvOpen = convView ? !convView.classList.contains("hidden") : false;

    // Only append silently if sidebar is open AND conversation view is active for this sender
    if (isSidebarOpen && isConvOpen && message.senderId === window.currentChatUser) {
        appendMessage(message);
        return;
    }
    const currentUser = JSON.parse(
        localStorage.getItem("currentUser") || "{}"
    );

    if (message.senderId === currentUser.id) {
        return
    }

    const nickname = senderNickname(message.senderId);
    showChatNotification(`New message from ${nickname}`);
}


if (chatForm) {
    chatForm.addEventListener("submit", sendMessage);
}

if (chatInput) {
    chatInput.addEventListener("input", () => {
        handleTyping(window.currentChatUser);
    });
    chatInput.addEventListener("focus", () => {
        if (chatInput.value.trim().length > 0) {
            handleTyping(window.currentChatUser);
        }
    });
    chatInput.addEventListener("blur", () => {
        handleStopTyping(window.currentChatUser);
    });
}

if (messagesContainer) {
    addThrottledScrollListener(messagesContainer, THROTTLE_MS, () => {
        if (messagesContainer.scrollTop <= 40) {
            loadMoreMessages();
        }
    });
}

