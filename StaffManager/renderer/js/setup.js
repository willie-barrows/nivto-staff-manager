const pwdFields = document.getElementById('pwdFields');
const enablePwd = document.getElementById('enablePassword');

enablePwd.addEventListener('change', () => {
    pwdFields.style.display = enablePwd.checked ? 'block' : 'none';
});

window.saveSetup = async function() {
    console.log('saveSetup called');
    try {
        const config = {
            companyName: document.getElementById('companyName').value,
            address: document.getElementById('address').value,
            contact: document.getElementById('contact').value,
            adminPassword: null
        };
        console.log('Config:', config);
        if(enablePwd.checked){
            const pwd = document.getElementById('password').value;
            const confirm = document.getElementById('confirmPassword').value;
            if(pwd !== confirm){ alert('Passwords do not match'); return; }
            config.adminPassword = await window.api.hashPassword(pwd);
        }
        await window.api.writeConfig(config);
        await window.api.createSession(); // Create session after setup
        console.log('Config written');
        location.href = 'index.html';
    } catch(err) {
        console.error('Error in saveSetup:', err);
        alert('Error: ' + err.message);
    }
}