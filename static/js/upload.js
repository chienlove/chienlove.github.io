const CLIENT_ID = 'Ov23lixtCFiQYWFH232n'; // replace with your actual client ID
const REDIRECT_URI = 'https://storeios.net/.netlify/functions/callback'; // replace with your actual redirect URI
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size

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
        })
        .catch(error => {
            console.error('Error getting token:', error);
            setStatus('Failed to get access token');
        });
    }
});

async function handleUpload() {
    if (!checkToken()) return;

    const fileInput = document.getElementById('fileInput');
    const file = fileInput.files[0];
    if (!file) {
        setStatus('Please select a file');
        return;
    }

    if (file.size > MAX_FILE_SIZE) {
        setStatus(`File size exceeds the maximum limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`);
        return;
    }

    try {
        setStatus('Creating release...');
        const releaseData = await createRelease();
        if (!releaseData) return;

        console.log('Release created successfully. Upload URL:', releaseData.upload_url);
        await uploadFile(file, releaseData.upload_url);
    } catch (error) {
        setStatus(`Error during upload process: ${error.message}`);
        console.error('Upload process error:', error);
    }
}

async function createRelease() {
    try {
        const response = await fetch('https://api.github.com/repos/chienlove/chienlove.github.io/releases', {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                tag_name: 'v' + new Date().getTime(),
                name: 'Release ' + new Date().toISOString(),
                body: 'Uploaded from web interface'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        return await response.json();
    } catch (error) {
        setStatus(`Failed to create release: ${error.message}`);
        console.error('Create release error:', error);
        return null;
    }
}

async function uploadFile(file, uploadUrl) {
    setStatus('Uploading file...');
    document.getElementById('progressBar').style.display = 'block';

    console.log('Starting file upload...');
    
    // Xử lý uploadUrl
    const finalUploadUrl = uploadUrl.split('{')[0] + `?name=${encodeURIComponent(file.name)}`;
    console.log('Final Upload URL:', finalUploadUrl);

    console.log('File name:', file.name);
    console.log('File size:', file.size);
    console.log('File type:', file.type);

    try {
        const response = await fetch(finalUploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': file.type || 'application/octet-stream',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: file
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response body:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const data = await response.json();
        setStatus('File uploaded successfully!');
        updateProgress(100);
        console.log('Upload response:', data);
    } catch (error) {
        setStatus(`Failed to upload file: ${error.message}`);
        console.error('Upload error:', error);
    }
}

function setStatus(message) {
    document.getElementById('status').textContent = message;
}

function updateProgress(percentage) {
    const progressBar = document.querySelector('#progressBar div');
    progressBar.style.width = `${percentage}%`;
}

function checkToken() {
    if (!token) {
        setStatus('No token found. Please log in.');
        return false;
    }
    return true;
}