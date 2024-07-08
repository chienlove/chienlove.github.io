async function searchApp() {
    const query = document.getElementById('searchInput').value;
    const resultsDiv = document.getElementById('results');
    resultsDiv.innerHTML = '';

    if (!query) {
        resultsDiv.innerHTML = 'Please enter an app name or ID.';
        return;
    }

    try {
        const response = await fetch(`https://api.sharklatan.com/search?query=${encodeURIComponent(query)}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('API Response:', data); // Log the response for debugging

        if (data.results && data.results.length > 0) {
            data.results.forEach(app => {
                const appDiv = document.createElement('div');
                appDiv.classList.add('app');
                appDiv.innerHTML = `
                    <h3>${app.name}</h3>
                    <p>Version ID: ${app.version_id}</p>
                `;
                resultsDiv.appendChild(appDiv);
            });
        } else {
            resultsDiv.innerHTML = 'No results found.';
        }
    } catch (error) {
        console.error('Error fetching app data:', error);
        resultsDiv.innerHTML = `Error fetching app data: ${error.message}`;
    }
}