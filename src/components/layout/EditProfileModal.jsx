import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useEditProfile } from "../../hooks/useProfile";
// (No necesitamos updateEmail/updatePassword aquí, eso vive en Settings)
import { X, Upload, Trash2 } from "lucide-react";
import "../../styles/UploadModal.css"; // Reusamos estilos de modal

function EditProfileModal({ isOpen, onClose, currentProfile }) {
  const { user } = useAuth();
  const { updateProfile } = useEditProfile();
  const [username, setUsername] = useState(currentProfile?.username || user?.email?.split('@')[0] || "");
  const [fullName, setFullName] = useState(currentProfile?.fullName || "");
  const [photoURL, setPhotoURL] = useState(currentProfile?.photoURL || "");
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("image", file);

    try {
      const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY;
      const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (data.success) {
        setPhotoURL(data.data.url);
      }
    } catch (error) {
      console.error("Error subiendo foto", error);
      setError("Error al subir la imagen.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoURL("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const { success, error: updateError } = await updateProfile(user.uid, {
        username: username,
        fullName: fullName,
        photoURL: photoURL
      });

      if (!success) throw new Error(updateError);

      onClose();
      window.location.reload(); // Recargar para aplicar cambios de foto y nombre
    } catch (err) {
      console.error(err);
      setError("Ocurrió un error al guardar los cambios.");
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "400px" }}>
        
        <div className="modal-header">
          <h2>Editar Perfil</h2>
          <button onClick={onClose} className="close-btn">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "15px" }}>
          
          {error && <div style={{ background: "var(--danger-color)", color: "white", padding: "10px", borderRadius: "5px", fontSize: "12px" }}>{error}</div>}

          {/* FOTO DE PERFIL */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
            <div style={{ 
                width: "100px", height: "100px", borderRadius: "50%", background: "var(--border-color)", 
                display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden", fontSize: "40px" 
            }}>
                {photoURL ? (
                    <img src={photoURL} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                    <span>{username.charAt(0).toUpperCase()}</span>
                )}
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
                <label style={{ background: "var(--accent-color)", color: "white", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                    <Upload size={14} /> Subir Foto
                    <input type="file" style={{ display: "none" }} accept="image/*" onChange={handleImageUpload} disabled={isUploading} />
                </label>
                {photoURL && (
                    <button type="button" onClick={handleRemovePhoto} style={{ background: "var(--danger-color)", border: "none", color: "white", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                        <Trash2 size={14} /> Borrar
                    </button>
                )}
            </div>
            {isUploading && <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Subiendo...</span>}
          </div>

          <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "10px 0" }} />

          {/* DATOS */}
          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold" }}>Nombre de Usuario (Público)</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} style={{ padding: "8px", borderRadius: "5px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }} />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
            <label style={{ fontSize: "12px", fontWeight: "bold" }}>Nombre Completo (Real)</label>
            <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Ej: Juan Pérez" style={{ padding: "8px", borderRadius: "5px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)" }} />
          </div>

          <button type="submit" style={{ background: "var(--accent-color)", color: "white", border: "none", padding: "10px", borderRadius: "5px", fontWeight: "bold", cursor: "pointer", marginTop: "10px" }}>
            Guardar Cambios
          </button>

        </form>
      </div>
    </div>
  );
}

export default EditProfileModal;
