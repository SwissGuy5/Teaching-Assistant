// === Login Input === //
const container = document.getElementById('loginFormContainer');
const emailInput = document.getElementById('emailInput');
const passwordInput = document.getElementById('passwordInput');
const classCodeInput = document.getElementById('classCodeInput');
const loginBtn = document.getElementById('loginBtn');
const textInput = document.getElementById('textInput');
let errorMessageDisplay = null;
loginBtn.addEventListener('click', () => checkAuthentication());
document.addEventListener('keydown', (event) => {
    if (event.key == 'Enter') {
        checkAuthentication();
    }
});

// === Server Communication === //
async function checkAuthentication() {
    let classCode = null;
    classCodeInput != null ? classCode = classCodeInput.value : null;
    const res = await fetch(`/${loginBtn.innerText.toLowerCase()}`, {
        method: 'POST',
        headers: {
            'content-type': 'application/json'
        },
        body: JSON.stringify({
            email: emailInput.value,
            password: passwordInput.value,
            classCode: classCode
        })
    });
    
    const data = await res.json();
    if (data.type == 'error') {
        if (errorMessageDisplay) errorMessageDisplay.remove();
        errorMessageDisplay = document.createElement('p');
        errorMessageDisplay.innerText = `Error: ${data.message}`;
        errorMessageDisplay.style.color = 'red';
        container.insertBefore(errorMessageDisplay, container.childNodes[container.childNodes.length - 2]);
    } else if (data.type == 'user') {
        const user = data.content;
        window.localStorage.setItem('user', JSON.stringify(user));
        window.location.replace("/");
    }
}