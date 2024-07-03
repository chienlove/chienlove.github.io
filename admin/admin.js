document.addEventListener('DOMContentLoaded', () => {
    addDebug('DOM content loaded');

    const customAdminDiv = document.getElementById('custom-admin');
    const loginButton = document.getElementById('custom-login-button');
    const contentArea = document.getElementById('content-area');

    function showLoginButton() {
        customAdminDiv.style.display = 'block';
        loginButton.style.display = 'block';
        contentArea.style.display = 'none';
    }

    function showAdminContent() {
        customAdminDiv.style.display = 'block';
        loginButton.style.display = 'none';
        contentArea.style.display = 'block';
    }

    if (window.netlifyIdentity) {
        netlifyIdentity.on('init', user => {
            addDebug(user ? 'User is logged in' : 'User is not logged in');
            if (user) {
                showAdminContent();
            } else {
                showLoginButton();
            }
        });

        loginButton.addEventListener('click', () => {
            netlifyIdentity.open();
        });

        netlifyIdentity.on('login', () => {
            addDebug('User logged in');
            showAdminContent();
        });

        netlifyIdentity.on('logout', () => {
            addDebug('User logged out');
            showLoginButton();
        });
    } else {
        addDebug('Netlify Identity not found');
    }

    // Kiểm tra CMS initialization
    addDebug('Checking CMS initialization...');
    if (window.CMS) {
        addDebug('CMS object found');
        addDebug('Registering CMS event listener');
        CMS.registerEventListener({
            name: 'preSave',
            handler: () => {
                addDebug('CMS preSave event fired');
            },
        });
    } else {
        addDebug('CMS object not found');
    }
});

addDebug('admin.js loaded');