/**
 * useProfile.js — Hook de Perfil de Usuario
 * Contiene dos hooks:
 *   1. useProfile()     → Carga datos del perfil y maneja seguir/dejar de seguir.
 *   2. useEditProfile() → Actualiza los datos del perfil (nombre, username, foto).
 */
import { useState, useEffect } from "react";
import { db } from "../firebase";
import { collection, query, where, onSnapshot, doc, setDoc, arrayUnion, arrayRemove, getDocs, addDoc, serverTimestamp, updateDoc, deleteDoc } from "firebase/firestore";

// ============================================================
// HOOK 1: useProfile — Datos del perfil y lógica de seguimiento
// ============================================================
export function useProfile(user, emailPerfil) {
  const [profileUser, setProfileUser] = useState(null);
  const [targetEmail, setTargetEmail] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [isFollower, setIsFollower] = useState(false);

  /**
   * Efecto 1 — Carga los datos del perfil en tiempo real.
   * Busca por email o por username según el formato del parámetro de la URL.
   */
  useEffect(() => {
    if (!emailPerfil) return;
    let q;
    if (emailPerfil.includes("@")) {
      q = query(collection(db, "users"), where("email", "==", emailPerfil));
    } else {
      q = query(collection(db, "users"), where("username", "==", emailPerfil));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const data = snapshot.docs[0].data();
        setProfileUser({ id: snapshot.docs[0].id, ...data });
        setTargetEmail(data.email);
      } else {
        setTargetEmail(emailPerfil);
      }
    });
    return () => unsubscribe();
  }, [emailPerfil]);

  /**
   * Efecto 2 — Escucha mi estado de seguimiento hacia este perfil.
   * Determina si lo sigo, si tengo solicitud pendiente, o si él me sigue.
   */
  useEffect(() => {
    if (!user || !targetEmail) return;
    const myUserRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(myUserRef, (docSnap) => {
      if (docSnap.exists()) {
        const myData = docSnap.data();
        setIsFollowing(!!(myData.following && myData.following.includes(targetEmail)));
        setIsPending(!!(myData.pendingFollowing && myData.pendingFollowing.includes(targetEmail)));
        setIsFollower(!!(myData.followers && myData.followers.includes(targetEmail)));
      }
    });
    return () => unsubscribe();
  }, [user, targetEmail]);

  /**
   * toggleFollow — Alterna entre seguir, dejar de seguir, o cancelar solicitud.
   * Maneja 3 casos:
   *   1. Ya lo sigo → Dejar de seguir + borrar notificación "follow".
   *   2. Solicitud pendiente → Cancelar solicitud + borrar notificación "follow_request".
   *   3. No lo sigo → Seguir (o enviar solicitud si es cuenta privada).
   */
  const toggleFollow = async () => {
    if (!user || !targetEmail) return;
    const myUserRef = doc(db, "users", user.uid);
    
    let targetUserRef = null;
    if (profileUser && profileUser.id) {
        targetUserRef = doc(db, "users", profileUser.id);
    } else {
        const qTarget = query(collection(db, "users"), where("email", "==", targetEmail));
        const qs = await getDocs(qTarget);
        if(!qs.empty) targetUserRef = doc(db, "users", qs.docs[0].id);
    }
    
    try {
      if (isFollowing) {
        // CASO 1: Dejar de seguir
        await setDoc(myUserRef, { following: arrayRemove(targetEmail) }, { merge: true });
        if (targetUserRef) {
            await setDoc(targetUserRef, { followers: arrayRemove(user.email) }, { merge: true });
        }
        // Borrar notificación de seguimiento para evitar spam
        try {
            const notifQ = query(collection(db, "notifications"), 
                where("type", "==", "follow"), 
                where("senderEmail", "==", user.email),
                where("postOwnerEmail", "==", targetEmail)
            );
            const notifSnap = await getDocs(notifQ);
            notifSnap.forEach((d) => deleteDoc(d.ref));
        } catch (err) {
            console.error("Error al borrar notificación:", err);
        }
      } else if (isPending) {
        // CASO 2: Cancelar solicitud pendiente
        await setDoc(myUserRef, { pendingFollowing: arrayRemove(targetEmail) }, { merge: true });
        if (targetUserRef) {
            await setDoc(targetUserRef, { pendingFollowers: arrayRemove(user.email) }, { merge: true });
        }
        // Borrar notificación de solicitud de seguimiento
        try {
            const notifQ = query(collection(db, "notifications"), 
                where("type", "==", "follow_request"), 
                where("senderEmail", "==", user.email),
                where("postOwnerEmail", "==", targetEmail)
            );
            const notifSnap = await getDocs(notifQ);
            notifSnap.forEach((d) => deleteDoc(d.ref));
        } catch (err) {
            console.error("Error al borrar notificación:", err);
        }
      } else {
        // CASO 3: Seguir (o enviar solicitud si la cuenta es privada)
        if (profileUser?.isPrivate) {
          await setDoc(myUserRef, { pendingFollowing: arrayUnion(targetEmail) }, { merge: true });
          if (targetUserRef) {
              await setDoc(targetUserRef, { pendingFollowers: arrayUnion(user.email) }, { merge: true });
          }
          await addDoc(collection(db, "notifications"), {
            type: "follow_request",
            postOwnerEmail: targetEmail,
            senderEmail: user.email,
            read: false,
            createdAt: serverTimestamp()
          });
        } else {
          await setDoc(myUserRef, { following: arrayUnion(targetEmail) }, { merge: true });
          if (targetUserRef) {
              await setDoc(targetUserRef, { followers: arrayUnion(user.email) }, { merge: true });
          }
          try {
            await addDoc(collection(db, "notifications"), {
              type: "follow",
              postOwnerEmail: targetEmail,
              senderEmail: user.email,
              read: false,
              createdAt: serverTimestamp()
            });
          } catch (err) {
            console.error("Error al enviar notificación de seguimiento:", err);
          }
        }
      }
    } catch (error) {
      console.error("Error al seguir/dejar de seguir:", error);
    }
  };

  return { profileUser, targetEmail, isFollowing, isPending, isFollower, toggleFollow };
}

// ============================================================
// HOOK 2: useEditProfile — Actualización de datos del perfil
// ============================================================
export function useEditProfile() {
    /**
     * updateProfile — Actualiza los campos del documento de usuario en Firestore.
     * Se usa desde EditProfileModal para guardar nombre, username y foto.
     * @param {string} userId — UID del usuario en Firestore.
     * @param {Object} data — Campos a actualizar (username, fullName, photoURL).
     * @returns {Object} { success: boolean, error?: string }
     */
    const updateProfile = async (userId, data) => {
        try {
            const userRef = doc(db, "users", userId);
            await updateDoc(userRef, data);
            return { success: true };
        } catch (error) {
            console.error("Error updating profile:", error);
            return { success: false, error: error.message };
        }
    };
    return { updateProfile };
}
