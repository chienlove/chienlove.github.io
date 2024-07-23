document.getElementById('upload-form').addEventListener('submit', async function(e) {
    e.preventDefault();
    const status = document.getElementById('status');
    status.textContent = 'Đang upload...';

    const fileInput = document.getElementById('file-input');
    const releaseTag = document.getElementById('release-tag').value;
    const releaseName = document.getElementById('release-name').value;
    const releaseNotes = document.getElementById('release-notes').value;

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('release_tag', releaseTag);
    formData.append('release_name', releaseName);
    formData.append('release_notes', releaseNotes);

    try {
        const response = await fetch('/.netlify/functions/upload-handler', {
            method: 'POST',
            body: formData,
        });
        const result = await response.json();
        if (response.ok) {
            status.textContent = 'Upload thành công!';
        } else {
            status.textContent = `Lỗi: ${result.error}`;
        }
    } catch (error) {
        status.textContent = `Lỗi: ${error.message}`;
    }
});