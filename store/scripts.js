document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('post-form');
    const postsSection = document.getElementById('posts');

    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const title = document.getElementById('title').value;
        const image = document.getElementById('image').value;
        const description = document.getElementById('description').value;
        const developer = document.getElementById('developer').value;
        const iosVersion = document.getElementById('ios_version').value;

        const newPost = {
            title,
            image,
            description,
            developer,
            ios_version: iosVersion
        };

        const response = await fetch('posts.json');
        const posts = await response.json();

        posts.push(newPost);

        await fetch('posts.json', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(posts)
        });

        displayPosts(posts);
    });

    const displayPosts = (posts) => {
        postsSection.innerHTML = '';
        posts.forEach(post => {
            const article = document.createElement('article');
            article.innerHTML = `
                <h2>${post.title}</h2>
                <img src="${post.image}" alt="${post.title}">
                <p>${post.description}</p>
                <p><strong>Developer:</strong> ${post.developer}</p>
                <p><strong>iOS Version Compatibility:</strong> ${post.ios_version}</p>
            `;
            postsSection.appendChild(article);
        });
    };

    const loadPosts = async () => {
        const response = await fetch('posts.json');
        const posts = await response.json();
        displayPosts(posts);
    };

    loadPosts();
});