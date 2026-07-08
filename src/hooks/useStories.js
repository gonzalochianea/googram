/**
 * useStories.js — Hook de Historias (Stories)
 * Maneja la carga, subida, eliminación y acciones (like, respuesta)
 * de las historias efímeras que duran 24 horas.
 */
import { useState } from "react";
import { db } from "../firebase";
import { collection, query, onSnapshot, orderBy, where, addDoc, serverTimestamp, deleteDoc, doc } from "firebase/firestore";

export function useStories(user) {
    const [stories, setStories] = useState([]);
    const [profileActiveStory, setProfileActiveStory] = useState(null);

    /**
     * startFeedStoriesListener — Escucha historias del feed en tiempo real.
     * Solo muestra historias de las últimas 24 horas de personas que sigo o mías.
     * @param {Array} followingList — Lista de emails de personas que sigo.
     * @returns {Function} unsubscribe
     */
    const startFeedStoriesListener = (followingList) => {
        if (!user) return () => {};
        const q = query(collection(db, "stories"), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allStories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const now = Date.now();
            const validStories = allStories.filter(story => {
                if (!story.createdAt) return false;
                if (story.userEmail !== user.email && !followingList.includes(story.userEmail)) return false;
                const differenceInHours = (now - story.createdAt.toMillis()) / (1000 * 60 * 60);
                return differenceInHours < 24;
            });
            setStories(validStories);
        });
        return unsubscribe;
    };

    /**
     * startProfileStoryListener — Escucha la historia activa de un perfil específico.
     * Se usa en Profile.jsx para mostrar el borde de color en el avatar.
     * @param {string} targetEmail — Email del usuario cuyo perfil estamos viendo.
     * @returns {Function} unsubscribe
     */
    const startProfileStoryListener = (targetEmail) => {
        if (!targetEmail) return () => {};
        const q = query(collection(db, "stories"), where("userEmail", "==", targetEmail));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allUserStories = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            const now = Date.now();
            const validStories = allUserStories.filter(story => {
                if (!story.createdAt) return false;
                const diff = (now - story.createdAt.toMillis()) / (1000 * 60 * 60);
                return diff < 24;
            });
            validStories.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            setProfileActiveStory(validStories[0] || null);
        });
        return unsubscribe;
    };

    /**
     * likeStory — Envía una notificación de "me gusta" a la historia de otro usuario.
     * @param {Object} story — Objeto de la historia (contiene id, userEmail, etc).
     */
    const likeStory = async (story) => {
        if (!user || !story) return;
        try {
            await addDoc(collection(db, "notifications"), {
                type: "story_like",
                storyId: story.id,
                postOwnerEmail: story.userEmail,
                senderEmail: user.email,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error al dar like a historia:", e);
        }
    };

    /**
     * replyToStory — Responde a una historia enviando un mensaje directo.
     * El mensaje incluye una miniatura de la historia original.
     * @param {Object} story — Objeto de la historia.
     * @param {string} replyText — Texto de la respuesta.
     */
    const replyToStory = async (story, replyText) => {
        if (!user || !story || !replyText.trim()) return;
        try {
            await addDoc(collection(db, "messages"), {
                sender: user.email,
                receiver: story.userEmail,
                text: replyText,
                storyImageUrl: story.imageUrl,
                read: false,
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.error("Error al responder historia:", e);
        }
    };

    /**
     * deleteStory — Elimina una historia de la base de datos.
     * @param {string} storyId — ID del documento de la historia en Firestore.
     */
    const deleteStory = async (storyId) => {
        if (!storyId) return;
        try {
            await deleteDoc(doc(db, "stories", storyId));
        } catch (error) {
            console.error("Error al borrar historia:", error);
            throw error;
        }
    };

    /**
     * uploadStory — Sube una nueva historia a la colección de stories.
     * @param {string} imageUrl — URL de la imagen subida a imgBB.
     */
    const uploadStory = async (imageUrl) => {
        if (!user || !imageUrl) return;
        try {
            await addDoc(collection(db, "stories"), {
                userId: user.uid,
                userEmail: user.email,
                imageUrl: imageUrl,
                createdAt: serverTimestamp()
            });
        } catch (error) {
            console.error("Error al subir historia:", error);
            throw error;
        }
    };

    return {
        stories, profileActiveStory,
        startFeedStoriesListener, startProfileStoryListener,
        likeStory, replyToStory, deleteStory, uploadStory
    };
}
