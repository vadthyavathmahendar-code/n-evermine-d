// -------------------- Firebase Core Setup --------------------
// Fixed: Using stable, correct version (10.12.0) for Firebase SDK imports
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  serverTimestamp,
  doc,
  getDoc,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// 🔥 Your Firebase project config (Ensure this is accurate for your project)
const firebaseConfig = {
  apiKey: "AIzaSyB9izLxfu1GhHFUyqHuq7saupeegrkIbJE",
  authDomain: "nevermind-df9cf.firebaseapp.com",
  projectId: "nevermind-df9cf",
  storageBucket: "nevermind-df9cf.firebasestorage.app",
  messagingSenderId: "727970752371",
  appId: "1:727970752371:web:c58a65bc8869753f878706"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------- DOM Elements --------------------
const ideaForm = document.getElementById("ideaform");
const ideasFeed = document.getElementById("ideas-feed");
const userInfo = document.getElementById("user-info");
const logoutBtn = document.getElementById("logout");
const themeSwitch = document.getElementById("themeSwitch");
const searchInput = document.querySelector(".srch");
const genreCards = document.querySelectorAll(".genre-card");
const mainWrapper = document.querySelector(".main"); 
const splashScreen = document.querySelector(".splash");

// -------------------- Toast Feedback --------------------
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// -------------------- Auth Check & Role Redirect --------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    // If not logged in, redirect to login page
    window.location.replace("login.html");
    return;
  }

  // Check user role
  const roleDoc = await getDoc(doc(db, "roles", user.uid));
  const role = roleDoc.exists() ? roleDoc.data().role : "user";

  if (role === "admin") {
    // If admin, redirect to admin page
    window.location.replace("admin.html");
    return;
  }
  
  // Standard user is logged in: show content
  if (splashScreen) {
    splashScreen.style.opacity = '0';
    setTimeout(() => {
      splashScreen.style.display = 'none';
      if (mainWrapper) mainWrapper.style.display = 'block';
    }, 1500); // Hide splash after animation
  } else {
    if (mainWrapper) mainWrapper.style.display = 'block';
  }

  userInfo.innerHTML = `Logged in as: <b>${user.email}</b> <span class="badge user">[USER]</span>`;
  loadIdeas();
});

// -------------------- Logout --------------------
logoutBtn?.addEventListener("click", () => {
  signOut(auth);
});

// -------------------- Submit Idea --------------------
ideaForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return showToast("Please log in first."); // Changed alert to toast

  const title = document.getElementById("idea-title").value;
  const genre = document.getElementById("idea-genre").value;
  const summary = document.getElementById("idea-storyline").value;
  const tagsRaw = document.getElementById("idea-tags").value;
  const tags = tagsRaw ? tagsRaw.split(",").map(tag => tag.trim()) : [];

  try {
    await addDoc(collection(db, "movieIdeas"), {
      title,
      genre,
      summary,
      tags,
      author: user.email,
      userId: user.uid,
      featured: false,
      reviewed: false, // Added for consistency with admin panel
      timestamp: serverTimestamp()
    });
    showToast("🎉 Idea submitted successfully!");
    ideaForm.reset();
  } catch (err) {
    showToast("Error: " + err.message); // Changed alert to toast
  }
});

// -------------------- Load Ideas --------------------
let unsubscribeIdeas = null;

function loadIdeas(filterGenre = "", searchTerm = "") {
  if (unsubscribeIdeas) unsubscribeIdeas(); // clear old listener

  // NOTE: Firestore queries often require indexes if combining filters or using orderBy
  // For simplicity and to avoid deployment issues, we fetch all and filter/sort in client
  const q = query(collection(db, "movieIdeas"), orderBy("timestamp", "desc"));
  
  unsubscribeIdeas = onSnapshot(q, (snapshot) => {
    ideasFeed.innerHTML = "";
    let filteredIdeas = [];
    
    snapshot.forEach((docSnap, index) => {
      const idea = docSnap.data();
      // Client-side filtering
      const matchesGenre = filterGenre ? idea.genre === filterGenre : true;
      const matchesSearch = searchTerm
        ? idea.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          idea.summary?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (Array.isArray(idea.tags) &&
            idea.tags.some(tag =>
              tag.toLowerCase().includes(searchTerm.toLowerCase())
            ))
        : true;

      if (matchesGenre && matchesSearch) {
        filteredIdeas.push(idea);
      }
    });
    
    // Render filtered ideas with staggered animation
    filteredIdeas.forEach((idea, index) => renderIdeaCard(idea, index, ideasFeed));
  });
}

// -------------------- Render Idea Card --------------------
function renderIdeaCard(idea, index, container) {
  const div = document.createElement("div");
  div.classList.add("idea-card", "fade-in");
  // Stagger animation delay
  div.style.animationDelay = `${index * 0.1}s`; 

  div.innerHTML = `
    <h3>${idea.title}</h3>
    <p><strong>Genre:</strong> ${idea.genre}</p>
    <p>${idea.summary}</p>
    <p><em>Tags:</em> ${Array.isArray(idea.tags) ? idea.tags.join(", ") : "—"}</p>
    <small>By: ${idea.author || "Anonymous"}</small>
    ${idea.featured ? "<span style='color:gold'> ⭐ Featured</span>" : ""}
  `;

  container.appendChild(div);
}

// -------------------- Theme Toggle --------------------
themeSwitch?.addEventListener("change", () => {
  document.body.classList.toggle("light-mode");
});

// -------------------- Genre Filtering --------------------
genreCards?.forEach(card => {
  card.addEventListener("click", () => {
    // Clear existing background classes except light-mode
    document.body.className = document.body.className.split(' ').filter(c => !c.endsWith('-bg') && c !== 'light-mode').join(' ');
    
    const genre = card.dataset.genre;
    document.body.classList.add(`${genre.toLowerCase()}-bg`);
    loadIdeas(genre, searchInput?.value || "");
  });
});

// -------------------- Live Search --------------------
searchInput?.addEventListener("input", () => {
  // Retain current genre filter when searching
  const currentGenre = Array.from(genreCards).find(card => document.body.classList.contains(`${card.dataset.genre.toLowerCase()}-bg`))?.dataset.genre || "";
  loadIdeas(currentGenre, searchInput.value);
});
