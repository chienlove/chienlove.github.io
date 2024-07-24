document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('uploadForm');
    const releaseTypeSelect = document.getElementById('releaseType');
    const newReleaseFields = document.getElementById('newReleaseFields');
    const existingReleaseField = document.getElementById('existingReleaseField');
    const existingReleasesSelect = document.getElementById('existingReleases');
    const messageDiv = document.getElementById('message');

    // Populate existing releases
    fetch('/api/releases')
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
        e.preventDefault(); // Ngăn chặn form submit mặc định
        
        const formData = new FormData(form);
        
        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const result = await response.json();
            showMessage(result.message, 'success');
        } catch (error) {
            showMessage(error.message || 'An error occurred during upload', 'error');
        }
    });

    function showMessage(message, type) {
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');
    }
});