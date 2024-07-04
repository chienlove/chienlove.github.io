async function searchApp() {
    const appName = document.getElementById('appName').value;
    const resultDiv = document.getElementById('result');
    
    if (!appName) {
        resultDiv.innerHTML = "Please enter an app name";
        return;
    }

    resultDiv.innerHTML = "Searching...";

    try {
        const response = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(appName)}&entity=software&limit=1`);
        const data = await response.json();

        if (data.results.length > 0) {
            const app = data.results[0];
            resultDiv.innerHTML = `
                <h2>${app.trackName}</h2>
                <p>Version: ${app.version}</p>
                <p>Bundle ID: ${app.bundleId}</p>
                <img src="${app.artworkUrl100}" alt="${app.trackName} icon">
            `;
        } else {
            resultDiv.innerHTML = "No results found";
        }
    } catch (error) {
        resultDiv.innerHTML = "An error occurred while searching";
        console.error('Error:', error);
    }
}