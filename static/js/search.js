const searchForm = document.getElementById('search-form');
const searchResults = document.getElementById('search-results');

searchForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const query = document.getElementById('search-query').value;
  searchResults.innerHTML = '';

  const response = await fetch(`/.netlify/functions/search?q=${query}`);
  const results = await response.json();

  results.forEach(result => {
    searchResults.innerHTML += `<div><h2>${result.title}</h2><p>${result.excerpt}</p></div>`;
  });
});