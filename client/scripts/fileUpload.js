// === Page Display === //
const adminGrid = document.getElementById('adminGrid');
if (user) {

}

// === Get User Input === //
const systemInput = document.getElementById('systemInput');
const userInput = document.getElementById('userInput');
const assistantInput = document.getElementById('assistantInput');
const submitBtn = document.getElementById('fineTuningDataSubmitBtn');
submitBtn.addEventListener('click', submitNewFineTuningData);
document.addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
        submitNewFineTuningData();
    }
});

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
async function getTextFromAudio() {
    const res = await fetch(`/getTextFromAudio`, {
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
        console.log(data.content);
    } else if (data.type == 'success') {
        console.log(data.content);
    }
}