import { useAuth } from "../../context/AuthContext";
import { Link } from "react-router-dom";
import { useUsers } from "../../hooks/useUsers";
import { useProfile } from "../../hooks/useProfile";

function SuggestionItem({ userObj }) {
  const { user } = useAuth();
  const { isFollowing, isPending, toggleFollow } = useProfile(user, userObj.email);
  
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <Link to={`/profile/${userObj.email}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit", flex: 1 }}>
        <div style={{ width: "40px", height: "40px", borderRadius: "50%", background: "var(--accent-color)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold", overflow: "hidden" }}>
          {userObj.photoURL ? (
            <img src={userObj.photoURL} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          ) : (
            userObj.email.charAt(0).toUpperCase()
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <span style={{ fontWeight: "600", fontSize: "14px" }}>{userObj.username || userObj.email.split('@')[0]}</span>
          <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>{userObj.fullName || "Nuevo en Googram"}</span>
        </div>
      </Link>

      <button 
        onClick={toggleFollow}
        disabled={isFollowing || isPending}
        style={{
          padding: "6px 16px",
          borderRadius: "8px",
          border: "none",
          fontWeight: "600",
          cursor: (isFollowing || isPending) ? "default" : "pointer",
          background: isFollowing ? "transparent" : isPending ? "var(--text-secondary)" : "var(--accent-color)",
          color: isFollowing ? "var(--text-primary)" : "white",
          transition: "all 0.2s ease"
        }}
      >
        {isFollowing ? "Siguiendo" : isPending ? "Pendiente" : "Seguir"}
      </button>
    </div>
  );
}

function Suggestions() {
  const { user } = useAuth();
  const { suggestedUsers, loadingSuggestions: loading } = useUsers(user);

  if (loading) return null;
  if (suggestedUsers.length === 0) return (
    <div style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "40px" }}>
      <h2>¡Ya sigues a todos!</h2>
      <p style={{ marginTop: "10px" }}>Sos el usuario más popular de Googram.</p>
    </div>
  );

  return (
    <div className="suggestions-container" style={{ padding: "20px", background: "var(--bg-surface)", borderRadius: "12px", border: "1px solid var(--border-color)", marginTop: "20px", width: "100%" }}>
      <h3 style={{ marginBottom: "15px", color: "var(--text-secondary)", fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px" }}>
        Sugerencias para ti
      </h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
        {suggestedUsers.map(u => (
          <SuggestionItem key={u.id} userObj={u} />
        ))}
      </div>
    </div>
  );
}

export default Suggestions;
