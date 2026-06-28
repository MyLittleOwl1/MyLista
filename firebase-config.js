// firebase-config.j


const firebaseConfig = {
    apiKey: "AIzaSyBE-AsTc2p2KeC_kmhR1W0mfZ2w0VxV7d0",
    authDomain: "mylista-d8995.firebaseapp.com",
    projectId: "mylista-d8995",
    storageBucket: "mylista-d8995.firebasestorage.app",
    messagingSenderId: "967746007647",
    appId: "1:967746007647:web:0b4436fe0c911600e0a1ea"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Firestore
const db = firebase.firestore();

// Auth
const auth = firebase.auth();

// Persistencia permanente
auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
