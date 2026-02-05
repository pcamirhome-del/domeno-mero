
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, set, get, child, update } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAfa0GjDgly16Uq-FQK97da_dGpiSWYokA",
  authDomain: "domeno-mero.firebaseapp.com",
  databaseURL: "https://domeno-mero-default-rtdb.firebaseio.com",
  projectId: "domeno-mero",
  storageBucket: "domeno-mero.firebasestorage.app",
  messagingSenderId: "984905347607",
  appId: "1:984905347607:web:0d993d689a2e5f2e87e252",
  measurementId: "G-TGZT9KJTH7"
};

export const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export { ref, set, get, child, update };

console.log("Firebase & Database initialized");
