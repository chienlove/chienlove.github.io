import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";

const db = getFirestore();

async function performSearch() {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const postsCollection = collection(db, "posts");
    const q = query(postsCollection, where("slug", ">=", searchInput), where("slug", "<=", searchInput + '\uf8ff'));

    const querySnapshot = await getDocs(q);
    querySnapshot.forEach((doc) => {
        console.log(doc.id, " => ", doc.data());
        // Hiển thị kết quả tìm kiếm trên trang
    });
}