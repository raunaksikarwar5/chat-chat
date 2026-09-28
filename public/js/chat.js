const joinForm = document.getElementById('join-form');
const roomTitle = document.getElementById('room-title');
const usernameInput = document.getElementById('username');
const roomInput = document.getElementById('room');
const messagesBox = document.getElementById('messages');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const usersBox = document.getElementById('users');
const typingIndicator = document.getElementById('typing-indicator');
const onlineCount = document.getElementById('online-count');

const socket = io();

let currentUsername = 'Ava';
let currentRoom = 'Our love room';
let typingTimer = null;

function setTypingState(label) {
  typingIndicator.textContent = label;
}

function renderUsers(users) {
  usersBox.innerHTML = '';

  if (!users.length) {
    const empty = document.createElement('li');
    empty.textContent = 'No one else online';
    empty.style.color = '#745e78';
    usersBox.appendChild(empty);
    onlineCount.textContent = '0';
    return;
  }

  users.forEach((user) => {
    const item = document.createElement('li');
    item.innerHTML = `<span class="user-dot"></span><span>${user}</span>`;
    usersBox.appendChild(item);
  });

  onlineCount.textContent = String(users.length);
}

function appendMessage(message, isSelf = false) {
  const wrapper = document.createElement('div');
  wrapper.className = `message ${isSelf ? 'self' : ''}`;

  const header = document.createElement('div');
  header.className = 'message-header';
  header.innerHTML = `<span>${message.username}</span><span>${new Date(message.sentAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>`;

  const text = document.createElement('p');
  text.textContent = message.text;

  wrapper.appendChild(header);
  wrapper.appendChild(text);
  messagesBox.appendChild(wrapper);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

function appendSystemMessage(text) {
  const item = document.createElement('div');
  item.className = 'system-message';
  item.textContent = text;
  messagesBox.appendChild(item);
  messagesBox.scrollTop = messagesBox.scrollHeight;
}

joinForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const username = usernameInput.value.trim() || 'Lovebird';
  const room = roomInput.value.trim() || 'Our love room';

  currentUsername = username;
  currentRoom = room;
  roomTitle.textContent = room;

  socket.emit('join_room', { username, room });
  setTypingState('You are in the room.');
  messageInput.focus();
});

messageForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('send_message', text);
  messageInput.value = '';
  socket.emit('typing', false);
  setTypingState('');
});

messageInput.addEventListener('input', () => {
  const hasText = messageInput.value.trim().length > 0;
  socket.emit('typing', hasText);

  if (typingTimer) {
    clearTimeout(typingTimer);
  }

  typingTimer = setTimeout(() => {
    socket.emit('typing', false);
    setTypingState('');
  }, 1200);
});

socket.on('chat_history', (messages = []) => {
  messagesBox.innerHTML = '';

  messages.forEach((message) => {
    appendMessage(message, message.username === currentUsername);
  });
});

socket.on('welcome_message', (message) => {
  appendSystemMessage(message);
});

socket.on('receive_message', (message) => {
  appendMessage(message, message.username === currentUsername);
});

socket.on('room_users', (users) => {
  renderUsers(users);
});

socket.on('presence', ({ type, username }) => {
  const action = type === 'join' ? 'joined the room' : 'left the room';
  appendSystemMessage(`${username} ${action}.`);
});

socket.on('typing_status', ({ username, typing }) => {
  if (!typing) {
    setTypingState('');
    return;
  }

  setTypingState(`${username} is typing…`);
});

renderUsers([]);
setTypingState('Join the room to start chatting.');
