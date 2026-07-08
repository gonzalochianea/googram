/**
 * usePosts.js — Hook de Publicaciones
 * Contiene dos hooks:
 *   1. usePosts()       → Fetching y escucha de posts (feed, explore, perfil, guardados).
 *   2. usePostActions() → Acciones individuales (like, comentar, borrar, editar, guardar).
 */
import { useState } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, getDocs, limit, startAfter, doc, updateDoc, arrayUnion, arrayRemove, deleteDoc, addDoc, serverTimestamp, setDoc, onSnapshot, where } from "firebase/firestore";

// ============================================================
// HOOK 1: usePosts — Carga y paginación de publicaciones
// ============================================================
export function usePosts(user) {
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [lastVisible, setLastVisible] = useState(null);

    /**
     * fetchPosts — Carga publicaciones del feed con paginación de 5 en 5.
     * Si isNextPage=true, agrega las siguientes 5. Si no, recarga desde cero.
     * @param {boolean} isNextPage — True para cargar la siguiente "página".
     */
    const fetchPosts = async (isNextPage = false) => {
        setLoading(true);
        try {
            let q;
            if (isNextPage && lastVisible) {
                q = query(collection(db, "posts"), orderBy("createdAt", "desc"), startAfter(lastVisible), limit(5));
            } else {
                q = query(collection(db, "posts"), orderBy("createdAt", "desc"), limit(5));
            }

            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                setHasMore(false);
                setLoading(false);
                return;
            }

            const newPosts = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const lastDoc = snapshot.docs[snapshot.docs.length - 1];
            
            setLastVisible(lastDoc);
            
            if (isNextPage) {
                setPosts(prev => [...prev, ...newPosts]);
            } else {
                setPosts(newPosts);
            }
        } catch (error) {
            console.error("Error fetching posts:", error);
        }
        setLoading(false);
    };

    /**
     * resetPagination — Reinicia el estado de paginación.
     * Se llama cuando el usuario cambia de pestaña en el feed.
     */
    const resetPagination = () => {
        setPosts([]);
        setLastVisible(null);
        setHasMore(true);
    };

    // --- EXPLORE: Escucha todos los posts menos los míos, en orden aleatorio ---
    const [explorePosts, setExplorePosts] = useState([]);

    /**
     * startExploreListener — Escucha en tiempo real TODOS los posts
     * y los mezcla aleatoriamente excluyendo los del usuario actual.
     * @returns {Function} unsubscribe
     */
    const startExploreListener = () => {
        if (!user) return () => {};
        const q = query(collection(db, "posts"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let p = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            p = p.filter(post => post.userEmail !== user.email);
            // Algoritmo Fisher-Yates para mezclar aleatoriamente
            for (let i = p.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [p[i], p[j]] = [p[j], p[i]];
            }
            setExplorePosts(p);
        });
        return unsubscribe;
    };

    // --- PROFILE: Escucha los posts de un usuario específico ---
    const [userPosts, setUserPosts] = useState([]);

    /**
     * startUserPostsListener — Escucha en tiempo real los posts de un perfil.
     * @param {string} targetEmail — Email del usuario cuyo perfil estamos viendo.
     * @returns {Function} unsubscribe
     */
    const startUserPostsListener = (targetEmail) => {
        if (!targetEmail) return () => {};
        const q = query(collection(db, "posts"), where("userEmail", "==", targetEmail));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const p = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            p.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            setUserPosts(p);
        });
        return unsubscribe;
    };

    // --- SAVED: Escucha mis posts guardados ---
    const [savedPosts, setSavedPosts] = useState([]);

    /**
     * startSavedPostsListener — Escucha mi subcolección de posts guardados.
     * Solo se activa si estoy viendo mi propio perfil.
     * @param {boolean} isMyProfile — True si el perfil mostrado es el mío.
     * @returns {Function} unsubscribe
     */
    const startSavedPostsListener = (isMyProfile) => {
        if (!isMyProfile || !user) return () => {};
        const savedRef = collection(db, "users", user.uid, "savedPosts");
        const unsubscribe = onSnapshot(savedRef, (snapshot) => {
            const savedData = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            savedData.reverse(); 
            setSavedPosts(savedData);
        });
        return unsubscribe;
    };

    return {
        posts, explorePosts, userPosts, savedPosts, loading, hasMore, fetchPosts, resetPagination, startExploreListener, startUserPostsListener, startSavedPostsListener
    };
}

// ============================================================
// HOOK 2: usePostActions — Acciones sobre un post individual
// ============================================================
export function usePostActions(user) {

    /**
     * likePost — Da o quita "Me gusta" a una publicación.
     * Al dar like, crea una notificación. Al quitar, la borra para evitar spam.
     * @param {string} postId — ID del post.
     * @param {boolean} hasLiked — Si ya tengo like en este post.
     * @param {string} postOwnerEmail — Email del dueño del post (para notificación).
     */
    const likePost = async (postId, hasLiked, postOwnerEmail) => {
        if (!user) return;
        const postRef = doc(db, "posts", postId); 
        try {
            if (hasLiked) {
                await updateDoc(postRef, { likes: arrayRemove(user.uid) });
                // Borrar notificación de like al quitar el like
                try {
                    const notifQ = query(collection(db, "notifications"), 
                        where("type", "==", "like"), 
                        where("senderEmail", "==", user.email),
                        where("postId", "==", postId)
                    );
                    const notifSnap = await getDocs(notifQ);
                    notifSnap.forEach((d) => deleteDoc(d.ref));
                } catch (err) {
                    console.error("Error al borrar notificación de like:", err);
                }
            } else {
                await updateDoc(postRef, { likes: arrayUnion(user.uid) });
                // Crear notificación de Like
                await addDoc(collection(db, "notifications"), {
                    type: "like",
                    postId: postId,
                    postOwnerEmail: postOwnerEmail,
                    senderEmail: user.email,
                    read: false,
                    createdAt: serverTimestamp()
                });
            }
        } catch (error) {
            console.error("Error al dar like:", error);
        }
    };

    /**
     * commentPost — Agrega un comentario a una publicación.
     * Crea una notificación para el dueño del post y ejecuta un callback
     * opcional para procesar menciones (@usuario).
     * @param {string} postId — ID del post.
     * @param {string} commentText — Texto del comentario.
     * @param {string} postOwnerEmail — Email del dueño del post.
     * @param {Function} onMentionCallback — Callback opcional para manejar menciones.
     */
    const commentPost = async (postId, commentText, postOwnerEmail, onMentionCallback) => {
        if (!user) return;
        const postRef = doc(db, "posts", postId);
        try {
            await updateDoc(postRef, {
                comments: arrayUnion({
                    userEmail: user.email,
                    text: commentText
                })
            });
            // Notificación de Comentario
            await addDoc(collection(db, "notifications"), {
                type: "comment",
                postId: postId,
                postOwnerEmail: postOwnerEmail,
                senderEmail: user.email,
                text: commentText,
                read: false,
                createdAt: serverTimestamp()
            });
            
            if (onMentionCallback) {
                await onMentionCallback();
            }
        } catch (error) {
            console.error("Error al comentar:", error);
        }
    };

    /**
     * deleteComment — Borra un comentario de una publicación.
     * @param {string} postId — ID del post.
     * @param {Object} commentToDelete — Objeto del comentario a borrar.
     */
    const deleteComment = async (postId, commentToDelete) => {
        const postRef = doc(db, "posts", postId);
        try {
            await updateDoc(postRef, { comments: arrayRemove(commentToDelete) });
        } catch (error) {
            console.error("Error al borrar comentario:", error);
        }
    };

    /**
     * deletePost — Elimina una publicación completa de la base de datos.
     * @param {string} postId — ID del post a eliminar.
     */
    const deletePost = async (postId) => {
        try {
            await deleteDoc(doc(db, "posts", postId));
        } catch (error) {
            console.error("Error al borrar post:", error);
        }
    };

    /**
     * editPost — Edita la descripción (caption) de una publicación.
     * @param {string} postId — ID del post.
     * @param {string} newCaption — Nueva descripción.
     */
    const editPost = async (postId, newCaption) => {
        try {
            await updateDoc(doc(db, "posts", postId), { caption: newCaption });
        } catch (error) {
            console.error("Error al editar:", error);
        }
    };

    /**
     * toggleSavePost — Guarda o desguarda un post en mi subcolección "savedPosts".
     * @param {string} postId — ID del post.
     * @param {Object} postData — Datos completos del post (para guardar una copia).
     * @param {boolean} isSaved — Si ya lo tengo guardado (para saber si borrar o crear).
     */
    const toggleSavePost = async (postId, postData, isSaved) => {
        if (!user) return;
        const saveRef = doc(db, "users", user.uid, "savedPosts", postId);
        try {
            if (isSaved) {
                await deleteDoc(saveRef);
            } else {
                await setDoc(saveRef, postData);
            }
        } catch (error) {
            console.error("Error al guardar post:", error);
        }
    };

    return {
        likePost, commentPost, deleteComment, deletePost, editPost, toggleSavePost
    };
}
