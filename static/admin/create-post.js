// Import Netlify Identity widget
import netlifyIdentity from 'netlify-identity-widget';

// Initialize Netlify Identity
netlifyIdentity.init();

// Select DOM elements
const createPostForm = document.getElementById('createPostForm');
const logoutButton = document.getElementById('logoutButton');

// Show logout button based on user status
const updateUI = (user) => {
  console.log('Current user:', user); // Debugging line
  if (user) {
    logoutButton.style.display = 'inline';
  } else {
    logoutButton.style.display = 'none';
  }
};

// Handle logout
logoutButton.addEventListener('click', () => {
  netlifyIdentity.logout();
});

// Handle form submission
createPostForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const title = document.getElementById('title').value;
  const content = document.getElementById('content').value;

  const user = netlifyIdentity.currentUser();
  console.log('Current user:', user); // Debugging line
  if (user) {
    try {
      const response = await fetch('/.netlify/functions/createPost', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token.access_token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title, content })
      });

      if (response.ok) {
        alert('Post created successfully!');
        createPostForm.reset();
      } else {
        const error = await response.json();
        alert(`Error: ${error.message}`);
      }
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  } else {
    alert('You must be logged in to create a post.');
  }
});

// Listen for authentication events
netlifyIdentity.on('login', user => {
  updateUI(user);
});

netlifyIdentity.on('logout', () => {
  updateUI(null);
});

// Initialize UI on page load
netlifyIdentity.on('init', user => {
  updateUI(user);
});