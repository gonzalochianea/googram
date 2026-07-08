/**
 * useUsers.js — Hook de Usuarios
 * Maneja la carga de todos los usuarios (para el buscador)
 * y las sugerencias de "A quién seguir" (excluyendo a quienes ya sigo).
 */
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, getDocs, doc, getDoc } from "firebase/firestore";

export function useUsers(user) {
    const [allUsers, setAllUsers] = useState([]);
    
    /**
     * fetchAllUsers — Descarga la lista completa de usuarios registrados.
     * Se usa en la Sidebar para alimentar el buscador de usuarios.
     */
    const fetchAllUsers = async () => {
        try {
            const snap = await getDocs(collection(db, "users"));
            setAllUsers(snap.docs.map(doc => doc.data()));
        } catch (error) {
            console.error("Error al cargar usuarios:", error);
        }
    };

    // --- SUGERENCIAS DE "A QUIÉN SEGUIR" ---
    const [suggestedUsers, setSuggestedUsers] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(true);

    /**
     * Efecto — Calcula las sugerencias automáticamente al cargar.
     * Filtra usuarios que no soy yo y que no sigo, los mezcla aleatoriamente
     * y devuelve hasta 5 sugerencias.
     */
    useEffect(() => {
        if (!user) return;
        const fetchSuggestions = async () => {
            setLoadingSuggestions(true);
            try {
                // Obtener mi lista de seguidos
                const myUserRef = doc(db, "users", user.uid);
                const myUserSnap = await getDoc(myUserRef);
                const myFollowing = myUserSnap.exists() ? (myUserSnap.data().following || []) : [];

                // Obtener todos los usuarios de la base de datos
                const usersRef = collection(db, "users");
                const snapshot = await getDocs(usersRef);
                
                // Filtrar: No yo mismo, ni usuarios que ya sigo
                let suggestions = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    if (data.email !== user.email && !myFollowing.includes(data.email)) {
                        suggestions.push({ id: doc.id, ...data });
                    }
                });

                // Algoritmo Fisher-Yates para mezclar aleatoriamente
                for (let i = suggestions.length - 1; i > 0; i--) {
                    const j = Math.floor(Math.random() * (i + 1));
                    [suggestions[i], suggestions[j]] = [suggestions[j], suggestions[i]];
                }
                
                setSuggestedUsers(suggestions.slice(0, 5));
            } catch (error) {
                console.error("Error al cargar sugerencias:", error);
            }
            setLoadingSuggestions(false);
        };
        fetchSuggestions();
    }, [user]);

    return { allUsers, fetchAllUsers, suggestedUsers, loadingSuggestions };
}
