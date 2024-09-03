import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from './firebase-config';

async function performSearch() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const postsCollection = collection(db, "posts");
    const q = query(postsCollection, where("slug", ">=", searchInput), where("slug", "<=", searchInput + '\uf8ff'));

    const querySnapshot = await getDocs(q);
    const resultsContainer = document.getElementById('search-results');
    resultsContainer.innerHTML = ''; // Xóa kết quả cũ

    querySnapshot.forEach((doc) => {
        const data = doc.data();
        const resultItem = document.createElement('div');
        resultItem.className = 'result-item';
        resultItem.innerHTML = `<h3>${data.title}</h3><p>${data.description}</p>`;
        resultsContainer.appendChild(resultItem);
    });
}