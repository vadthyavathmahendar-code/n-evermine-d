import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  setPersistence,
  browserLocalPersistence
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ✅ Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyB9izLxfu1GhHFUyqHuq7saupeegrkIbJE",
  authDomain: "nevermind-df9cf.firebaseapp.com",
  projectId: "nevermind-df9cf",
  storageBucket: "nevermind-df9cf.appspot.com",
  messagingSenderId: "727970752371",
  appId: "1:727970752371:web:c58a65bc8869753f878706"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const MAIN_PAGE = "index.html"; 

// -------------------- Toast Feedback --------------------
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// ✅ Persist session across pages
setPersistence(auth, browserLocalPersistence);

// ✅ Login with role-based redirect
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = e.target.email.value;
  const password = e.target.password.value;

  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // --- START ADMIN ROLE CHECK LOGIC ---
    let role = "user";
    try {
        const roleDoc = await getDoc(doc(db, "roles", user.uid));
        
        if (roleDoc.exists()) {
            role = roleDoc.data().role || "user"; // Ensure role is defined
        }
        
        console.log(`User ${user.email} logged in. Detected role: ${role}`);

    } catch (firestoreError) {
        // This catches if the user is blocked from reading the 'roles' collection (Security Rules Issue)
        console.error("Firestore Role Check Failed (Security/Connection):", firestoreError);
        showToast("Login successful, but role check failed. Defaulting to user view.");
    }
    
    // Redirect based on the final determined role
    window.location.href = role === "admin" ? "admin.html" : MAIN_PAGE;
    // --- END ADMIN ROLE CHECK LOGIC ---
    
  } catch (err) {
    console.error("Login authentication error:", err);
    showToast("Login failed: " + err.message);
  }
});

// ✅ Signup with automatic role assignment
document.querySelector(".signup")?.addEventListener("click", async (e) => {
  e.preventDefault(); 
  const email = prompt("Enter your email:");
  const password = prompt("Create a password (min 6 characters):");

  if (!email || !password) {
    return showToast("Email and password are required.");
  }
  if (password.length < 6) {
    return showToast("Password must be at least 6 characters.");
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Set role as 'user' for new signups
    await setDoc(doc(db, "roles", user.uid), { role: "user" });

    showToast("Account created! Redirecting...");
    window.location.href = MAIN_PAGE;
  } catch (err) {
    console.error("Signup error:", err);
    showToast("Signup failed: " + err.message);
  }
});

// ✅ Google Sign-In with role fallback
document.getElementById("googleSignIn")?.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();

  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    const roleRef = doc(db, "roles", user.uid);
    // Ensure user document exists with default 'user' role
    await setDoc(roleRef, { role: "user" }, { merge: true });

    const roleDoc = await getDoc(roleRef);
    const role = roleDoc.exists() ? roleDoc.data().role : "user";

    window.location.href = role === "admin" ? "admin.html" : MAIN_PAGE;
  } catch (err) {
    console.error("Google Sign-In error:", err);
    showToast("Google Sign-In failed: " + err.message);
  }
});
