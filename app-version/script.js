document.getElementById('appForm').addEventListener('submit', function(event) {
    event.preventDefault();
    const appName = document.getElementById('appName').value.trim();
    if (appName) {
        fetchAppVersions(appName);
    }
});

function fetchAppVersions(appName) {
    const url = `https://appstore.bilin.eu.org/search?term=${encodeURIComponent(appName)}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.results.length > 0) {
                const app = data.results[0];
                const appId = app.trackId;
                const appName = app.trackName;
                const appIcon = app.artworkUrl100;
                const appLink = app.trackViewUrl;
                fetchAppDetails(appId, appName, appIcon, appLink);
            } else {
                document.getElementById('result').innerText = 'No app found.';
            }
        })
        .catch(error => {
            console.error('Error fetching app data:', error);
            document.getElementById('result').innerText = 'Error fetching app data.';
        });
}

function fetchAppDetails(appId, appName, appIcon, appLink) {
    const url = `https://appstore.bilin.eu.org/lookup?id=${appId}`;

    fetch(url)
        .then(response => response.json())
        .then(data => {
            if (data.results.length > 0) {
                const versions = data.results[0].versionHistory.map(version => version.versionId);
                displayVersions(appName, appIcon, appLink, versions);
            } else {
                document.getElementById('result').innerText = 'No versions found.';
            }
        })
        .catch(error => {
            console.error('Error fetching app details:', error);
            document.getElementById('result').innerText = 'Error fetching app details.';
        });
}

function displayVersions(appName, appIcon, appLink, versions) {
    const resultDiv = document.getElementById('result');
    resultDiv.innerHTML = '';

    const appInfo = document.createElement('div');
    appInfo.classList.add('app-info');

    const appImage = document.createElement('img');
    appImage.src = appIcon;
    appImage.alt = `${appName} icon`;

    const appNameLink = document.createElement('a');
    appNameLink.href = appLink;
    appNameLink.target = '_blank';
    appNameLink.innerText = appName;

    appInfo.appendChild(appImage);
    appInfo.appendChild(appNameLink);
    resultDiv.appendChild(appInfo);

    if (versions.length > 0) {
        const ul = document.createElement('ul');
        versions.forEach(versionId => {
            const li = document.createElement('li');
            li.innerText = versionId;
            ul.appendChild(li);
        });
        resultDiv.appendChild(ul);
    } else {
        resultDiv.innerText = 'No versions found.';
    }
}