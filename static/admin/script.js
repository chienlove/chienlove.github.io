// Import Netlify Identity widget
import netlifyIdentity from 'netlify-identity-widget';

// Initialize Netlify Identity
netlifyIdentity.init();

// Select DOM elements
const loginButton = document.getElementById('loginButton');
const logoutButton = document.getElementById('logoutButton');
const postsList = document.getElementById('postsList');
const createPostButton = document.getElementById('createPostButton');

// Show login or logout button based on user status
const updateUI = (user) => {
  if (user) {
    loginButton.style.display = 'none';
    logoutButton.style.display = 'inline';
    fetchPosts(user.token.access_token);
  } else {
    loginButton.style.display = 'inline';
    logoutButton.style.display = 'none';
    postsList.innerHTML = '';
  }
};

// Handle login
loginButton.addEventListener('click', () => {
  netlifyIdentity.open();
});

// Handle logout
logoutButton.addEventListener('click', () => {
  netlifyIdentity.logout();
});

// Fetch posts from Netlify Function
const fetchPosts = async (token) => {
  const response = await fetch('/.netlify/functions/getPosts', {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const posts = await response.json();
  postsList.innerHTML = posts.map(post => `<li>${post.title}</li>`).join('');
};

// Handle create post button
createPostButton.addEventListener('click', () => {
  // Redirect to the new post creation page or display a form
  window.location.href = '/admin/create-post.html';
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