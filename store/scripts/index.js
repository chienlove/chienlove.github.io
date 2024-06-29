fetch('posts.json')
    .then(response => response.json())
    .then(data => {
        const appList = document.getElementById('app-list');
        data.forEach(app => {
            const li = document.createElement('li');
            li.innerHTML = `
                <img src="${app.image}" alt="${app.title}">
                <strong>${app.title}</strong><br>
                ${app.description}<br>
                Developer: ${app.developer}<br>
                iOS Version: ${app.iosVersion}<br>
                Version: ${app.appVersion}<br>
                <a href="${app.downloadLink}">Download</a><br>
                Category: ${app.category}
            `;
            appList.appendChild(li);
        });
    });