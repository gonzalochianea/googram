import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc, getDocs } from "firebase/firestore";
import { useNotifications } from "../../hooks/useNotifications";
import { formatTimeAgo } from "../../utils/timeUtils";
import { Heart, MessageCircle, Bell, UserPlus, Check, X } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import "../../styles/Notifications.css";

function Notifications() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [allUsers, setAllUsers] = useState({});
  const [followingMap, setFollowingMap] = useState({});

  const {
    notifications,
    startNotificationsListener,
    handleFollowBack,
    handleAcceptRequest,
    handleRejectRequest
  } = useNotifications(user);

  // Cargar perfiles de usuario para avatares y nombres reales
  useEffect(() => {
    const fetchUsers = async () => {
      const snap = await getDocs(collection(db, "users"));
      const usersMap = {};
      snap.docs.forEach(doc => {
        usersMap[doc.data().email] = { id: doc.id, ...doc.data() };
      });
      setAllUsers(usersMap);
    };
    fetchUsers();
  }, []);

  // Cargar mis seguidos para saber si mostramos "Seguir también"
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().following) {
        const fMap = {};
        docSnap.data().following.forEach(email => fMap[email] = true);
        setFollowingMap(fMap);
      }
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const unsub = startNotificationsListener(true); // true = marcar como leídas
    return () => unsub && unsub();
  }, [user]);

  const handleNotificationClick = (noti) => {
    if (noti.postId) {
      navigate(`/profile/${user.email}`, { state: { openPostId: noti.postId } });
    } else if (noti.storyId) {
      navigate("/", { state: { openStoryId: noti.storyId } });
    } else if (noti.type === "follow") {
      navigate(`/profile/${noti.senderEmail}`);
    }
  };

  const onFollowBack = async (e, senderEmail) => {
    e.stopPropagation();
    const targetProfile = allUsers[senderEmail];
    if (!targetProfile || !targetProfile.id) return;
    setFollowingMap(prev => ({ ...prev, [senderEmail]: true })); // Optimista
    const { success } = await handleFollowBack(senderEmail, targetProfile.id);
    if (!success) {
      setFollowingMap(prev => ({ ...prev, [senderEmail]: false })); // Rollback
    }
  };

  const onAcceptRequest = async (e, noti, senderEmail) => {
    e.stopPropagation();
    const targetProfile = allUsers[senderEmail];
    if (!targetProfile || !targetProfile.id) return;
    await handleAcceptRequest(noti.id, senderEmail, targetProfile.id);
  };

  const onRejectRequest = async (e, noti, senderEmail) => {
    e.stopPropagation();
    const targetProfile = allUsers[senderEmail];
    if (!targetProfile || !targetProfile.id) return;
    await handleRejectRequest(noti.id, senderEmail, targetProfile.id);
  };

  return (
    <div className="notifications-container fade-in">
      <div className="notifications-header">
        Notificaciones
      </div>
      
      <div className="notifications-list">
        
        {/* ALERTAS SOCIALES (Likes y Comentarios) */}
        {notifications.map((noti) => {
          const senderProfile = allUsers[noti.senderEmail];
          return (
            <div 
              key={noti.id} 
              className="notification-item" 
              onClick={() => handleNotificationClick(noti)}
              style={{ cursor: (noti.postId || noti.storyId) ? "pointer" : "default" }}
            >
              
              <div className="notification-avatar" style={senderProfile?.photoURL ? { padding: 0, overflow: 'hidden' } : {}}>
                {senderProfile?.photoURL ? (
                  <img src={senderProfile.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  noti.senderEmail.charAt(0).toUpperCase()
                )}
              </div>
              
              <div className="notification-content">
                <span><strong style={{ textTransform: "capitalize" }}>{senderProfile?.fullName || senderProfile?.username || noti.senderEmail.split('@')[0]}</strong> </span>
              {noti.type === "like" && <span>le dio me gusta a tu foto.</span>}
              {noti.type === "story_like" && <span>le dio me gusta a tu historia.</span>}
              {noti.type === "comment" && <span>comentó: "{noti.text}"</span>}
              {noti.type === "follow" && <span>comenzó a seguirte.</span>}
              {noti.type === "follow_request" && <span>quiere seguirte.</span>}
              <div className="notification-time">{formatTimeAgo(noti.createdAt)}</div>
            </div>

            <div className="notification-icon" style={{ display: "flex", alignItems: "center" }}>
              {/* ICONO */}
              {noti.type === "like" || noti.type === "story_like" ? <Heart size={20} className="notification-icon like" fill="currentColor" /> 
                : noti.type === "follow" ? <UserPlus size={20} color="var(--accent-color)" /> 
                : noti.type === "follow_request" ? <UserPlus size={20} color="var(--text-secondary)" /> 
                : <MessageCircle size={20} />}
              
              {/* BOTONES ACCIÓN PARA FOLLOW REQUEST */}
              {noti.type === "follow_request" && (
                <div style={{ display: "flex", gap: "8px", marginLeft: "15px" }}>
                  <button 
                    onClick={(e) => onAcceptRequest(e, noti, noti.senderEmail)}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", background: "var(--danger-color)", color: "#f8fafc", fontWeight: "600", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    Aceptar
                  </button>
                  <button 
                    onClick={(e) => onRejectRequest(e, noti, noti.senderEmail)}
                    style={{ padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", background: "var(--bg-surface)", color: "var(--text-primary)", fontWeight: "600", fontSize: "12px", border: "1px solid var(--border-color)", display: "flex", alignItems: "center", gap: "4px" }}
                  >
                    X
                  </button>
                </div>
              )}

              {/* BOTÓN SEGUIR TAMBIÉN PARA FOLLOW NORMAL */}
              {noti.type === "follow" && !followingMap[noti.senderEmail] && (
                <button 
                  onClick={(e) => onFollowBack(e, noti.senderEmail)}
                  style={{
                    marginLeft: "15px", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer",
                    background: "var(--danger-color)", color: "#f8fafc", fontWeight: "600", fontSize: "12px"
                  }}
                >
                  Seguir también
                </button>
              )}
            </div>

          </div>
        )})}

        {notifications.length === 0 && (
          <div className="empty-notifications">
            <Bell size={50} strokeWidth={1} />
            <h2>Nada por aquí</h2>
            <p>Todavía no tenés notificaciones nuevas.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
