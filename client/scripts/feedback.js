// === Page Display === //
const feedbackGrid = document.getElementById('feedbackGrid');
if (user) {
    displayFeedback();
}

// === Get User Input === //
const systemInput = document.getElementById('systemInput');
const userInput = document.getElementById('userInput');
const assistantInput = document.getElementById('assistantInput');
const submitBtn = document.getElementById('fineTuningDataSubmitBtn');
submitBtn.addEventListener('click', submitNewFineTuningData);

// === Server Communication === //
async function submitNewFineTuningData() {
    const res = await fetch(`/newFineTuningData`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            token: user.token,
            systemInput: systemInput.value,
            userInput: userInput.value,
            assistantInput: assistantInput.value
        })
    });

    const data = await res.json();
    if (data.type == 'error') {
        console.log(data.content);
    } else if (data.type == 'success') {
        console.log(data.content);
    }
}
async function displayFeedback() {
    const data = await getCurrentFeedback();
    const gridHeaders = document.getElementById('feedbackGridRowFixed').cloneNode(true);
    feedbackGrid.innerHTML = null;
    feedbackGrid.appendChild(gridHeaders);
    data.forEach(message => {
        const row = document.createElement('div');
        row.classList.add('feedbackGridRow');
        feedbackGrid.appendChild(row);

        Object.entries(message).forEach(([key, value]) => {
            if (key != 'user_id') {
                const col = document.createElement('p');
                col.innerText = value;
                row.appendChild(col);
            }
        });
    });
}
async function getCurrentFeedback() {
    const res = await fetch(`/getFeedback`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            token: user.token
        })
    });

    const data = await res.json();
    if (data.type == 'error') {
        console.log(data.message);
    } else if (data.type == 'success') {
        return data.content;
    }
}