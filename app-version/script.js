document.getElementById('appForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const appName = document.getElementById('appName').value;
    fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(appName)}&entity=software`)
        .then(response => response.json())
        .then(data => {
            const resultDiv = document.getElementById('result');
            resultDiv.innerHTML = ''; // Clear previous results
            if (data.results.length > 0) {
                const app = data.results[0];
                resultDiv.innerHTML = `
                    <p><strong>App Name:</strong> ${app.trackName}</p>
                    <p><strong>Version:</strong> ${app.version}</p>
                    <p><strong>Developer:</strong> ${app.sellerName}</p>
                `;
            } else {
                resultDiv.innerHTML = '<p>No app found with that name.</p>';
            }
        })
        .catch(error => {
            console.error('Error fetching data:', error);
        });
});