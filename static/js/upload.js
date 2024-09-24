const CLIENT_ID = 'Ov23lixtCFiQYWFH232n'; // replace with your actual client ID
const REDIRECT_URI = 'https://storeios.net/.netlify/functions/callback'; // replace with your actual redirect URI
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB max file size

let token = localStorage.getItem('github_token');
let authWindow = null;

function checkAuth() {
    console.log("Checking auth, token:", token);
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
    const width = 600;
    const height = 600;
    const left = (screen.width / 2) - (width / 2);
    const top = (screen.height / 2) - (height / 2);
    authWindow = window.open(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`, 'GitHub OAuth', `width=${width},height=${height},left=${left},top=${top}`);
}

window.addEventListener('message', event => {
    console.log("Received message:", event.data);
    if (event.data.type === 'oauth') {
        const code = event.data.code;
        fetch('/.netlify/functions/get-token', {
            method: 'POST',
            body: JSON.stringify({ code }),
            headers: { 'Content-Type': 'application/json' }
        })
        .then(response => response.json())
        .then(data => {
            console.log("Received token data:", data);
            if (data.access_token) {
                token = data.access_token;
                localStorage.setItem('github_token', token);
                console.log("Token saved:", token);
                checkAuth();
                setStatus('Login successful');
                // Gửi phản hồi đến cửa sổ xác thực
                if (authWindow) {
                    authWindow.postMessage('token_received', '*');
                }
            } else {
                throw new Error('No access token received');
            }
        })
        .catch(error => {
            console.error('Error getting token:', error);
            setStatus('Failed to get access token');
        });
    }
});

document.addEventListener('DOMContentLoaded', function() {
    console.log("DOM loaded, checking auth");
    checkAuth();
    document.getElementById('uploadButton').addEventListener('click', handleUpload);
    document.getElementById('loginButton').addEventListener('click', login);
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
                body: 'Uploaded from web interface',
                draft: false,
                prerelease: false
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Create release error response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }

        const releaseData = await response.json();
        console.log('Release created successfully:', releaseData);
        return releaseData;
    } catch (error) {
        setStatus(`Failed to create release: ${error.message}`);
        console.error('Create release error:', error);
        return null;
    }
}

async function uploadFile(file, uploadUrl) {
    setStatus('Uploading file...');
    document.getElementById('progressBar').style.display = 'block';

    console.log(`Uploading file: ${file.name}, size: ${file.size}, type: ${file.type}`);

    // Xử lý uploadUrl để thêm tên file
    const finalUploadUrl = uploadUrl.replace('{?name,label}', `?name=${encodeURIComponent(file.name)}`);
    console.log('Final Upload URL:', finalUploadUrl);

    const formData = new FormData();
    formData.append('file', file);

    try {
        const response = await fetch(finalUploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `token ${token}`,
                'Accept': 'application/vnd.github.v3+json'
            },
            body: formData
        });

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