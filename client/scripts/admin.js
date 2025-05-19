// === Page Display === //
const adminGrid = document.getElementById('adminGrid');
if (user) {
    displayFineTuningData();
}

// === Get User Input === //
const systemInput = document.getElementById('systemInput');
const userInput = document.getElementById('userInput');
const assistantInput = document.getElementById('assistantInput');
const submitBtn = document.getElementById('fineTuningDataSubmitBtn');
const newModelBtn = document.getElementById('newModelBtn');
submitBtn.addEventListener('click', submitNewFineTuningData);
newModelBtn.addEventListener('click', newFineTunedModel);

// === Server Communication === //
async function displayFineTuningData() {
    const data = await getCurrentFineTuningData();
    const gridHeaders = document.getElementById('adminGridRowFixed').cloneNode(true);
    adminGrid.innerHTML = null;
    adminGrid.appendChild(gridHeaders);
    data.forEach(message => {
        const row = document.createElement('div');
        row.classList.add('adminGridRow');
        adminGrid.appendChild(row);

        Object.entries(message).forEach(([key, value]) => {
            if (key != 'user_id') {
                const col = document.createElement('p');
                col.innerText = value;
                row.appendChild(col);
            }
        });
        const colBtn = document.createElement('button');
        colBtn.innerText = 'Edit';
        colBtn.onclick = () => editFineTuningData(colBtn.parentElement);
        row.appendChild(colBtn);
    });
}
async function getCurrentFineTuningData() {
    const res = await fetch(`/getFineTuningData`, {
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
        displayFineTuningData();
    }
}
async function editFineTuningData(row) {
    const rowElements = Array.from(row.children);
    const systemContent = prompt('Edit System Content:', rowElements[1].innerText);
    const userContent = prompt('Edit System Content:', rowElements[2].innerText);
    const assistantContent = prompt('Edit System Content:', rowElements[3].innerText);
    const res = await fetch(`/editFineTuningData`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            token: user.token,
            dataId: rowElements[0].innerText,
            systemInput: systemContent,
            userInput: userContent,
            assistantInput: assistantContent,
            date: rowElements[4].innerText
        })
    });

    const data = await res.json();
    if (data.type == 'error') {
        console.log(data.content);
    } else if (data.type == 'success') {
        console.log(data.content);
    }
    displayFineTuningData();
}
async function newFineTunedModel() {
    const res = await fetch(`/newFineTunedModel`, {
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