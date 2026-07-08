/**
 * useNotifications.js — Hook de Notificaciones
 * Maneja la escucha en tiempo real de notificaciones (likes, comentarios,
 * follows, solicitudes de seguimiento) y las acciones de respuesta
 * (seguir de vuelta, aceptar/rechazar solicitudes).
 */
import { useState } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, updateDoc, setDoc, arrayUnion, arrayRemove, serverTimestamp, addDoc, deleteDoc } from "firebase/firestore";

export function useNotifications(user) {
    const [notifications, setNotifications] = useState([]);
    const [unreadNotisCount, setUnreadNotisCount] = useState(0);

    /**
     * startNotificationsListener — Escucha las notificaciones dirigidas a mí en tiempo real.
     * Filtra las auto-notificaciones (no te avisamos de tus propias acciones).
     * @param {boolean} markAsReadAutomatically — Si true, marca todas como leídas al recibirlas
     *   (se usa cuando el usuario está en la página de Notificaciones).
     * @returns {Function} unsubscribe — Función para dejar de escuchar.
     */
    const startNotificationsListener = (markAsReadAutomatically = false) => {
        if (!user) return () => {};
        const q = query(collection(db, "notifications"), where("postOwnerEmail", "==", user.email));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const notis = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            notis.sort((a, b) => b.createdAt?.toMillis() - a.createdAt?.toMillis());
            const filteredNotis = notis.filter(n => n.senderEmail !== user.email);
            setNotifications(filteredNotis);

            if (markAsReadAutomatically) {
                filteredNotis.forEach(async (noti) => {
                    if (noti.read === false) {
                        try {
                            await updateDoc(doc(db, "notifications", noti.id), { read: true });
                        } catch (e) {
                            console.error("Error marcando notif como leída:", e);
                        }
                    }
                });
            } else {
                // Solo contamos no leídas si NO estamos en la página de notificaciones
                let count = 0;
                filteredNotis.forEach(noti => {
                    if (noti.read === false) count++;
                });
                setUnreadNotisCount(count);
            }
        });
        return unsubscribe;
    };

    /**
     * handleFollowBack — Seguir de vuelta a alguien que me empezó a seguir.
     * Actualiza las listas de following/followers en ambos documentos de usuario
     * y crea una notificación de follow para el otro usuario.
     * @param {string} senderEmail — Email de quien me siguió.
     * @param {string} targetProfileId — UID del documento del otro usuario en Firestore.
     * @returns {Object} { success: boolean }
     */
    const handleFollowBack = async (senderEmail, targetProfileId) => {
        if (!user || !targetProfileId) return { success: false };
        try {
            const myUserRef = doc(db, "users", user.uid);
            const targetUserRef = doc(db, "users", targetProfileId);
            
            await setDoc(myUserRef, { following: arrayUnion(senderEmail) }, { merge: true });
            await setDoc(targetUserRef, { followers: arrayUnion(user.email) }, { merge: true });

            await addDoc(collection(db, "notifications"), {
                type: "follow",
                postOwnerEmail: senderEmail,
                senderEmail: user.email,
                read: false,
                createdAt: serverTimestamp()
            });
            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false };
        }
    };

    /**
     * handleAcceptRequest — Aceptar una solicitud de seguimiento (cuentas privadas).
     * Mueve al solicitante de pendingFollowers a followers, y actualiza
     * la notificación de "follow_request" a "follow".
     * @param {string} notiId — ID de la notificación de solicitud.
     * @param {string} senderEmail — Email de quien envió la solicitud.
     * @param {string} targetProfileId — UID del documento del solicitante.
     * @returns {Object} { success: boolean }
     */
    const handleAcceptRequest = async (notiId, senderEmail, targetProfileId) => {
        if (!user || !targetProfileId) return { success: false };
        try {
            const myUserRef = doc(db, "users", user.uid);
            const targetUserRef = doc(db, "users", targetProfileId);

            await setDoc(myUserRef, { followers: arrayUnion(senderEmail), pendingFollowers: arrayRemove(senderEmail) }, { merge: true });
            await setDoc(targetUserRef, { following: arrayUnion(user.email), pendingFollowing: arrayRemove(user.email) }, { merge: true });

            await updateDoc(doc(db, "notifications", notiId), { type: "follow" });
            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false };
        }
    };

    /**
     * handleRejectRequest — Rechazar una solicitud de seguimiento.
     * Quita al solicitante de las listas de pendientes en ambos documentos
     * y elimina la notificación de la base de datos.
     * @param {string} notiId — ID de la notificación de solicitud.
     * @param {string} senderEmail — Email de quien envió la solicitud.
     * @param {string} targetProfileId — UID del documento del solicitante.
     * @returns {Object} { success: boolean }
     */
    const handleRejectRequest = async (notiId, senderEmail, targetProfileId) => {
        if (!user || !targetProfileId) return { success: false };
        try {
            const myUserRef = doc(db, "users", user.uid);
            const targetUserRef = doc(db, "users", targetProfileId);

            await setDoc(myUserRef, { pendingFollowers: arrayRemove(senderEmail) }, { merge: true });
            await setDoc(targetUserRef, { pendingFollowing: arrayRemove(user.email) }, { merge: true });

            await deleteDoc(doc(db, "notifications", notiId));
            return { success: true };
        } catch (err) {
            console.error(err);
            return { success: false };
        }
    };

    return {
        notifications, unreadNotisCount,
        startNotificationsListener,
        handleFollowBack, handleAcceptRequest, handleRejectRequest
    };
}
