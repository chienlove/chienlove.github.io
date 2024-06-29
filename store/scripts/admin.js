document.getElementById('app-form').addEventListener('submit', function(event) {
    event.preventDefault();

    const title = document.getElementById('title').value;
    const image = document.getElementById('image').value;
    const description = document.getElementById('description').value;
    const developer = document.getElementById('developer').value;
    const iosVersion = document.getElementById('iosVersion').value;
    const appVersion = document.getElementById('appVersion').value;
    const downloadLink = document.getElementById('downloadLink').value;
    const category = document.getElementById('category').value;

    const newApp = {
        title,
        image,
        description,
        developer,
        iosVersion,
        appVersion,
        downloadLink,
        category
    };

    fetch('posts.json')
        .then(response => response.json())
        .then(data => {
            data.push(newApp);

            return fetch('posts.json', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });
        })
        .then(() => {
            alert('App added successfully!');
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Failed to add app.');
        });
});