import { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, query, getDocs } from "firebase/firestore";
import { X } from "lucide-react";
import { Link } from "react-router-dom";
import "../../styles/UploadModal.css";

function UserListModal({ isOpen, onClose, title, userEmails }) {
  const [usersInfo, setUsersInfo] = useState([]);

  useEffect(() => {
    if (!isOpen || !userEmails || userEmails.length === 0) {
        setUsersInfo([]);
        return;
    }

    const fetchUsers = async () => {
      const q = query(collection(db, "users"));
      const snapshot = await getDocs(q);
      const allUsers = snapshot.docs.map(d => d.data());
      
      const filtered = allUsers.filter(u => userEmails.includes(u.email));
      setUsersInfo(filtered);
    };

    fetchUsers();
  }, [isOpen, userEmails]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "400px", minHeight: "300px" }}>
        
        <div className="modal-header">
          <h2>{title}</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <div style={{ padding: "0 10px 20px 10px", display: "flex", flexDirection: "column", gap: "10px", maxHeight: "400px", overflowY: "auto" }}>
            {usersInfo.map(u => (
                <Link to={`/profile/${u.email}`} key={u.email} onClick={onClose} className="user-list-item">
                    <div className="user-list-avatar">
                        {u.photoURL ? (
                            <img src={u.photoURL} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                            u.email.charAt(0).toUpperCase()
                        )}
                    </div>
                    <div className="user-list-info">
                        <span className="user-list-fullname">{u.fullName || u.username || u.email.split('@')[0]}</span>
                        <span className="user-list-username">@{u.username || u.email.split('@')[0]}</span>
                    </div>
                </Link>
            ))}
            {usersInfo.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "20px" }}>No hay usuarios para mostrar.</p>
            )}
        </div>

      </div>
    </div>
  );
}

export default UserListModal;
