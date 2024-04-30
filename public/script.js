function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value;
    input.value = '';

    if (message.trim() === '') return;

    appendMessage(`You: ${message}`, 'right');

    fetch('/send-message', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: message})
    })
    .then(response => response.json())
    .then(data => {
        appendMessage(`AI: ${data.reply}`, 'left');
    })
    .catch(error => console.error('Error:', error));
}

function appendMessage(message, side) {
    const chatWindow = document.getElementById('chat-window');
    const messageElement = document.createElement('div');
    messageElement.textContent = message;
    messageElement.style.textAlign = side;
    chatWindow.appendChild(messageElement);
}