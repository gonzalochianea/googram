import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// La configuración de Firebase extraída de la consola
const firebaseConfig = {
  apiKey: "AIzaSyBk82CM6tSRDyyP3skdnb4qlqKs2SBEEDI",
  authDomain: "googram-cdcdd.firebaseapp.com",
  projectId: "googram-cdcdd",
  storageBucket: "googram-cdcdd.firebasestorage.app",
  messagingSenderId: "944377862090",
  appId: "1:944377862090:web:667a7326ec72a7ee8a2133"
};

// Inicializar la aplicación de Firebase
const app = initializeApp(firebaseConfig);

// Exportar los servicios para usarlos en el resto de la app
export const auth = getAuth(app);         // Para el Login y Registro
export const db = getFirestore(app);      // Para guardar los Posts, Likes y Comentarios
export const storage = getStorage(app);   // Para guardar los archivos de las fotos

export default app;
