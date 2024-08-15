const CLIENT_ID = 'Ov23lixtCFiQYWFH232n'; // replace with your actual client ID
const REDIRECT_URI = 'https://storeios.net/.netlify/functions/callback'; // replace with your actual redirect URI
const CHUNK_SIZE = 1024 * 1024 * 5; // 5MB

let token = localStorage.getItem('github_token');

function checkAuth() {
    if (!token) {
        document.getElementById('uploadButton').style.display = 'none';
        document.getElementById('fileInput').style.display = 'none';
        document.getElementById('loginButton').style.display = 'block';
        setStatus('Please log in to upload files');
    } else {
        document.getElementById('uploadButton').style.display = 'block';
        document.getElementById('fileInput').style.display = 'block';
        document.getElementById('loginButton').style.display = 'none';
        setStatus('Ready to upload');
    }
}

function login() {
    window.open(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`, 'GitHub OAuth', 'width=600,height=600');
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    document.getElementById('uploadButton').addEventListener('click', handleUpload);
    document.getElementById('loginButton').addEventListener('click', login);
});

window.addEventListener('message', event => {
    if (event.data.type === 'oauth') {
        const code = event.data.code;
        fetch('/.netlify/functions/get-token', {
            method: 'POST',
            body: JSON.stringify({ code }),
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            token = data.access_token;
            localStorage.setItem('github_token', token);
            window.location.reload();
        });
    }
});

async function handleUpload() {
    if (!token) {
        setStatus('Please log in to upload files');
        return;
    }

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        setStatus('Please select a file');
        return;
    }

    setStatus('Creating release...');
    const releaseData = await createRelease();
    if (!releaseData) return;

    setStatus('Uploading file...');
    await uploadFileInChunks(file, releaseData.upload_url);
}

async function createRelease() {
    const response = await fetch('https://api.github.com/repos/chienlove/chienlove.github.io/releases', {
        method: 'POST',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            tag_name: 'v' + new Date().getTime(),
            name: 'Release ' + new Date().toISOString(),
            body: 'Uploaded from web interface'
        })
    });

    if (!response.ok) {
        setStatus('Failed to create release');
        return null;
    }

    return await response.json();
}

async function uploadFileInChunks(file, uploadUrl) {
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    let uploadedChunks = 0;

    document.getElementById('progressBar').style.display = 'block';

    for (let start = 0; start < file.size; start += CHUNK_SIZE) {
        const chunk = file.slice(start, start + CHUNK_SIZE);
        const end = Math.min(start + CHUNK_SIZE - 1, file.size - 1);

        const response = await fetch(uploadUrl.replace('{?name,label}', `?name=${file.name}`), {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': file.type,
                'Content-Length': chunk.size,
                'Content-Range': `bytes ${start}-${end}/${file.size}`
            },
            body: chunk
        });

        if (!response.ok) {
            setStatus('Failed to upload chunk');
            return;
        }

        uploadedChunks++;
        updateProgress((uploadedChunks / totalChunks) * 100);
    }

    setStatus('File uploaded successfully!');
}

function setStatus(message) {
    document.getElementById('status').textContent = message;
}

function updateProgress(percentage) {
    const progressBar = document.querySelector('#progressBar div');
    progressBar.style.width = `${percentage}%`;
}