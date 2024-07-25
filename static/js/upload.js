document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM content loaded'); // Debug log

    const form = document.getElementById('uploadForm');
    const submitButton = document.getElementById('submitButton');
    const releaseTypeSelect = document.getElementById('releaseType');
    const newReleaseFields = document.getElementById('newReleaseFields');
    const existingReleaseField = document.getElementById('existingReleaseField');
    const existingReleasesSelect = document.getElementById('existingReleases');
    const messageDiv = document.getElementById('message');

    console.log('Elements selected:', {form, submitButton, releaseTypeSelect, newReleaseFields, existingReleaseField, existingReleasesSelect, messageDiv}); // Debug log

    // Populate existing releases
    fetch('/api/releases')
        .then(response => response.json())
        .then(releases => {
            console.log('Fetched releases:', releases); // Debug log
            releases.forEach(release => {
                const option = document.createElement('option');
                option.value = release.id;
                option.textContent = release.name;
                existingReleasesSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching releases:', error); // Debug log
            showMessage(error.message, 'error');
        });

    releaseTypeSelect.addEventListener('change', (e) => {
        console.log('Release type changed:', e.target.value); // Debug log
        if (e.target.value === 'new') {
            newReleaseFields.classList.remove('hidden');
            existingReleaseField.classList.add('hidden');
        } else {
            newReleaseFields.classList.add('hidden');
            existingReleaseField.classList.remove('hidden');
        }
    });

    submitButton.addEventListener('click', async (e) => {
        console.log('Submit button clicked'); // Debug log
        e.preventDefault();
        
        const formData = new FormData(form);
        
        console.log('Form data:', Object.fromEntries(formData)); // Debug log

        try {
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            console.log('Response status:', response.status); // Debug log

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const result = await response.json();
            console.log('Response result:', result); // Debug log
            showMessage(result.message, 'success');
        } catch (error) {
            console.error('Error during upload:', error); // Debug log
            showMessage(error.message || 'An error occurred during upload', 'error');
        }
    });

    function showMessage(message, type) {
        console.log('Showing message:', {message, type}); // Debug log
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');
    }
});