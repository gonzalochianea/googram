import { useState, useEffect, useRef, useCallback } from "react";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc } from "firebase/firestore";
import { usePosts } from "../../hooks/usePosts";
import { useAuth } from "../../context/AuthContext";
import Post from "./Post"; 
import StoriesBar from "./StoriesBar"; 
import Suggestions from "./Suggestions";

function Feed() {
  const { user } = useAuth();
  const [following, setFollowing] = useState([]); 
  const [privateUsers, setPrivateUsers] = useState({});
  
  // Custom Hook de Posts
  const { posts: allPosts, loading, hasMore, fetchPosts, resetPagination } = usePosts(user);

  // Pestañas: "explore" o "following"
  const [activeTab, setActiveTab] = useState("following"); 

  // --- INTERSECTION OBSERVER ---
  const observer = useRef();
  const lastPostElementRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchPosts(true); // Cargar siguiente página
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore]);

  // Al cambiar de pestaña, RESETEAMOS todo para cargar desde el principio
  useEffect(() => {
    resetPagination();
    fetchPosts(false);
    // eslint-disable-next-line
  }, [activeTab]);


  // 1.5. CARGAR USUARIOS PARA SABER QUIÉNES SON PRIVADOS
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const privMap = {};
      snapshot.forEach(d => {
        const data = d.data();
        if (data.email) {
          privMap[data.email] = data.isPrivate || false;
        }
      });
      setPrivateUsers(privMap);
    });
    return () => unsubscribe();
  }, []);

  // 2. CARGAR MI LISTA DE SEGUIDOS EN TIEMPO REAL
  useEffect(() => {
    if (!user) return;
    const myUserRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(myUserRef, (docSnap) => {
      if (docSnap.exists() && docSnap.data().following) {
        setFollowing(docSnap.data().following);
      } else {
        setFollowing([]);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 3. FILTRAR LOS POSTS DESCARGADOS SEGÚN LA PESTAÑA ACTIVA
  const displayedPosts = activeTab === "explore" 
    ? allPosts.filter(post => 
        post.userEmail !== user?.email && 
        (following.includes(post.userEmail) || !privateUsers[post.userEmail])
      )
    : allPosts.filter(post => 
        following.includes(post.userEmail) || post.userEmail === user?.email
      );

  // --- FIX DE "AUTO-SCROLL" DE EMERGENCIA ---
  // Si pedimos 5 posts y resulta que TODOS se ocultaron por el filtro (ej. en Para Ti no hay ninguno), 
  // la pantalla queda vacía pero hasMore es true. Forzamos a pedir 5 más inmediatamente.
  useEffect(() => {
    if (!loading && hasMore && allPosts.length > 0 && displayedPosts.length === 0) {
      fetchPosts(true);
    }
    // eslint-disable-next-line
  }, [allPosts, displayedPosts, loading, hasMore]);

  return (
    <div className="fade-in" style={{ width: "100%", maxWidth: "470px", display: "flex", flexDirection: "column" }}>
      
      {/* HISTORIAS (STORIES) */}
      <StoriesBar />

      {/* MENÚ DE PESTAÑAS (PARA TI / EXPLORAR) */}
      <div style={{ display: "flex", justifyContent: "space-around", borderBottom: "1px solid var(--border-color)", marginBottom: "25px", paddingBottom: "10px" }}>
        
        <button 
          onClick={() => setActiveTab("following")}
          style={{ 
            background: "transparent", border: "none", cursor: "pointer", fontSize: "16px",
            fontWeight: activeTab === "following" ? "700" : "500",
            color: activeTab === "following" ? "var(--text-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "following" ? "2px solid var(--text-primary)" : "none",
            paddingBottom: "5px"
          }}>
          Para ti
        </button>

        <button 
          onClick={() => setActiveTab("explore")}
          style={{ 
            background: "transparent", border: "none", cursor: "pointer", fontSize: "16px",
            fontWeight: activeTab === "explore" ? "700" : "500",
            color: activeTab === "explore" ? "var(--text-primary)" : "var(--text-secondary)",
            borderBottom: activeTab === "explore" ? "2px solid var(--text-primary)" : "none",
            paddingBottom: "5px"
          }}>
          Explorar
        </button>

      </div>

      {/* RENDERIZADO DE POSTS */}
      {displayedPosts.length > 0 ? (
        <>
          {displayedPosts.map((post, index) => {
            // Si es el ÚLTIMO post visible en pantalla, le enganchamos el observador
            if (index === displayedPosts.length - 1) {
              return (
                <div ref={lastPostElementRef} key={post.id}>
                  <Post post={post} />
                </div>
              );
            }
            return <Post key={post.id} post={post} />;
          })}
          
          {loading && (
            <div style={{ textAlign: "center", padding: "20px", color: "var(--text-secondary)" }}>
              Cargando más publicaciones...
            </div>
          )}
          
          {!hasMore && (
            <div style={{ textAlign: "center", padding: "30px", color: "var(--text-secondary)", fontSize: "14px" }}>
              ¡Llegaste al final de las publicaciones!
            </div>
          )}
        </>
      ) : (
        !loading && activeTab === "following" ? (
          <div style={{ textAlign: "center", marginTop: "40px", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <h2 style={{ fontSize: "24px", marginBottom: "10px", color: "var(--text-primary)" }}>Bienvenido a Googram</h2>
            <p style={{ color: "var(--text-secondary)", marginBottom: "30px", maxWidth: "350px", lineHeight: "1.5" }}>
              Cuando sigas a otras personas, verás las fotos y los videos que publiquen aquí.
            </p>
            <Suggestions following={following} />
          </div>
        ) : !loading && activeTab === "explore" ? (
          <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "40px" }}>
            <h2>Aún no hay nada para ver</h2>
            <p style={{ marginTop: "10px" }}>Cambiá a la pestaña "Para ti" para buscar personas.</p>
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)" }}>
            Buscando publicaciones...
          </div>
        )
      )}

    </div>
  );
}

export default Feed;
