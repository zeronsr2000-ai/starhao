window.STARHORIZON_FIREBASE_CONFIG = {
  apiKey: "AIzaSyBbp2puGk4xguRGHB7HTI3HZ9e96VCW25g",
  authDomain: "starhao-8f494.firebaseapp.com",
  projectId: "starhao-8f494",
  storageBucket: "starhao-8f494.firebasestorage.app",
  messagingSenderId: "1098920597138",
  storageUploadsEnabled: false,
};

if (window.firebase && !window.firebase.apps.length) {
  window.firebase.initializeApp(window.STARHORIZON_FIREBASE_CONFIG);
}
