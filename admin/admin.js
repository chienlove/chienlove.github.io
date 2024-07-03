// Kiểm tra CMS initialization
if (window.CMS) {
    addDebug('CMS object found');
    CMS.registerEventListener({
        name: 'preSave',
        handler: () => {
            addDebug('CMS preSave event fired');
        },
    });

    CMS.registerEventListener({
        name: 'onInit',
        handler: () => {
            addDebug('CMS initialized');
            document.getElementById('custom-admin').style.display = 'block';
        },
    });
} else {
    addDebug('CMS object not found');
}

// Kiểm tra xác thực
if (window.netlifyIdentity) {
    netlifyIdentity.on('init', user => {
        addDebug(user ? 'User is logged in' : 'User is not logged in');
    });
} else {
    addDebug('Netlify Identity not found');
}

// Kiểm tra config.yml
fetch('/admin/config.yml')
    .then(response => response.text())
    .then(text => {
        addDebug('config.yml loaded successfully');
    })
    .catch(error => {
        addDebug('Error loading config.yml: ' + error);
    });
