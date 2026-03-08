let config = {};

async function init() {
    config = await window.api.readConfig();
    document.getElementById('companyName').textContent = config.companyName || 'Staff Manager';
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('errorMsg');
    
    if (!config.adminPassword) {
        // No password set, allow access
        await window.api.createSession();
        location.href = 'index.html';
        return;
    }
    
    const isValid = await window.api.comparePassword(password, config.adminPassword);
    
    if (isValid) {
        await window.api.createSession();
        errorMsg.style.display = 'none';
        location.href = 'index.html';
    } else {
        errorMsg.textContent = '❌ Incorrect password. Please try again.';
        errorMsg.style.display = 'block';
        document.getElementById('password').value = '';
        document.getElementById('password').focus();
    }
});

init();
