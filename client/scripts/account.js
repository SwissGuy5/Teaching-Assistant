// === Page Display === //
const accountDiv = document.getElementById('viewAccount');
const emailDisplay = document.getElementById('displayEmail');
const classCodeDisplay = document.getElementById('displayClassCode');
const modelDisplay = document.getElementById('displayModel');
if (user) {
    displayUserData();
}

// === Server Communication === //
async function displayUserData() {
    const data = await getUserData();
    console.log(data, data[1]);
    emailDisplay.innerText = `Email: ${data[0].email}`;
    classCodeDisplay.innerText = `Class Code: ${data[0].class_code}`;
    let modelName = data[1].length != 0 ? data[1][0].model_name : 'gpt-3.5-turbo-0613';
    modelDisplay.innerText = `Model: ${modelName}`;
}
async function getUserData() {
    const res = await fetch(`/getUserData`, {
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