import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../context/AuthContext";
import { doc, collection, addDoc, serverTimestamp, onSnapshot, query, where, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { Link } from "react-router-dom";
import { Heart, MessageCircle, ChevronLeft, ChevronRight, Trash2, Edit2, Check, X, Bookmark } from "lucide-react";
import { usePostActions } from "../../hooks/usePosts";
import { formatTimeAgo } from "../../utils/timeUtils";
import "../../styles/Post.css";

function Post({ post: initialPost }) {
  const [post, setPost] = useState(initialPost);

  // MANTENER EL POST ACTUALIZADO EN TIEMPO REAL (Soluciona el bug de los likes)
  useEffect(() => {
    const postRef = doc(db, "posts", initialPost.id);
    const unsubscribe = onSnapshot(postRef, (docSnap) => {
      if (docSnap.exists()) {
        setPost({ id: docSnap.id, ...docSnap.data() });
      }
    });
    return () => unsubscribe();
  }, [initialPost.id]);

  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [commentText, setCommentText] = useState("");
  const [isFullscreen, setIsFullscreen] = useState(false); // Estado para visor de foto
  const [postOwner, setPostOwner] = useState(null); // Datos del creador (foto, username)
  
  // Estados para la Edición
  const [isEditing, setIsEditing] = useState(false);
  const [editedCaption, setEditedCaption] = useState(post.caption);
  
  // Estado para Guardados
  const [isSaved, setIsSaved] = useState(false);
  
  const { user } = useAuth(); 
  
  // Custom Hook
  const { likePost, commentPost, deleteComment, deletePost, editPost, toggleSavePost } = usePostActions(user);
  
  // Estado para Modal de Confirmación de Borrado
  const [confirmDelete, setConfirmDelete] = useState(null);
  
  const hasLiked = post.likes && post.likes.includes(user.uid);
  
  // VERIFICADOR DE DUEÑO: ¿El que está logueado es el dueño del post?
  const isOwner = user.email === post.userEmail; 

  // OBTENER DATOS DEL DUEÑO DEL POST (Para el avatar y nombre real)
  useEffect(() => {
    const fetchOwner = async () => {
      const q = query(collection(db, "users"), where("email", "==", post.userEmail));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        setPostOwner(querySnapshot.docs[0].data());
      }
    };
    fetchOwner();
  }, [post.userEmail]);

  // --- LÓGICA DE GUARDADOS ---
  // Escuchamos en tiempo real si yo tengo este post guardado en mi subcolección
  useEffect(() => {
    if (!user) return;
    const saveRef = doc(db, "users", user.uid, "savedPosts", post.id);
    const unsubscribe = onSnapshot(saveRef, (docSnap) => {
      setIsSaved(docSnap.exists());
    });
    return () => unsubscribe();
  }, [user, post.id]);

  const toggleSave = async () => {
    await toggleSavePost(post.id, post, isSaved);
  };

  // --- MENCIONES ---
  const extractMentions = (text) => {
    if (!text) return [];
    const mentions = text.match(/@\w+/g) || [];
    return [...new Set(mentions.map(m => m.substring(1)))];
  };

  const sendMentionNotifications = async (text, postId, isComment = false) => {
    const usernames = extractMentions(text);
    if (usernames.length === 0) return;

    for (const un of usernames) {
      const q = query(collection(db, "users"), where("username", "==", un));
      const qs = await getDocs(q);
      if (!qs.empty) {
        const targetEmail = qs.docs[0].data().email;
        if (targetEmail !== user.email) {
          await addDoc(collection(db, "notifications"), {
            type: "mention",
            postId: postId,
            postOwnerEmail: targetEmail, 
            senderEmail: user.email,
            text: isComment ? text : "",
            read: false,
            createdAt: serverTimestamp()
          });
        }
      }
    }
  };

  const renderTextWithMentions = (text) => {
    if (!text) return text;
    const parts = text.split(/(@\w+)/g);
    return parts.map((part, i) => {
      if (part.startsWith('@') && part.length > 1) {
        const username = part.substring(1);
        return (
          <Link key={i} to={`/profile/${username}`} style={{ color: 'var(--accent-color)', textDecoration: 'none', fontWeight: '600' }} onClick={(e) => e.stopPropagation()}>
            {part}
          </Link>
        );
      }
      return part;
    });
  };

  // --- 1. LÓGICA DE LIKES ---
  const handleToggleLike = async () => {
    await likePost(post.id, hasLiked, post.userEmail);
  };

  // --- 2. LÓGICA DE COMENTARIOS ---
  const handleAddComment = async (e) => {
    e.preventDefault(); 
    if (commentText.trim() === "") return; 

    await commentPost(post.id, commentText, post.userEmail, async () => {
        await sendMentionNotifications(commentText, post.id, true);
    });
    setCommentText(""); 
  };

  const handleDeleteComment = (commentToDelete) => {
    setConfirmDelete({ type: 'comment', data: commentToDelete });
  };

  const executeDeleteComment = async () => {
    if (confirmDelete?.type === 'comment') {
      await deleteComment(post.id, confirmDelete.data);
      setConfirmDelete(null);
    }
  };

  // --- 3. LÓGICA DE CRUD DEL POST ---
  const handleDeletePost = () => {
    setConfirmDelete({ type: 'post' });
  };

  const executeDeletePost = async () => {
    if (confirmDelete?.type === 'post') {
      await deletePost(post.id);
      setConfirmDelete(null);
    }
  };

  const handleSaveEdit = async () => {
    await editPost(post.id, editedCaption);
    setIsEditing(false); // Cerramos el modo edición
  };


  // --- CARRUSEL ---
  const nextImage = () => {
    if (currentImageIndex < post.imageUrls.length - 1) setCurrentImageIndex(currentImageIndex + 1);
  };
  const prevImage = () => {
    if (currentImageIndex > 0) setCurrentImageIndex(currentImageIndex - 1);
  };

  return (
    <div className="post-card fade-in">
      
      {/* CABECERA CON BOTONES DE DUEÑO */}
      <div className="post-header" style={{ justifyContent: "space-between" }}>
        
        {/* Izquierda: Info del usuario */}
        <Link to={`/profile/${post.userEmail}`} className="post-user-info">
          <div className="post-avatar" style={postOwner?.photoURL ? { padding: 0, overflow: 'hidden' } : {}}>
            {postOwner?.photoURL ? (
              <img src={postOwner.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              post.userEmail.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <span className="post-username">{postOwner?.username || post.userEmail.split('@')[0]}</span>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>• {formatTimeAgo(post.createdAt)}</span>
            </div>
            {post.location && (
              <span style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                {post.location}
              </span>
            )}
          </div>
        </Link>
        
        {/* Derecha: Botones de Editar y Borrar (SOLO SI ES EL DUEÑO) */}
        {isOwner && (
            <div style={{ display: "flex", gap: "10px" }}>
                <button 
                  onClick={() => setIsEditing(!isEditing)} 
                  title="Editar descripción"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-secondary)" }}>
                    <Edit2 size={18} />
                </button>
                <button 
                  onClick={handleDeletePost} 
                  title="Borrar publicación"
                  style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--danger-color)" }}>
                    <Trash2 size={18} />
                </button>
            </div>
        )}
      </div>

      {/* FOTO / CARRUSEL */}
      <div className="post-image-container">
        {currentImageIndex > 0 && (
          <button onClick={prevImage} className="carousel-btn left">
             <ChevronLeft size={20} />
          </button>
        )}
        {post.imageUrls && post.imageUrls.length > 0 && (
          <img 
            src={post.imageUrls[currentImageIndex]} 
            alt="Post content" 
            className={`post-image ${post.filterClass || ""} cursor-zoom`} 
            onClick={() => setIsFullscreen(true)}
          />
        )}
        {currentImageIndex < post.imageUrls.length - 1 && (
          <button onClick={nextImage} className="carousel-btn right">
             <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* FOOTER */}
      <div className="post-footer">
        
        {/* BOTONES */}
        <div className="post-actions" style={{ display: "flex", justifyContent: "space-between" }}>
          
          <div style={{ display: "flex", gap: "16px" }}>
            <button onClick={handleToggleLike} className="action-btn" style={{ color: hasLiked ? 'var(--danger-color)' : 'var(--text-primary)' }}>
              <Heart size={26} fill={hasLiked ? "currentColor" : "none"} strokeWidth={hasLiked ? 0 : 1.5} />
            </button>
            <button className="action-btn">
              <MessageCircle size={26} strokeWidth={1.5} />
            </button>
          </div>
          
          {/* BOTÓN DE GUARDAR (A la derecha) */}
          <button onClick={toggleSave} className="action-btn" style={{ color: isSaved ? 'var(--text-primary)' : 'var(--text-primary)' }}>
            <Bookmark size={26} fill={isSaved ? "currentColor" : "none"} strokeWidth={isSaved ? 0 : 1.5} />
          </button>
          
        </div>
        
        <p className="likes-count">{post.likes ? post.likes.length : 0} Me gusta</p>
        
        {/* CAPTION CON MODO EDICIÓN */}
        <div className="post-caption-area">
          <span className="post-username" style={{ marginRight: '8px' }}>{postOwner?.username || post.userEmail.split('@')[0]}</span>
          {isEditing ? (
              <div style={{ display: "flex", gap: "10px", marginBottom: "8px", alignItems: "center" }}>
                  <input 
                      type="text" 
                      value={editedCaption} 
                      onChange={(e) => setEditedCaption(e.target.value)} 
                      style={{ flex: 1, padding: "8px", borderRadius: "6px", border: "1px solid var(--border-color)", outline: "none" }}
                      autoFocus
                  />
                  <button onClick={handleSaveEdit} style={{ background: "transparent", border: "none", cursor: "pointer", color: "#28a745" }}><Check size={20} /></button>
                  <button onClick={() => setIsEditing(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--danger-color)" }}><X size={20} /></button>
              </div>
          ) : (
              <span className="post-caption">{renderTextWithMentions(post.caption)}</span>
          )}
        </div>
        
        {/* LISTA DE COMENTARIOS CON BOTÓN DE BORRAR */}
        <div className="comments-list">
          {post.comments && post.comments.map((c, index) => (
            <div key={index} className="comment-item" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0 }}>
                <Link to={`/profile/${c.userEmail}`} className="comment-user" style={{ fontWeight: 'bold', marginRight: '6px', textDecoration: 'none', color: 'inherit' }}>
                  {c.userEmail.split('@')[0]}
                </Link>
                <span className="comment-text">{renderTextWithMentions(c.text)}</span>
              </p>
              
              {/* Solo mostramos la basurita si el comentario es MÍO */}
              {c.userEmail === user?.email && (
                  <button 
                    onClick={() => handleDeleteComment(c)} 
                    style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--danger-color)", opacity: 0.7 }}
                    title="Borrar comentario">
                      <Trash2 size={14} />
                  </button>
              )}
            </div>
          ))}
        </div>

        {/* FORMULARIO COMENTARIO */}
        <form onSubmit={handleAddComment} className="comment-form">
          <input 
            type="text" 
            placeholder="Agrega un comentario..." 
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            className="comment-input"
          />
          <button type="submit" disabled={!commentText.trim()} className="comment-submit">
            Publicar
          </button>
        </form>

      </div>

      {/* VISOR A PANTALLA COMPLETA */}
      {isFullscreen && createPortal(
        <div className="fullscreen-overlay fade-in" onClick={() => setIsFullscreen(false)}>
          <button className="fullscreen-close" onClick={() => setIsFullscreen(false)}>
            <X size={35} />
          </button>
          <img 
            src={post.imageUrls[currentImageIndex]} 
            alt="Fullscreen" 
            className={`fullscreen-image ${post.filterClass || ""}`}
            onClick={(e) => e.stopPropagation()} 
          />
        </div>,
        document.body
      )}

      {/* CUSTOM CONFIRM MODAL (Portal para evitar z-index issues) */}
      {confirmDelete && createPortal(
        <div className="fullscreen-overlay fade-in" style={{ zIndex: 100001, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '350px', background: 'var(--liquid-bg-color)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
            <button 
              onClick={() => setConfirmDelete(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            
            <h3 style={{ color: 'var(--text-primary)', marginBottom: '15px', textAlign: 'center' }}>
              {confirmDelete.type === 'comment' ? "¿Borrar comentario?" : "¿Borrar publicación?"}
            </h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5', textAlign: 'center' }}>
              {confirmDelete.type === 'comment' 
                ? "Esta acción no se puede deshacer." 
                : "¿Estás 100% seguro de que querés borrar esta publicación para siempre?"}
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--text-primary)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}>
                Cancelar
              </button>
              <button 
                onClick={confirmDelete.type === 'comment' ? executeDeleteComment : executeDeletePost} 
                style={{ flex: 1, padding: '10px 15px', borderRadius: '8px', border: 'none', background: 'var(--danger-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}

export default Post;
