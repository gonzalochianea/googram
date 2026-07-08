/**
 * useMessages.js — Hook de Mensajes Directos
 * Maneja toda la lógica de chat: enviar, editar, borrar mensajes,
 * vaciar chats y escuchar mensajes no leídos en tiempo real.
 */
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, deleteDoc, writeBatch, where } from "firebase/firestore";

export function useMessages(user) {
    const [messages, setMessages] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    /**
     * startMessagesListener — Escucha TODOS los mensajes en tiempo real.
     * Se usa en la página de Messages para tener la lista completa.
     * @returns {Function} unsubscribe — Función para dejar de escuchar.
     */
    const startMessagesListener = () => {
        const q = query(collection(db, "messages"), orderBy("createdAt", "asc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const allMsgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            setMessages(allMsgs);
        });
        return unsubscribe;
    };

    /**
     * startUnreadListener — Escucha los mensajes no leídos dirigidos a mí.
     * Alimenta el contador rojo de la campanita en la Sidebar.
     * @returns {Function} unsubscribe — Función para dejar de escuchar.
     */
    const startUnreadListener = () => {
        if (!user) return () => {};
        const q = query(collection(db, "messages"), where("receiver", "==", user.email));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            let count = 0;
            snapshot.forEach(d => {
                if (d.data().read === false) count++;
            });
            setUnreadCount(count);
        });
        return unsubscribe;
    };

    /**
     * sendMessage — Envía un mensaje nuevo a otro usuario.
     * @param {string} receiverEmail — Email del destinatario.
     * @param {string} text — Contenido del mensaje.
     */
    const sendMessage = async (receiverEmail, text) => {
        if (!user || !text.trim() || !receiverEmail) return;
        try {
            await addDoc(collection(db, "messages"), {
                sender: user.email,
                receiver: receiverEmail,
                text: text,
                createdAt: serverTimestamp(),
                read: false
            });
        } catch (error) {
            console.error("Error al enviar mensaje:", error);
        }
    };

    /**
     * markAsRead — Marca un mensaje individual como leído.
     * Se dispara automáticamente cuando el usuario abre un chat.
     * @param {string} msgId — ID del documento del mensaje en Firestore.
     */
    const markAsRead = async (msgId) => {
        try {
            await updateDoc(doc(db, "messages", msgId), { read: true });
        } catch (error) {
            console.error("Error marking as read", error);
        }
    };

    /**
     * deleteMessage — Borra un mensaje individual de la base de datos.
     * @param {string} msgId — ID del documento del mensaje en Firestore.
     */
    const deleteMessage = async (msgId) => {
        try {
            await deleteDoc(doc(db, "messages", msgId));
        } catch (error) {
            console.error("Error al borrar mensaje:", error);
        }
    };

    /**
     * editMessage — Edita el texto de un mensaje ya enviado.
     * Marca el mensaje con isEdited=true para mostrar "(Editado)".
     * @param {string} msgId — ID del documento del mensaje.
     * @param {string} newText — Nuevo contenido del mensaje.
     */
    const editMessage = async (msgId, newText) => {
        if (!newText.trim()) return;
        try {
            await updateDoc(doc(db, "messages", msgId), {
                text: newText,
                isEdited: true
            });
        } catch (error) {
            console.error("Error al editar mensaje:", error);
        }
    };

    /**
     * clearChat — Vacía un chat completo borrando todos los mensajes en batch.
     * Se usa desde el botón "Vaciar Chat" en la cabecera del chat.
     * @param {Array} chatMessages — Array con los mensajes del chat actual.
     */
    const clearChat = async (chatMessages) => {
        try {
            const batch = writeBatch(db);
            chatMessages.forEach(msg => {
                const ref = doc(db, "messages", msg.id);
                batch.delete(ref);
            });
            await batch.commit();
        } catch (error) {
            console.error("Error al vaciar chat:", error);
        }
    };

    return {
        messages, unreadCount,
        startMessagesListener, startUnreadListener,
        sendMessage, markAsRead, deleteMessage, editMessage, clearChat
    };
}
