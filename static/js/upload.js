const CLIENT_ID = 'Ov23lixtCFiQYWFH232n';
const REDIRECT_URI = 'https://storeios.net/.netlify/functions/callback';
const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks

let token = localStorage.getItem('github_token');

if (!token) {
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`;
} else {
    document.getElementById('uploadButton').addEventListener('click', handleUpload);
}

async function handleUpload() {
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
        updateProgress(uploadedChunks / totalChunks * 100);
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
      localStorage.setItem('github_token', data.access_token);
      window.location.reload();
    });
  }
});

if (!token) {
  const popup = window.open(`https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${REDIRECT_URI}&scope=repo`, 'GitHub OAuth', 'width=600,height=600');
}