// === Page Display === ///
const scrollZone = document.getElementById('scrollZone');
let thread = 1;
if (user) {
    displayForum();
}

// === Get User Prompt Input === //
let userInput = '';
const textInput = document.getElementById('textInput');
textInput.addEventListener('keydown', async (event) => {
    if (event.key == 'Enter' && userInput == '') {
        // Disable Input
        userInput = textInput.value;
        textInput.readOnly = true;
        textInput.value = null;

        // Display User Prompt
        const messagePromptHTML = document.createElement('div');
        messagePromptHTML.classList.add('message');
        messagePromptHTML.innerText = userInput;
        scrollZone.insertBefore(messagePromptHTML, scrollZone.firstChild);

        const messageWaitingDots = document.createElement('div');
        messageWaitingDots.classList.add('message');
        messageWaitingDots.innerText = '. . .';
        messageWaitingDots.style.backgroundColor = 'rgb(237, 237, 237)';
        scrollZone.insertBefore(messageWaitingDots, scrollZone.firstChild);

        scrollZone.scrollTop = scrollZone.scrollHeight;

        // Request and Display GPT's Answer
        await newMessage(userInput);
        await displayForum();
        userInput = '';
        textInput.readOnly = false;
    }
});

function threadLink(threadNum) {
    thread = threadNum;
    displayForum();
}

async function sendFeedback(dataId) {
    const feedback = prompt('Send Feedback:');
    const res = await fetch(`/sendFeedback`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            token: user.token,
            dataId: dataId,
            feedback: feedback
        })
    });

    // Return the data
    const data = await res.json();
    if (data.type == 'error') {
        return data.message;
    }
}

async function displayForum() {
    const chatHistory = await getMessages();
    scrollZone.innerHTML = null;
    chatHistory.forEach(message => {
        const messagePromptHTML = document.createElement('div');
        messagePromptHTML.classList.add('message');
        messagePromptHTML.innerText = message.prompt;
        scrollZone.insertBefore(messagePromptHTML, scrollZone.firstChild);

        const messageResponseHTML = document.createElement('div');
        messageResponseHTML.classList.add('message');
        messageResponseHTML.innerText = message.response;
        messageResponseHTML.style.backgroundColor = 'rgb(237, 237, 237)';
        scrollZone.insertBefore(messageResponseHTML, scrollZone.firstChild);

        const feedbackImg = document.createElement('img');
        feedbackImg.src = "../assets/feedbackIcon.webp";
        feedbackImg.alt = 'Feedback Button';
        messageResponseHTML.setAttribute('dataId', message.data_id);
        messageResponseHTML.appendChild(feedbackImg);
        feedbackImg.onclick = () => sendFeedback(message.data_id);

        scrollZone.scrollTop = scrollZone.scrollHeight;
    });
}

async function getMessages() {
    // Request the list of all messages stored based on user and thread
    const res = await fetch(`/forum`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            token: user.token,
            thread: thread
        })
    });

    // Return the data
    const data = await res.json();
    if (data.type == 'error') {
        return [];
    } else if (data.type == 'success') {
        return data.content;
    }
}

async function newMessage(prompt) {
    const res = await fetch(`/newMessage`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            token: user.token,
            userPrompt: prompt,
            thread: thread
        })
    });

    const data = await res.json();
    if (data.type == 'error') {
        console.log(data.message);
    } else if (data.type == 'success') {
        console.log(data.content);
    }
}