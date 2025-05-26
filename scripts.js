const firebaseConfig = {
    apiKey: "AIzaSyCBDfcp3OJ5JJVDl0I73mfJJCwDzrKQfBc",
    authDomain: "keyns-dj-app.firebaseapp.com",
    projectId: "keyns-dj-app",
    storageBucket: "keyns-dj-app.firebasestorage.app",
    messagingSenderId: "157975423461",
    appId: "1:157975423461:web:dd31f5c6260ced76a0a70c",
    measurementId: "G-PZHCYCNHND"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

const authEmailInput = document.getElementById('authEmail');
const authPasswordInput = document.getElementById('authPassword');
const loginBtn = document.getElementById('loginBtn');
const signupBtn = document.getElementById('signupBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userEmailSpan = document.getElementById('userEmail');
const authSection = document.getElementById('authSection');
const journalSection = document.getElementById('journalSection');
const errorMessageDiv = document.getElementById('errorMessage');
const errorTextSpan = document.getElementById('errorText');

const noteTitleInput = document.getElementById('noteTitle');
const noteDetailsTextarea = document.getElementById('noteDetails');
const addNoteBtn = document.getElementById('addNoteBtn');
const searchDateInput = document.getElementById('searchDate');
const clearSearchBtn = document.getElementById('clearSearchBtn');
const notesContainer = document.getElementById('notesContainer');
const noNotesMessage = document.getElementById('noNotesMessage');
const noSearchResultsMessage = document.getElementById('noSearchResultsMessage');

const openAddEntryBtn = document.getElementById('openAddEntryBtn');
const detailsPanel = document.getElementById('detailsPanel');
const cancelNoteBtn = document.getElementById('cancelNoteBtn');
const overlay = document.getElementById('overlay');
const themeSwitcher = document.getElementById('themeSwitcher');

let currentUser = null;

function displayError(message) {
    errorTextSpan.textContent = message;
    errorMessageDiv.classList.remove('hidden');
}

function clearError() {
    errorMessageDiv.classList.add('hidden');
    errorTextSpan.textContent = '';
}

function openDetailsPanel() {
    detailsPanel.classList.add('active');
    overlay.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
}

function closeDetailsPanel() {
    detailsPanel.classList.remove('active');
    overlay.classList.add('hidden');
    document.body.style.overflow = '';
}

async function renderNotes(filterDate = null) {
    if (!currentUser) return;
    notesContainer.innerHTML = '';
    noNotesMessage.classList.add('hidden');
    noSearchResultsMessage.classList.add('hidden');
    clearError();
    try {
        let notesRef = db.collection('journals').doc(currentUser.uid).collection('notes');
        let query = notesRef.orderBy('timestamp', 'desc');
        if (filterDate) {
            const startDate = new Date(`${filterDate}T00:00:00`);
            const endDate = new Date(`${filterDate}T23:59:59`);
            query = query.where('timestamp', '>=', startDate).where('timestamp', '<=', endDate);
        }
        const snapshot = await query.get();
        const notes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (notes.length === 0) {
            if (filterDate) {
                noSearchResultsMessage.classList.remove('hidden');
            } else {
                noNotesMessage.classList.remove('hidden');
            }
            return;
        }
        notes.forEach(note => {
            const noteCard = document.createElement('div');
            noteCard.className = 'note-card';
            const noteHeader = document.createElement('div');
            noteHeader.className = 'note-header';
            noteHeader.setAttribute('aria-expanded', 'false');
            const noteTitle = document.createElement('h3');
            noteTitle.className = 'note-title';
            noteTitle.textContent = note.title;
            const noteTimestamp = document.createElement('span');
            noteTimestamp.className = 'note-timestamp';
            const date = note.timestamp instanceof firebase.firestore.Timestamp ? note.timestamp.toDate() : new Date(note.timestamp);
            noteTimestamp.textContent = date.toLocaleString();
            noteHeader.appendChild(noteTitle);
            noteHeader.appendChild(noteTimestamp);
            const noteDetails = document.createElement('p');
            noteDetails.className = 'note-details';
            noteDetails.textContent = note.details;
            noteHeader.addEventListener('click', () => {
                noteDetails.classList.toggle('active');
                const isExpanded = noteDetails.classList.contains('active');
                noteHeader.setAttribute('aria-expanded', isExpanded);
            });
            noteCard.appendChild(noteHeader);
            noteCard.appendChild(noteDetails);
            notesContainer.appendChild(noteCard);
        });
    } catch (error) {
        console.error("Error rendering notes:", error);
        displayError("Failed to load notes: " + error.message);
    }
}

async function addNote() {
    if (!currentUser) {
        displayError("You must be logged in to add notes.");
        return;
    }
    clearError();
    const title = noteTitleInput.value.trim();
    const details = noteDetailsTextarea.value.trim();
    if (!title) {
        displayError("Please enter a title for your note.");
        return;
    }
    try {
        await db.collection('journals').doc(currentUser.uid).collection('notes').add({
            title: title,
            details: details,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        noteTitleInput.value = '';
        noteDetailsTextarea.value = '';
        closeDetailsPanel();
    } catch (error) {
        console.error("Error adding note:", error);
        displayError("Failed to add note: " + error.message);
    }
}

async function authenticateUser(isSignUp) {
    clearError();
    const email = authEmailInput.value.trim();
    const password = authPasswordInput.value.trim();
    if (!email || !password) {
        displayError("Please enter both email and password.");
        return;
    }
    try {
        if (isSignUp) {
            await auth.createUserWithEmailAndPassword(email, password);
        } else {
            await auth.signInWithEmailAndPassword(email, password);
        }
    } catch (error) {
        console.error("Authentication error:", error);
        let errorMessage = "Authentication failed.";
        switch (error.code) {
            case 'auth/email-already-in-use':
                errorMessage = 'The email address is already in use by another account.';
                break;
            case 'auth/invalid-email':
                errorMessage = 'The email address is not valid.';
                break;
            case 'auth/operation-not-allowed':
                errorMessage = 'Email/password accounts are not enabled.';
                break;
            case 'auth/weak-password':
                errorMessage = 'The password is too weak (min 6 characters).';
                break;
            case 'auth/user-not-found':
            case 'auth/wrong-password':
                errorMessage = 'Invalid email or password.';
                break;
            default:
                errorMessage = error.message;
        }
        displayError(errorMessage);
    }
}

async function logoutUser() {
    clearError();
    try {
        await auth.signOut();
    } catch (error) {
        console.error("Logout error:", error);
        displayError("Failed to log out: " + error.message);
    }
}

function filterNotesByDate() {
    const selectedDate = searchDateInput.value;
    renderNotes(selectedDate);
}

function clearSearch() {
    searchDateInput.value = '';
    renderNotes();
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('journalTheme', theme);
}

function loadTheme() {
    const savedTheme = localStorage.getItem('journalTheme') || 'default';
    themeSwitcher.value = savedTheme;
    applyTheme(savedTheme);
}

loginBtn.addEventListener('click', () => authenticateUser(false));
signupBtn.addEventListener('click', () => authenticateUser(true));
logoutBtn.addEventListener('click', logoutUser);
addNoteBtn.addEventListener('click', addNote);
searchDateInput.addEventListener('change', filterNotesByDate);
clearSearchBtn.addEventListener('click', clearSearch);
openAddEntryBtn.addEventListener('click', openDetailsPanel);
cancelNoteBtn.addEventListener('click', closeDetailsPanel);
overlay.addEventListener('click', closeDetailsPanel);
themeSwitcher.addEventListener('change', (event) => applyTheme(event.target.value));

auth.onAuthStateChanged(user => {
    currentUser = user;
    clearError();
    if (user) {
        userEmailSpan.textContent = user.email;
        authSection.classList.add('hidden');
        journalSection.classList.remove('hidden');
        db.collection('journals').doc(currentUser.uid).collection('notes')
            .orderBy('timestamp', 'desc')
            .onSnapshot(snapshot => {
                renderNotes(searchDateInput.value || null);
            }, error => {
                console.error("Error getting real-time notes:", error);
                displayError("Real-time notes update failed: " + error.message);
            });
    } else {
        userEmailSpan.textContent = '';
        authSection.classList.remove('hidden');
        journalSection.classList.add('hidden');
        notesContainer.innerHTML = '';
    }
});

loadTheme();