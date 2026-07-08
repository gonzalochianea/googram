import { useState, useEffect } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase";
import { signOut } from "firebase/auth";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { Grid, Bookmark, X, Plus, Menu, Settings as SettingsIcon, LogOut } from "lucide-react";
import EditProfileModal from "../layout/EditProfileModal";
import UserListModal from "../layout/UserListModal";
import Post from "../layout/Post";
import { useProfile } from "../../hooks/useProfile";
import { usePosts } from "../../hooks/usePosts";
import { useStories } from "../../hooks/useStories";
import "../../styles/Profile.css";

function Profile() {
  const { emailPerfil } = useParams(); // Puede ser un email o un username
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // Custom Hooks
  const { profileUser, targetEmail, isFollowing, isPending, isFollower, toggleFollow } = useProfile(user, emailPerfil);
  const { userPosts: posts, savedPosts, startUserPostsListener, startSavedPostsListener } = usePosts(user);
  const { profileActiveStory, startProfileStoryListener } = useStories(user);
  
  const isMyProfile = user?.email === targetEmail;

  const [activeTab, setActiveTab] = useState("posts");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al salir:", error);
    }
  };

  // Modales
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isListModalOpen, setIsListModalOpen] = useState(false);
  const [listModalTitle, setListModalTitle] = useState("");
  const [listModalEmails, setListModalEmails] = useState([]);

  // Visor de Post Completo
  const [selectedPost, setSelectedPost] = useState(null);

  // 1. CARGAR FOTOS DEL PERFIL Y GUARDADOS
  useEffect(() => {
    const unsubscribePosts = startUserPostsListener(targetEmail);
    return () => unsubscribePosts && unsubscribePosts();
  }, [targetEmail]);

  useEffect(() => {
    const unsubscribeSaved = startSavedPostsListener(isMyProfile);
    return () => unsubscribeSaved && unsubscribeSaved();
  }, [isMyProfile, user]);

  // NAVEGACIÓN DESDE NOTIFICACIONES: Abrir post automáticamente
  useEffect(() => {
    if (location.state?.openPostId && posts.length > 0) {
      const postToOpen = posts.find(p => p.id === location.state.openPostId);
      if (postToOpen) {
        setSelectedPost(postToOpen);
        navigate(".", { replace: true, state: {} });
      }
    }
  }, [location.state, posts, navigate]);

  // CARGAR HISTORIA ACTIVA DEL USUARIO
  useEffect(() => {
    const unsub = startProfileStoryListener(targetEmail);
    return () => unsub && unsub();
  }, [targetEmail]);

  // CERRAR MODAL SI CAMBIA LA RUTA
  useEffect(() => {
    setSelectedPost(null);
  }, [location.pathname]);

  const handleFollowToggle = async () => {
    await toggleFollow();
  };

  const openFollowersList = () => {
      if (followersCount === 0) return;
      setListModalTitle("Seguidores");
      setListModalEmails(profileUser.followers || []);
      setIsListModalOpen(true);
  }

  const openFollowingList = () => {
      if (followingCount === 0) return;
      setListModalTitle("Seguidos");
      setListModalEmails(profileUser.following || []);
      setIsListModalOpen(true);
  }

  const followersCount = profileUser?.followers?.length || 0;
  const followingCount = profileUser?.following?.length || 0;

  if (!targetEmail) {
    return <div style={{ padding: "40px", textAlign: "center" }}>Cargando perfil...</div>;
  }

  return (
    <div className="profile-container fade-in">
      
      {/* --- CABECERA --- */}
      <div className="profile-header" style={{ position: "relative" }}>
        
        {/* MENÚ HAMBURGUESA MÓVIL */}
        {isMyProfile && (
          <div className="mobile-hamburger-menu hide-on-desktop" style={{ position: "absolute", top: "10px", right: "10px", zIndex: 100 }}>
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              style={{ background: "transparent", border: "none", color: "var(--text-primary)", cursor: "pointer", padding: "5px" }}
            >
              <Menu size={28} />
            </button>
            {isMenuOpen && (
              <div className="fade-in" style={{ position: "absolute", top: "40px", right: "0", background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", boxShadow: "var(--shadow-md)", display: "flex", flexDirection: "column", minWidth: "180px", overflow: "hidden" }}>
                <button onClick={() => navigate("/settings")} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "15px", background: "transparent", border: "none", borderBottom: "1px solid var(--border-color)", color: "var(--text-primary)", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                  <SettingsIcon size={18} /> Configuración
                </button>
                <button onClick={handleLogout} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "15px", background: "transparent", border: "none", color: "var(--danger-color)", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }}>
                  <LogOut size={18} /> Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        )}
        
        <div 
          className={`story-avatar-container ${(profileActiveStory && (isMyProfile || !profileUser?.isPrivate || isFollowing)) ? 'active' : 'empty'}`}
          style={{ width: "150px", height: "150px", cursor: (profileActiveStory && (isMyProfile || !profileUser?.isPrivate || isFollowing)) || (isMyProfile && !profileActiveStory) ? "pointer" : "default", flexShrink: 0, position: "relative" }}
          onClick={() => {
            if (profileActiveStory && (isMyProfile || !profileUser?.isPrivate || isFollowing)) {
              navigate("/", { state: { openStory: profileActiveStory } });
            } else if (isMyProfile && !profileActiveStory) {
              document.dispatchEvent(new Event("openStoryUpload"));
            }
          }}
        >
            <div className="story-avatar-inner" style={{ padding: profileUser?.photoURL ? 0 : 'auto', overflow: 'hidden', background: 'var(--bg-surface)' }}>
                {profileUser?.photoURL ? (
                <img src={profileUser.photoURL} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                <span style={{ fontSize: '60px' }}>{profileUser?.username?.charAt(0).toUpperCase() || targetEmail.charAt(0).toUpperCase()}</span>
                )}
            </div>
            
            {isMyProfile && !profileActiveStory && (
               <div style={{
                   position: 'absolute',
                   bottom: '5px',
                   right: '5px',
                   background: 'var(--accent-color)',
                   color: 'white',
                   borderRadius: '50%',
                   width: '35px',
                   height: '35px',
                   display: 'flex',
                   justifyContent: 'center',
                   alignItems: 'center',
                   boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
                   border: '4px solid var(--bg-main)',
                   zIndex: 10
               }}>
                   <Plus size={20} strokeWidth={3} />
               </div>
            )}
        </div>

        <div className="profile-info" style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
          
          <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap", marginBottom: "5px" }}>
            <span style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: "500", letterSpacing: "0.5px" }}>
                @{profileUser?.username || targetEmail.split('@')[0]}
            </span>
            
            {isMyProfile && (
              <button 
                onClick={() => setIsEditModalOpen(true)}
                style={{ padding: "6px 16px", borderRadius: "8px", border: "1px solid var(--text-primary)", background: "transparent", color: "var(--text-primary)", fontWeight: "bold", cursor: "pointer", fontSize: "14px" }}
              >
                Editar perfil
              </button>
            )}
            
            {!isMyProfile && (
              <div style={{ display: "flex", gap: "10px", marginLeft: "10px" }}>
                  <button 
                    onClick={handleFollowToggle}
                    style={{
                      padding: "8px 24px",
                      borderRadius: "8px",
                      border: isFollowing ? "1px solid var(--border-color)" : "none",
                      background: isFollowing ? "var(--bg-surface)" : isPending ? "var(--text-secondary)" : "var(--danger-color)",
                      color: isFollowing ? "var(--text-primary)" : "#f8fafc",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "14px",
                      transition: "all 0.2s ease"
                    }}
                  >
                    {isFollowing ? 'Siguiendo' : isPending ? 'Pendiente' : isFollower ? 'Seguir también' : 'Seguir'}
                  </button>
                  
                  <button 
                    onClick={() => navigate("/messages", { state: { chatWith: targetEmail } })}
                    style={{
                      padding: "8px 24px",
                      borderRadius: "8px",
                      border: "1px solid var(--text-primary)",
                      background: "transparent",
                      color: "var(--text-primary)",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: "14px",
                      transition: "all 0.2s ease"
                    }}
                  >
                    Mensaje
                  </button>
              </div>
            )}
          </div>
          
          <h2 style={{ margin: "0 0 15px 0", fontSize: "28px", fontWeight: "800", color: "var(--text-primary)", textTransform: "capitalize" }}>
            {profileUser?.fullName || profileUser?.username || targetEmail.split('@')[0]}
          </h2>
          
          <div className="profile-stats">
            <span style={{ cursor: "default" }}><strong>{posts.length}</strong> publicaciones</span>
            <span onClick={openFollowersList} style={{ cursor: followersCount > 0 ? "pointer" : "default" }}><strong>{followersCount}</strong> seguidores</span>
            <span onClick={openFollowingList} style={{ cursor: followingCount > 0 ? "pointer" : "default" }}><strong>{followingCount}</strong> seguidos</span>
          </div>
          
        </div>
      </div>

      <hr className="profile-divider" />

      <div style={{ display: "flex", justifyContent: "center", gap: "50px", marginBottom: "20px" }}>
        
        <button 
          onClick={() => setActiveTab("posts")}
          style={{ 
            display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer",
            fontWeight: activeTab === "posts" ? "700" : "500",
            color: activeTab === "posts" ? "var(--text-primary)" : "var(--text-secondary)",
            borderTop: activeTab === "posts" ? "1px solid var(--text-primary)" : "none",
            paddingTop: "15px",
            textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px"
          }}>
          <Grid size={14} /> PUBLICACIONES
        </button>

        {isMyProfile && (
          <button 
            onClick={() => setActiveTab("saved")}
            style={{ 
              display: "flex", alignItems: "center", gap: "8px", background: "transparent", border: "none", cursor: "pointer",
              fontWeight: activeTab === "saved" ? "700" : "500",
              color: activeTab === "saved" ? "var(--text-primary)" : "var(--text-secondary)",
              borderTop: activeTab === "saved" ? "1px solid var(--text-primary)" : "none",
              paddingTop: "15px",
              textTransform: "uppercase", fontSize: "12px", letterSpacing: "1px"
            }}>
            <Bookmark size={14} /> GUARDADAS
          </button>
        )}
      </div>

      {!isMyProfile && profileUser?.isPrivate && !isFollowing ? (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '64px', marginBottom: '15px' }}>🔒</div>
          <h3 style={{ margin: '0 0 10px 0', color: 'var(--text-primary)' }}>Esta cuenta es privada</h3>
          <p style={{ margin: 0 }}>Sigue a este usuario para ver sus fotos.</p>
        </div>
      ) : (
        <div className="profile-grid">
          {activeTab === "posts" && posts.map(post => (
            <div key={post.id} className="grid-item" onClick={() => setSelectedPost(post)}>
              {post.imageUrls && post.imageUrls.length > 0 && (
                 <img src={post.imageUrls[0]} alt="Post" className={`grid-image ${post.filterClass || ""}`} />
              )}
              <div className="grid-overlay"></div>
            </div>
          ))}
          
          {activeTab === "saved" && savedPosts.map(post => (
            <div key={post.id} className="grid-item" onClick={() => setSelectedPost(post)}>
              {post.imageUrls && post.imageUrls.length > 0 && (
                 <img src={post.imageUrls[0]} alt="Saved Post" className={`grid-image ${post.filterClass || ""}`} />
              )}
              <div className="grid-overlay"></div>
            </div>
          ))}
          
          {activeTab === "posts" && posts.length === 0 && (
            <div className="empty-state">
              Este usuario todavía no subió fotos.
            </div>
          )}
        </div>
      )}  
        {activeTab === "saved" && savedPosts.length === 0 && (
          <div className="empty-state">
            Todavía no guardaste nada. Las fotos que guardes son privadas.
          </div>
        )}

      {selectedPost && (
        <div className="fullscreen-overlay fade-in" onClick={() => setSelectedPost(null)} style={{ zIndex: 99999, overflowY: 'auto', padding: '20px' }}>
          <button className="fullscreen-close" onClick={() => setSelectedPost(null)}>
            <X size={35} />
          </button>
          <div className="modal-post-container" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '470px', marginTop: '40px' }}>
            <Post post={posts.find(p => p.id === selectedPost.id) || savedPosts.find(p => p.id === selectedPost.id) || selectedPost} />
          </div>
        </div>
      )}

      <EditProfileModal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        currentProfile={profileUser}
      />

      <UserListModal 
        isOpen={isListModalOpen}
        onClose={() => setIsListModalOpen(false)}
        title={listModalTitle}
        userEmails={listModalEmails}
      />

    </div>
  );
}

export default Profile;
