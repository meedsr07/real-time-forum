import { sendWebSocketMessage } from "../websocket.js";
import { loadUsers, updateLastMessage, showNotification, clearNotification } from "./onlineUsers.js";
import { addThrottledScrollListener, autoScroll, isNearBottom, showMessageToast } from "./chatHelpers.js";
import {
    appendMessage,
    loadMessages,
    loadMoreMessages,
    messagesContainer,
    queueLiveMessage,
    removeEmptyMessage,
    renderMessages,
    resetMessages,
    senderNickname,
} from "./messages.js";

const THROTTLE_MS = 300;
const chatForm = document.getElementById("sidebar-chat-form");
const chatInput = document.getElementById("sidebar-chat-input");



// this function is to open and close the chat sidbar
export function toggleChatSidebar() {
    const layout = document.getElementById("contentLayout");
    const opening = layout.classList.contains("chat-active");

    layout.classList.toggle("chat-active");
    if (!opening) {
        switchChatView("users");
        loadUsers();
    }
}
window.toggleChatSidebar = toggleChatSidebar;

// switch view of sidbar userslist or conversation
export function switchChatView(view) {
    const usersView = document.getElementById("chat-view-users");
    const convView = document.getElementById("chat-view-conversation");

    usersView.classList.toggle("hidden", view !== "users");
    convView.classList.toggle("hidden", view !== "conversation");
}
window.switchChatView = switchChatView;

export function openChat(userId, nickname) {
    
    window.currentChatUser = userId;

    document.getElementById("active-chat-username").textContent = nickname;
    document.getElementById("sidebar-receiver-id").value = userId;

    clearNotification(userId);
    switchChatView("conversation");
    resetMessages();
    loadMessages();
    chatInput?.focus();
}
window.openChat = openChat;

// Send a private message through the WebSocket
export function sendMessage(event) {
    event.preventDefault();
    if (!window.currentChatUser) return;

    const content = chatInput.value.trim();
    if (!content) return;

    sendWebSocketMessage(window.currentChatUser, content);

    const currentUser = JSON.parse(localStorage.getItem("currentUser") || "{}");
    const optimistic = {
        senderId: currentUser.id,
        receiverId: window.currentChatUser,
        content,
        createdAt: new Date().toISOString(),
    };
    removeEmptyMessage();
    appendMessage(optimistic);
    updateLastMessage(window.currentChatUser, optimistic);

    chatInput.value = "";
    autoScroll(messagesContainer);
}

// Handle a new real-time message received over the WebSocket
export function updateChatMessages(message) {
    if (!message || message.type !== "message") return;

    updateLastMessage(message.senderId, message);

    if (message.senderId === window.currentChatUser) {
        if (queueLiveMessage(message)) return;

        removeEmptyMessage();
        appendMessage(message);
        if (isNearBottom(messagesContainer)) autoScroll(messagesContainer);
        clearNotification(message.senderId);
        return;
    }

    showNotification(message);
    const nickname = senderNickname(message.senderId);
    showMessageToast(message, nickname, () => openChat(message.senderId, nickname));
}



if (chatForm) {
    chatForm.addEventListener("submit", sendMessage);
}

if (messagesContainer) {
    addThrottledScrollListener(messagesContainer, THROTTLE_MS, () => {
        if (messagesContainer.scrollTop <= 40) {
            loadMoreMessages();
        }
    });
}

