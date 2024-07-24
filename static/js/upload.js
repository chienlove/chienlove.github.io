document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const releaseTypeSelect = document.getElementById('releaseType');
    const newReleaseFields = document.getElementById('newReleaseFields');
    const existingReleaseField = document.getElementById('existingReleaseField');
    const existingReleasesSelect = document.getElementById('existingReleases');
    const messageDiv = document.getElementById('message');

    // Populate existing releases
    fetch('/.netlify/functions/releases')
        .then(response => response.json())
        .then(releases => {
            releases.forEach(release => {
                const option = document.createElement('option');
                option.value = release.id;
                option.textContent = release.name;
                existingReleasesSelect.appendChild(option);
            });
        })
        .catch(error => showMessage(error.message, 'error'));

    releaseTypeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'new') {
            newReleaseFields.classList.remove('hidden');
            existingReleaseField.classList.add('hidden');
        } else {
            newReleaseFields.classList.add('hidden');
            existingReleaseField.classList.remove('hidden');
        }
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/.netlify/functions/upload', {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (response.ok) {
                showMessage(result.message, 'success');
            } else {
                showMessage(result.error, 'error');
            }
        } catch (error) {
            showMessage('An error occurred during upload', 'error');
        }
    });

    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');
    }
});