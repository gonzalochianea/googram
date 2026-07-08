import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Heart, MessageCircle, X } from "lucide-react";
import Post from "../layout/Post";
import { usePosts } from "../../hooks/usePosts";
import "../../styles/Explore.css";

function Explore() {
  const { user } = useAuth();
  const { explorePosts, startExploreListener } = usePosts(user);
  const [selectedPost, setSelectedPost] = useState(null);

  useEffect(() => {
    const unsubscribe = startExploreListener();
    return () => unsubscribe && unsubscribe();
  }, [user]);

  return (
    <div className="explore-container fade-in">
      <h1 className="explore-header">Explorar</h1>
      
      <div className="explore-grid">
        {explorePosts.map(post => (
          <div key={post.id} className="explore-item" onClick={() => setSelectedPost(post)}>
            {post.imageUrls && post.imageUrls.length > 0 && (
               <img src={post.imageUrls[0]} alt="Explore" className={`explore-image ${post.filterClass || ""}`} />
            )}
            <div className="explore-overlay">
                <div className="explore-stat">
                    <Heart fill="white" size={20} />
                    <span>{post.likes ? post.likes.length : 0}</span>
                </div>
                <div className="explore-stat">
                    <MessageCircle fill="white" size={20} />
                    <span>{post.comments ? post.comments.length : 0}</span>
                </div>
            </div>
          </div>
        ))}
      </div>

      {explorePosts.length === 0 && (
          <div style={{ textAlign: "center", marginTop: "50px", color: "var(--text-secondary)" }}>
              No hay publicaciones para explorar en este momento.
          </div>
      )}

      {/* VISOR A PANTALLA COMPLETA DEL POST */}
      {selectedPost && (
        <div className="fullscreen-overlay fade-in" onClick={() => setSelectedPost(null)} style={{ zIndex: 99999, overflowY: 'auto', padding: '20px' }}>
          <button className="fullscreen-close" onClick={() => setSelectedPost(null)}>
            <X size={35} />
          </button>
          <div className="modal-post-container" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '470px', marginTop: '40px' }}>
            <Post post={explorePosts.find(p => p.id === selectedPost.id) || selectedPost} />
          </div>
        </div>
      )}
    </div>
  );
}

export default Explore;
