// === Client Variables === //
let user = JSON.parse(window.localStorage.getItem('user'));


// === Token Expiry === //
if (user) {
    const parsedToken = JSON.parse(atob(user.token.split('.')[1]));
    if (Date.now() > parsedToken.exp * 1000) {
        console.log('User Expired');
        window.localStorage.removeItem('user');
        location.reload();
    }
} else if (window.location.pathname != '/login' && window.location.pathname != '/register') {
    window.location.replace("/login");
}


// === Client Functions === //
function signOut() {
    localStorage.removeItem('user');
    location.reload();
}

// === Update Navbar === //
const forumLink = document.getElementById('forumPageLink');
const accountLink = document.getElementById('accountPageLink');
const signOutLink = document.getElementById('signOutPageLink');
const loginLink = document.getElementById('loginPageLink');
const registerLink = document.getElementById('registerPageLink');
const feedbackLink = document.getElementById('feedbackPageLink');
const adminLink = document.getElementById('adminPageLink');
const fileUploadLink = document.getElementById('fileUploadPageLink');
if (user) {
    if (!user.isAdmin) {
        feedbackLink.remove()
        fileUploadLink.remove();
        adminLink.remove()
    };
    loginLink.remove();
    registerLink.remove();
} else {
    forumLink.remove();
    feedbackLink.remove()
    adminLink.remove();
    fileUploadLink.remove();
    accountLink.remove();
    signOutLink.remove();
}