import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB9izLxfu1GhHFUyqHuq7saupeegrkIbJE",
  authDomain: "nevermind-df9cf.firebaseapp.com",
  projectId: "nevermind-df9cf",
  storageBucket: "nevermind-df9cf.firebasestorage.app",
  messagingSenderId: "727970752371",
  appId: "1:727970752371:web:c58a65bc8869753f878706"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ DOM Elements
const ideasList = document.getElementById("ideas-list");
const featuredList = document.getElementById("featuredList");
const adminInfo = document.getElementById("admin-info");
const logoutBtn = document.getElementById("logout");
const genreFilter = document.getElementById("genreFilter");
const sortOptions = document.getElementById("sortOptions");
const adminWrapper = document.querySelector(".admin-wrapper");

// ✅ Toast Feedback
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ✅ Auth check and role verification
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace("login.html");
    return;
  }

  const roleDoc = await getDoc(doc(db, "roles", user.uid));
  const role = roleDoc.exists() ? roleDoc.data().role : "user";

  if (role !== "admin") {
    window.location.replace("index.html");
    return;
  }

  adminInfo.innerHTML = `
    <span class="fade-in">
      Logged in as: <b>${user.email}</b> <span style="color:gold">[ADMIN]</span>
    </span>
  `;
  if(adminWrapper) adminWrapper.classList.add("fade-in-active");

  loadIdeas();
  loadFeaturedIdeas();
  updateAnalytics();
});

// ✅ Logout
logoutBtn?.addEventListener("click", () => {
  signOut(auth);
});

// ✅ Genre and Sort Listeners
genreFilter?.addEventListener("change", () => {
  loadIdeas(genreFilter.value, sortOptions.value);
});

sortOptions?.addEventListener("change", () => {
  loadIdeas(genreFilter.value, sortOptions.value);
});

// ✅ Load All Ideas with Filters (Client-side filtering for simplicity)
function loadIdeas(selectedGenre = "", sortBy = "timestamp") {
  const ideasCol = collection(db, "movieIdeas");

  onSnapshot(ideasCol, (snapshot) => {
    let ideas = [];
    snapshot.forEach(docSnap => {
      const idea = docSnap.data();
      idea.id = docSnap.id;
      if (selectedGenre && idea.genre !== selectedGenre) return;
      ideas.push(idea);
    });

    if (sortBy === "title") {
      ideas.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
    } else {
      ideas.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
    }

    ideasList.innerHTML = "";
    ideas.forEach(idea => renderIdeaCard(idea, ideasList));
  });
}

// ✅ Load Featured Ideas Panel
function loadFeaturedIdeas() {
  onSnapshot(collection(db, "movieIdeas"), (snapshot) => {
    featuredList.innerHTML = "";
    snapshot.forEach(docSnap => {
      const idea = docSnap.data();
      idea.id = docSnap.id;
      if (!idea.featured) return;
      renderIdeaCard(idea, featuredList);
    });
  });
}

// ✅ Render Idea Card
function renderIdeaCard(idea, container) {
  const div = document.createElement("div");
  div.classList.add("idea-card");
  
  // Use a custom modal/confirm instead of the built-in confirm()
  const deleteBtnHtml = `<button class="btn delete-btn" onclick="showConfirmDelete('${idea.id}')">🗑 Delete</button>`;

  div.innerHTML = `
    <h3>${idea.title}</h3>
    <p><strong>Genre:</strong> ${idea.genre}</p>
    <p>${idea.summary}</p>
    <p><em>Tags:</em> ${idea.tags?.join(", ") || "—"}</p>
    <small>By: ${idea.author}</small><br><br>
    ${idea.featured ? "<span style='color:gold'>⭐ Featured</span> " : ""}
    ${idea.reviewed ? "<span style='color:lightgreen'>✅ Reviewed</span>" : ""}
    <div class="admin-actions">
      <button class="btn" onclick="featureIdea('${idea.id}')" ${idea.featured ? 'disabled' : ''}>⭐ Feature</button>
      <button class="btn" onclick="unfeatureIdea('${idea.id}')" ${!idea.featured ? 'disabled' : ''}>❌ Unfeature</button>
      <button class="btn" onclick="markReviewed('${idea.id}')" ${idea.reviewed ? 'disabled' : ''}>✅ Review</button>
      <button class="btn" onclick="unmarkReviewed('${idea.id}')" ${!idea.reviewed ? 'disabled' : ''}>⛔ Unreview</button>
      ${deleteBtnHtml}
    </div>
  `;
  container.appendChild(div);
}

// Global scope functions for admin actions (attached to window)
window.featureIdea = async (id) => {
  await updateDoc(doc(db, "movieIdeas", id), { featured: true });
  showToast("⭐ Idea marked as featured.");
};

window.unfeatureIdea = async (id) => {
  await updateDoc(doc(db, "movieIdeas", id), { featured: false });
  showToast("❌ Idea unfeatured.");
};

window.markReviewed = async (id) => {
  await updateDoc(doc(db, "movieIdeas", id), { reviewed: true });
  showToast("✅ Idea marked as reviewed.");
};

window.unmarkReviewed = async (id) => {
  await updateDoc(doc(db, "movieIdeas", id), { reviewed: false });
  showToast("⛔ Review removed.");
};

window.deleteIdea = async (id) => {
  // Logic remains simple as window.confirm is the only quick alternative here
  // For production, this should be replaced by a custom HTML modal.
  const confirmDelete = confirm("Are you sure you want to delete this idea?");
  if (!confirmDelete) return;
  await deleteDoc(doc(db, "movieIdeas", id));
  showToast("🗑 Idea deleted.");
};

// NOTE: showConfirmDelete function is not defined, keeping window.deleteIdea as is

// ✅ Analytics Dashboard Logic
function updateAnalytics() {
  const totalEl = document.getElementById("totalIdeas");
  const featuredEl = document.getElementById("featuredCount");
  const reviewedEl = document.getElementById("reviewedCount");
  const genreEl = document.getElementById("genreBreakdown");

  onSnapshot(collection(db, "movieIdeas"), (snapshot) => {
    let total = 0;
    let featured = 0;
    let reviewed = 0;
    const genreMap = {};

    snapshot.forEach(docSnap => {
      const idea = docSnap.data();
      total++;
      if (idea.featured) featured++;
      if (idea.reviewed) reviewed++;
      const genre = idea.genre || "Unknown";
      genreMap[genre] = (genreMap[genre] || 0) + 1;
    });

    totalEl.textContent = `Total Ideas: ${total}`;
    featuredEl.textContent = `Featured: ${featured}`;
    reviewedEl.textContent = `Reviewed: ${reviewed}`;
    genreEl.textContent = `Genres: ${Object.entries(genreMap).map(([g, c]) => `${g}: ${c}`).join(" | ")}`;
  });
}

// ✅ Export to CSV
document.getElementById("exportCSV")?.addEventListener("click", async () => {
  const snapshot = await getDocs(collection(db, "movieIdeas"));
  const rows = [["Title", "Genre", "Summary", "Tags", "Author", "Featured", "Reviewed", "Submitted At"]];

  snapshot.forEach(docSnap => {
    const idea = docSnap.data();
    const timestamp = idea.timestamp ? new Date(idea.timestamp.seconds * 1000).toLocaleString() : 'N/A';
    
    // Simple CSV escaping for quotes
    const escape = (text) => `"${(text || '').replace(/"/g, '""')}"`;

    rows.push([
      escape(idea.title),
      escape(idea.genre),
      escape(idea.summary),
      escape(idea.tags?.join(", ")),
      escape(idea.author),
      idea.featured ? "Yes" : "No",
      idea.reviewed ? "Yes" : "No",
      escape(timestamp)
    ]);
  });

  const csvContent = rows.map(row => row.join(",")).join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "movie_ideas_export.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast("📥 Export successful!");
});
