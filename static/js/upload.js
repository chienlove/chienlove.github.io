console.log('upload.js loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOMContentLoaded event fired');

    const form = document.getElementById('uploadForm');
    const submitButton = document.getElementById('submitButton');
    const releaseTypeSelect = document.getElementById('releaseType');
    const newReleaseFields = document.getElementById('newReleaseFields');
    const existingReleaseField = document.getElementById('existingReleaseField');
    const existingReleasesSelect = document.getElementById('existingReleases');
    const messageDiv = document.getElementById('message');

    console.log('Elements selected:', {form, submitButton, releaseTypeSelect, newReleaseFields, existingReleaseField, existingReleasesSelect, messageDiv});

    // Populate existing releases
    fetch('/api/releases')
        .then(response => response.json())
        .then(releases => {
            console.log('Fetched releases:', releases);
            releases.forEach(release => {
                const option = document.createElement('option');
                option.value = release.id;
                option.textContent = release.name;
                existingReleasesSelect.appendChild(option);
            });
        })
        .catch(error => {
            console.error('Error fetching releases:', error);
            showMessage(error.message, 'error');
        });

    releaseTypeSelect.addEventListener('change', (e) => {
        console.log('Release type changed:', e.target.value);
        if (e.target.value === 'new') {
            newReleaseFields.classList.remove('hidden');
            existingReleaseField.classList.add('hidden');
        } else {
            newReleaseFields.classList.add('hidden');
            existingReleaseField.classList.remove('hidden');
        }
    });

    submitButton.addEventListener('click', async (e) => {
        console.log('Submit button clicked');
        e.preventDefault();
        
        const formData = new FormData(form);
        
        console.log('Form data:');
        for (let [key, value] of formData.entries()) {
            console.log(key, value);
        }

        try {
            console.log('Sending request to /api/upload');
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            
            console.log('Response status:', response.status);

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            
            const result = await response.json();
            console.log('Response result:', result);
            showMessage(result.message, 'success');
        } catch (error) {
            console.error('Error during upload:', error);
            showMessage(error.message || 'An error occurred during upload', 'error');
        }

        // Uncomment the following block to use a simulated API response instead of the actual fetch
        /*
        try {
            console.log('Simulating API call');
            await new Promise(resolve => setTimeout(resolve, 1000));
            showMessage('Upload successful (simulated)', 'success');
        } catch (error) {
            console.error('Error during upload:', error);
            showMessage(error.message || 'An error occurred during upload', 'error');
        }
        */
    });

    function showMessage(message, type) {
        console.log('Showing message:', message, type);
        messageDiv.textContent = message;
        messageDiv.className = `message ${type}`;
        messageDiv.classList.remove('hidden');
        console.log('Message div:', messageDiv);
    }
});