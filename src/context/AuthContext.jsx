import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

// 1. Creamos un Contexto vacío. Es como una caja fuerte global.
const AuthContext = createContext();

// 2. Este es el componente que va a abrazar a toda tu aplicación
export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // onAuthStateChanged es como un "vigilante" de Firebase.
        // Nos avisa en tiempo real si el usuario entró o salió de su cuenta.
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // REPARADOR DE CUENTAS VIEJAS: Si el usuario existe en Auth pero no en Firestore, lo creamos
                const userRef = doc(db, "users", currentUser.uid);
                const userSnap = await getDoc(userRef);
                if (!userSnap.exists()) {
                    await setDoc(userRef, {
                        uid: currentUser.uid,
                        email: currentUser.email,
                        username: currentUser.email.split('@')[0],
                        createdAt: new Date()
                    });
                }
            }
            setUser(currentUser); // Guardamos al usuario (o null si se fue)
            setLoading(false); // Apagamos la pantalla de carga
        });

        return () => unsubscribe();
    }, []);

    // Mientras Firebase está comprobando la sesión, mostramos esto:
    if (loading) return <h2>Cargando aplicación...</h2>;

    return (
        <AuthContext.Provider value={{ user }}>
            {children}
        </AuthContext.Provider>
    );
}

// 3. Este es el Hook Mágico. 
// Cuando pongas const { user } = useAuth() en cualquier página, vas a saber quién está logueado.
export function useAuth() {
    return useContext(AuthContext);
}
