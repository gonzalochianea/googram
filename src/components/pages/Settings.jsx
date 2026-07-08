import { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { auth, db } from "../../firebase";
import { updatePassword, updateEmail, deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { collection, query, where, getDocs, writeBatch, doc, getDoc, updateDoc, deleteDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { Palette, ShieldAlert, Moon, Sun, Lock, X } from "lucide-react";
import "../../styles/Settings.css";

function Settings() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("appearance");
  const [isPrivate, setIsPrivate] = useState(false);
  
  // Estado para el modal de eliminar cuenta
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState(null);

  // Cargar estado de privacidad actual
  useEffect(() => {
    if (!user) return;
    const loadPrivacyStatus = async () => {
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists() && userSnap.data().isPrivate !== undefined) {
        setIsPrivate(userSnap.data().isPrivate);
      }
    };
    loadPrivacyStatus();
  }, [user]);

  const handleTogglePrivacy = async () => {
    if (!user) return;
    const newValue = !isPrivate;
    setIsPrivate(newValue); // Optimistic UI
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { isPrivate: newValue });
    } catch (e) {
      console.error(e);
      setIsPrivate(!newValue); // Revert on failure
      alert("Error al actualizar la privacidad");
    }
  };

  // --- 1. APARIENCIA ---
  const [isDark, setIsDark] = useState(() => localStorage.getItem("darkMode") === "true");

  useEffect(() => {
    if (isDark) {
      document.body.classList.add("dark-theme");
      localStorage.setItem("darkMode", "true");
    } else {
      document.body.classList.remove("dark-theme");
      localStorage.setItem("darkMode", "false");
    }
  }, [isDark]);

  // Asegurar que el color de acento sea el clásico de Googram
  useEffect(() => {
    document.documentElement.style.setProperty('--accent-color', '#0095f6');
    localStorage.removeItem("accentColor");
  }, []);


  // --- 2. SEGURIDAD ---
  const [newEmail, setNewEmail] = useState("");
  const [emailStatus, setEmailStatus] = useState("");

  const handleChangeEmail = async (e) => {
    e.preventDefault();
    if (!newEmail || newEmail.includes(" ")) {
        setEmailStatus("El email no puede contener espacios.");
        return;
    }
    if (newEmail === user.email) return;
    try {
        await updateEmail(auth.currentUser, newEmail);
        setEmailStatus("¡Email actualizado con éxito!");
        setNewEmail("");
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            setEmailStatus("Debes cerrar sesión y volver a entrar para cambiar tu email.");
        } else if (error.code === 'auth/email-already-in-use') {
            setEmailStatus("Este correo ya está en uso por otra cuenta.");
        } else {
            setEmailStatus("Error al actualizar: " + error.message);
        }
    }
  };

  const [newPassword, setNewPassword] = useState("");
  const [passwordStatus, setPasswordStatus] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    const passwordRegex = /^(?=.*[0-9]).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
        setPasswordStatus("Debe tener al menos 8 caracteres y contener 1 número.");
        return;
    }
    try {
        await updatePassword(auth.currentUser, newPassword);
        setPasswordStatus("¡Contraseña actualizada con éxito!");
        setNewPassword("");
    } catch (error) {
        if (error.code === 'auth/requires-recent-login') {
            setPasswordStatus("Por seguridad, debes cerrar sesión y volver a entrar para cambiar tu contraseña.");
        } else {
            setPasswordStatus("Error al actualizar: " + error.message);
        }
    }
  };

  const handleDeleteAccountClick = () => {
    setIsDeleteModalOpen(true);
    setDeletePassword("");
    setDeleteError(null);
  };

  const handleConfirmDelete = async (e) => {
    e.preventDefault();
    if (!deletePassword) return;
    setDeleteError(null);
    
    try {
        // Re-autenticar al usuario por seguridad
        const credential = EmailAuthProvider.credential(user.email, deletePassword);
        await reauthenticateWithCredential(auth.currentUser, credential);
        
        // Eliminar perfil de la base de datos pública (para que no salga en búsquedas)
        await deleteDoc(doc(db, "users", user.uid));

        // Borrar cuenta definitivamente de Firebase Auth
        await deleteUser(auth.currentUser);
        setIsDeleteModalOpen(false);
        // El AuthContext detectará que no hay usuario y mandará a /login
    } catch (error) {
        console.error(error);
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            setDeleteError("La contraseña es incorrecta.");
        } else {
            setDeleteError("Error al eliminar cuenta: " + error.message);
        }
    }
  };

  return (
    <div className="fade-in" style={{ paddingBottom: "50px" }}>
      <h1 style={{ marginBottom: "20px" }}>Configuración</h1>
      
      <div className="settings-container">
        
        {/* MENÚ LATERAL */}
        <div className="settings-sidebar">
          <button 
            className={`settings-tab ${activeTab === 'appearance' ? 'active' : ''}`}
            onClick={() => setActiveTab("appearance")}
          >
            <Palette size={20} /> Apariencia
          </button>
          
          <button 
            className={`settings-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => setActiveTab("security")}
          >
            <ShieldAlert size={20} /> Seguridad
          </button>
          
          <button 
            className={`settings-tab ${activeTab === 'privacy' ? 'active' : ''}`}
            onClick={() => setActiveTab("privacy")}
          >
            <Lock size={20} /> Privacidad
          </button>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="settings-content">
          
          {/* TAB: APARIENCIA */}
          {activeTab === "appearance" && (
            <div className="fade-in">
              <h2 className="settings-section-title">Apariencia</h2>
              
              <div className="settings-group">
                <h3>Tema de la Aplicación</h3>
                <p className="settings-description">Elegí si preferís navegar con colores claros u oscuros.</p>
                <button 
                  onClick={() => setIsDark(!isDark)} 
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "12px 20px", borderRadius: "8px", border: "1px solid var(--border-color)", background: "var(--bg-body)", color: "var(--text-primary)", cursor: "pointer", fontWeight: "600" }}
                >
                  {isDark ? <Sun size={20} color="#f5a623" /> : <Moon size={20} />}
                  {isDark ? "Cambiar a Modo Claro" : "Cambiar a Modo Oscuro"}
                </button>
              </div>
            </div>
          )}

          {/* TAB: SEGURIDAD */}
          {activeTab === "security" && (
            <div className="fade-in">
              <h2 className="settings-section-title">Seguridad</h2>
              
              <div className="settings-group">
                <h3>Cambiar Correo de Acceso</h3>
                <p className="settings-description">Tu correo actual es <strong>{user?.email}</strong>.</p>
                <form onSubmit={handleChangeEmail}>
                  <input 
                    type="email" 
                    placeholder="Nuevo correo electrónico"
                    className="settings-input"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <br />
                  <button type="submit" className="btn-primary" style={{ marginTop: "10px" }}>Actualizar Correo</button>
                </form>
                {emailStatus && <p style={{ marginTop: "10px", color: emailStatus.includes("éxito") ? "green" : "var(--danger-color)", fontSize: "14px" }}>{emailStatus}</p>}
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "40px 0" }} />

              <div className="settings-group">
                <h3>Cambiar Contraseña</h3>
                <p className="settings-description">Asegurate de usar una contraseña fuerte y que no uses en otros sitios.</p>
                <form onSubmit={handleChangePassword}>
                  <input 
                    type="password" 
                    placeholder="Nueva contraseña (mín. 8 caracteres, 1 número)"
                    className="settings-input"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                  <br />
                  <button type="submit" className="btn-primary">Actualizar Contraseña</button>
                </form>
                {passwordStatus && <p style={{ marginTop: "10px", color: passwordStatus.includes("éxito") ? "green" : "var(--danger-color)", fontSize: "14px" }}>{passwordStatus}</p>}
              </div>

              <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "40px 0" }} />
              
              <div className="settings-group">
                <h3>Eliminar Cuenta</h3>
                <p className="settings-description">Esta acción es irreversible y borrará todos tus datos. Procede con extrema precaución.</p>
                <button onClick={handleDeleteAccountClick} style={{ background: "var(--danger-color)", color: "white", padding: "12px 20px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: "600" }}>
                  Eliminar Cuenta
                </button>
              </div>
            </div>
          )}

          {/* TAB: PRIVACIDAD */}
          {activeTab === "privacy" && (
            <div className="fade-in">
              <h2 className="settings-section-title">Privacidad de la Cuenta</h2>
              
              <div className="settings-group">
                <h3>Cuenta Privada</h3>
                <p className="settings-description">
                  Cuando tu cuenta es privada, solo las personas que te sigan podrán ver tus fotos. 
                  Tus seguidores actuales no se verán afectados.
                </p>
                
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '20px', padding: '15px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                  <span style={{ fontWeight: '600' }}>{isPrivate ? 'La cuenta es PRIVADA' : 'La cuenta es PÚBLICA'}</span>
                  <button 
                    onClick={handleTogglePrivacy}
                    style={{
                      width: '50px', height: '28px', borderRadius: '15px', border: 'none', cursor: 'pointer',
                      background: isPrivate ? 'var(--accent-color)' : 'var(--text-secondary)',
                      position: 'relative', transition: 'background 0.3s ease'
                    }}
                  >
                    <div style={{
                      width: '24px', height: '24px', borderRadius: '50%', background: 'white',
                      position: 'absolute', top: '2px', left: isPrivate ? '24px' : '2px', transition: 'left 0.3s ease'
                    }} />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MODAL ELIMINAR CUENTA */}
      {isDeleteModalOpen && (
        <div className="fullscreen-overlay fade-in" style={{ zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '400px', background: 'var(--liquid-bg-color)', padding: '30px', borderRadius: '12px', border: '1px solid var(--border-color)', position: 'relative' }}>
            <button 
              onClick={() => setIsDeleteModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ color: 'var(--danger-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldAlert size={24} /> Eliminar Cuenta
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '14px', lineHeight: '1.5' }}>
              ¿Estás completamente seguro de que querés eliminar tu cuenta? Esta acción <strong>NO</strong> se puede deshacer. Por favor, ingresá tu contraseña para confirmar.
            </p>
            
            <form onSubmit={handleConfirmDelete}>
              <input 
                type="password" 
                placeholder="Tu contraseña"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid var(--accent-color)', background: 'transparent', color: 'var(--text-primary)', marginBottom: '15px', outline: 'none' }}
                required
                autoFocus
              />
              {deleteError && <p style={{ color: 'var(--danger-color)', fontSize: '14px', marginBottom: '15px' }}>{deleteError}</p>}
              
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" onClick={() => setIsDeleteModalOpen(false)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--text-primary)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
                <button type="submit" style={{ padding: '10px 15px', borderRadius: '8px', border: 'none', background: 'var(--danger-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Eliminar para siempre</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default Settings;
