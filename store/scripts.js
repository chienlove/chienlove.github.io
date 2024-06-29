// Import Firebase SDK
import { initializeApp } from "firebase/app";
import { getDatabase, ref, push, onValue } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyABo1KBDlLJdeNIP5diteT2J0MMemgLigo",
  authDomain: "admin-panel-7418d.firebaseapp.com",
  projectId: "admin-panel-7418d",
  storageBucket: "admin-panel-7418d.appspot.com",
  messagingSenderId: "158197054777",
  appId: "1:158197054777:web:202164ada59e2c0b59bce8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Function to save post to Firebase
function savePostToFirebase(post) {
  return push(ref(database, 'posts'), post); // Return the promise to handle success and error
}

// Get the form and listen for submit event to save post
const postForm = document.getElementById('post-form');
postForm.addEventListener('submit', (e) => {
  e.preventDefault(); // Prevent default form submit behavior (page reload)

  const appName = postForm['appName'].value;
  const appImage = postForm['appImage'].value;
  const appDescription = postForm['appDescription'].value;
  const developer = postForm['developer'].value;
  const iosCompatibility = postForm['iosCompatibility'].value;
  const appVersion = postForm['appVersion'].value;
  const downloadLink = postForm['downloadLink'].value;
  const category = postForm['category'].value;

  const newPost = {
    appName,
    appImage,
    appDescription,
    developer,
    iosCompatibility,
    appVersion,
    downloadLink,
    category
  };

  savePostToFirebase(newPost)
    .then(() => {
      alert("Post saved successfully!"); // Show success message
      postForm.reset(); // Reset form fields after successful submission
    })
    .catch((error) => {
      console.error("Error saving post: ", error);
      alert("Error saving post: " + error.message); // Show error message
    });
});