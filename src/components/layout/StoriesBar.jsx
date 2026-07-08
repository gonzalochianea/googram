import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc } from "firebase/firestore";
import { X, Heart, Send, Plus, Trash2 } from "lucide-react";
import { useStories } from "../../hooks/useStories";
import "../../styles/StoriesBar.css";

function StoriesBar() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const {
      stories,
      startFeedStoriesListener,
      likeStory,
      replyToStory,
      deleteStory
  } = useStories(user);

  const [activeStory, setActiveStory] = useState(null); // La historia que se está viendo en grande
  const [allUsers, setAllUsers] = useState({}); // Para obtener avatares y nombres reales
  const [replyText, setReplyText] = useState("");
  const [likedStories, setLikedStories] = useState({}); // Para recordar a cuáles le di like localmente

  // Auto-avance de historias
  const [progress, setProgress] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [following, setFollowing] = useState([]); // A quiénes sigo

  // CARGAR MIS SEGUIDOS
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists() && docSnap.data().following) {
        setFollowing(docSnap.data().following);
      } else {
        setFollowing([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // OBTENER TODOS LOS USUARIOS (PARA AVATARES Y NOMBRES)
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersMap = {};
      snapshot.forEach(d => {
        const data = d.data();
        if (data.email) usersMap[data.email] = data;
      });
      setAllUsers(usersMap);
    });
    return () => unsubscribe();
  }, []);

  // CARGAR HISTORIAS EN TIEMPO REAL
  useEffect(() => {
    const unsub = startFeedStoriesListener(following);
    return () => unsub && unsub();
  }, [user, following]);

  // NAVEGACIÓN DESDE NOTIFICACIONES O PERFILES: Abrir historia automáticamente
  useEffect(() => {
    if (location.state?.openStory) {
      setActiveStory(location.state.openStory);
      navigate(".", { replace: true, state: {} });
    } else if (location.state?.openStoryId && stories.length > 0) {
      const storyToOpen = stories.find(s => s.id === location.state.openStoryId);
      if (storyToOpen) {
        setActiveStory(storyToOpen);
        navigate(".", { replace: true, state: {} });
      } else {
        alert("La historia ya no está disponible.");
        navigate(".", { replace: true, state: {} });
      }
    }
  }, [location.state, stories, navigate]);

  // Agrupamos las historias por usuario en orden cronológico (las más viejas primero)
  const userGroups = [];
  const groupedStories = new Map();
  const chronologicalStories = [...stories].reverse();

  chronologicalStories.forEach(story => {
    if (!groupedStories.has(story.userEmail)) {
      groupedStories.set(story.userEmail, []);
      userGroups.unshift(story.userEmail); // Ponemos a los de actividad reciente al principio
    }
    groupedStories.get(story.userEmail).push(story);
  });

  // LÓGICA DE AUTO-AVANCE
  const handleNextStory = () => {
    if (!activeStory) return;
    const userStoryList = groupedStories.get(activeStory.userEmail);
    if (!userStoryList) {
       setActiveStory(null);
       return;
    }

    const currentIndex = userStoryList.findIndex(s => s.id === activeStory.id);
    
    if (currentIndex >= 0 && currentIndex < userStoryList.length - 1) {
      // Siguiente historia del MISMO usuario
      setActiveStory(userStoryList[currentIndex + 1]);
    } else {
      // Siguiente USUARIO
      const currentUserIndex = userGroups.indexOf(activeStory.userEmail);
      if (currentUserIndex >= 0 && currentUserIndex < userGroups.length - 1) {
        const nextUserEmail = userGroups[currentUserIndex + 1];
        setActiveStory(groupedStories.get(nextUserEmail)[0]);
      } else {
        setActiveStory(null);
      }
    }
  };

  useEffect(() => {
    setProgress(0);
  }, [activeStory]);

  useEffect(() => {
    if (!activeStory || isPaused) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          handleNextStory();
          return 100;
        }
        return prev + 1; // 1% cada 50ms = 5 segundos
      });
    }, 50);

    return () => clearInterval(interval);
  }, [activeStory, isPaused, userGroups]);

  // Verifica si yo (el usuario actual) tengo una historia activa
  const myActiveStory = groupedStories.has(user?.email) ? groupedStories.get(user?.email)[0] : null;

  // INTERACCIONES CON HISTORIAS
  const handleLikeStory = async () => {
    if (!user || !activeStory || likedStories[activeStory.id]) return;
    setLikedStories(prev => ({...prev, [activeStory.id]: true}));
    await likeStory(activeStory);
  };

  const handleReplyStory = async (e) => {
    e.preventDefault();
    if (!user || !activeStory || !replyText.trim()) return;
    await replyToStory(activeStory, replyText);
    setReplyText("");
    setActiveStory(null);
    alert("Respuesta enviada a Mensajes Directos.");
  };

  const handleDeleteStory = async () => {
    if (!activeStory) return;
    const confirmDelete = window.confirm("¿Seguro que querés borrar esta historia?");
    if (!confirmDelete) return;
    await deleteStory(activeStory.id);
    setActiveStory(null);
  };

  return (
    <>
      <div className="stories-container fade-in">
        
        {/* CÍRCULO DEL USUARIO ACTUAL (Para agregar o ver) */}
        <div 
          className="story-item"
          onClick={() => {
            if (myActiveStory) {
              setActiveStory(myActiveStory);
            } else {
              document.dispatchEvent(new CustomEvent("openStoryUpload"));
            }
          }}
        >
          <div className={`story-avatar-container ${myActiveStory ? 'active' : 'empty'}`}>
            <div className="story-avatar-inner" style={allUsers[user?.email]?.photoURL ? { padding: 0, overflow: 'hidden' } : {}}>
              {allUsers[user?.email]?.photoURL ? (
                <img src={allUsers[user?.email].photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                user?.email.charAt(0).toUpperCase()
              )}
            </div>
            {!myActiveStory && (
              <div className="add-story-btn">+</div>
            )}
          </div>
          <span className="story-username">Tu historia</span>
        </div>

        {/* CÍRCULOS DE LOS DEMÁS USUARIOS */}
        {userGroups.map(email => {
          if (email === user?.email) return null; // Ya me mostré al principio
          const storyUser = allUsers[email];
          const firstStoryOfUser = groupedStories.get(email)[0];
          return (
            <div 
              key={email} 
              className="story-item"
              onClick={() => setActiveStory(firstStoryOfUser)}
            >
              <div className="story-avatar-container active">
                <div className="story-avatar-inner" style={storyUser?.photoURL ? { padding: 0, overflow: 'hidden' } : {}}>
                  {storyUser?.photoURL ? (
                    <img src={storyUser.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    email.charAt(0).toUpperCase()
                  )}
                </div>
              </div>
              <span className="story-username">
                {storyUser?.username || email.split('@')[0]}
              </span>
            </div>
          );
        })}
      </div>

      {/* VISOR DE HISTORIAS (PANTALLA COMPLETA) */}
      {activeStory && (
        <div className="story-viewer-overlay" onClick={() => setActiveStory(null)}>
          <button className="story-viewer-close" onClick={() => setActiveStory(null)}>
            <X size={35} />
          </button>
          
          <div 
            className="story-viewer-content fade-in" 
            style={{ display: "flex", flexDirection: "column", height: "100%", maxHeight: "90vh", justifyContent: "space-between", position: "relative" }}
            onPointerDown={() => setIsPaused(true)}
            onPointerUp={() => setIsPaused(false)}
            onPointerLeave={() => setIsPaused(false)}
            onClick={(e) => e.stopPropagation()}
          >
            
            {/* BARRA DE PROGRESO */}
            <div className="story-progress-container">
              <div className="story-progress-bar" style={{ width: `${progress}%` }}></div>
            </div>

            <div className="story-viewer-header" style={{ display: "flex", alignItems: "center", gap: "10px", padding: "15px", background: "linear-gradient(to bottom, rgba(0,0,0,0.8), transparent)", color: "white", zIndex: 2, marginTop: "15px" }}>
              <div 
                style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}
                onClick={(e) => {
                  e.stopPropagation();
                  setActiveStory(null);
                  navigate(`/profile/${allUsers[activeStory.userEmail]?.username || activeStory.userEmail}`);
                }}
              >
                <div className="story-avatar-container active" style={{ width: "40px", height: "40px" }}>
                  <div className="story-avatar-inner" style={allUsers[activeStory.userEmail]?.photoURL ? { padding: 0, overflow: 'hidden' } : {}}>
                    {allUsers[activeStory.userEmail]?.photoURL ? (
                      <img src={allUsers[activeStory.userEmail].photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      activeStory.userEmail.charAt(0).toUpperCase()
                    )}
                  </div>
                </div>
                <span style={{ fontWeight: "bold", textTransform: 'capitalize' }}>
                  {allUsers[activeStory.userEmail]?.fullName || allUsers[activeStory.userEmail]?.username || activeStory.userEmail.split('@')[0]}
                </span>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', flex: 1, alignItems: 'center' }}>
                  
                  {activeStory.userEmail === user?.email && (
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        onClick={() => {
                          setActiveStory(null);
                          document.dispatchEvent(new Event("openStoryUpload"));
                        }} 
                        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '5px' }}
                        title="Añadir otra historia"
                      >
                        <Plus size={20} />
                      </button>
                      <button 
                        onClick={handleDeleteStory} 
                        style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer', padding: '5px' }}
                        title="Borrar historia"
                      >
                        <Trash2 size={20} color="#ff4444" />
                      </button>
                    </div>
                  )}
              </div>
            </div>
            
            <img 
              src={activeStory.imageUrl} 
              alt="Story" 
              className="story-viewer-image" 
              style={{ flex: 1, objectFit: "contain", width: "100%", zIndex: 1, cursor: "pointer" }} 
              onClick={handleNextStory}
            />
            
            {/* FOOTER DE INTERACCIÓN (Solo si la historia no es mía) */}
            {activeStory.userEmail !== user?.email && (
              <div style={{ display: "flex", alignItems: "center", gap: "15px", padding: "15px", background: "linear-gradient(to top, rgba(0,0,0,0.8), transparent)", zIndex: 2 }}>
                <form onSubmit={handleReplyStory} style={{ flex: 1, display: "flex", position: "relative" }}>
                  <input 
                    type="text" 
                    placeholder={`Responder a ${allUsers[activeStory.userEmail]?.username || activeStory.userEmail.split('@')[0]}...`}
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    style={{ width: "100%", padding: "12px 40px 12px 20px", borderRadius: "30px", border: "1px solid rgba(255,255,255,0.3)", background: "rgba(0,0,0,0.4)", color: "white", outline: "none" }}
                  />
                  {replyText.trim() && (
                    <button type="submit" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "white", cursor: "pointer" }}>
                      <Send size={20} />
                    </button>
                  )}
                </form>
                <button onClick={handleLikeStory} style={{ background: "none", border: "none", cursor: "pointer", color: likedStories[activeStory.id] ? "var(--danger-color)" : "white" }}>
                  <Heart size={28} fill={likedStories[activeStory.id] ? "currentColor" : "none"} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default StoriesBar;
