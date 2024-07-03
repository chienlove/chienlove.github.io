document.addEventListener('DOMContentLoaded', () => {
    addDebug('DOM content loaded');

    const customAdminDiv = document.getElementById('custom-admin');
    const loginButton = document.getElementById('custom-login-button');
    const contentArea = document.getElementById('content-area');
    const postForm = document.getElementById('post-form');
    const postsList = document.getElementById('posts');

    function showLoginButton() {
        customAdminDiv.style.display = 'block';
        loginButton.style.display = 'block';
        contentArea.style.display = 'none';
    }

    function showAdminContent() {
        customAdminDiv.style.display = 'block';
        loginButton.style.display = 'none';
        contentArea.style.display = 'block';
        loadPosts();
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

    postForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const title = document.getElementById('post-title').value;
        const content = document.getElementById('post-content').value;
        
        try {
            await createPost(title, content);
            addDebug('Post created successfully');
            postForm.reset();
            loadPosts();
        } catch (error) {
            addDebug('Error creating post: ' + error.message);
        }
    });

    async function createPost(title, content) {
        const response = await fetch('/.netlify/functions/create-post', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ title, content }),
        });

        if (!response.ok) {
            throw new Error('Failed to create post');
        }

        return response.json();
    }

    async function loadPosts() {
        try {
            const response = await fetch('/.netlify/functions/get-posts');
            const posts = await response.json();
            
            postsList.innerHTML = '';
            posts.forEach(post => {
                const li = document.createElement('li');
                li.textContent = post.title;
                postsList.appendChild(li);
            });
        } catch (error) {
            addDebug('Error loading posts: ' + error.message);
        }
    }

    if (window.CMS) {
        addDebug('CMS object found');
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