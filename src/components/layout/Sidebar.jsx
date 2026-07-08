import { useAuth } from "../../context/AuthContext";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";
import { Link, useNavigate } from "react-router-dom";
import { Home, PlusSquare, User, LogOut, MessageSquare, Bell, Search, Settings as SettingsIcon, Compass } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { db } from "../../firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useUsers } from "../../hooks/useUsers";
import { useMessages } from "../../hooks/useMessages";
import { useNotifications } from "../../hooks/useNotifications";
import "../../styles/Layout.css"; 

function Sidebar({ onOpenUploadModal }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ESTADOS DEL BUSCADOR
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const { allUsers, fetchAllUsers } = useUsers(user);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchRef = useRef(null);
  
  // (Modo Oscuro se maneja ahora desde Configuración)
  useEffect(() => {
    const isDark = localStorage.getItem("darkMode") === "true";
    if (isDark) document.body.classList.add("dark-theme");
  }, []);

  // LÓGICA DE CAMPANITA ROJA
  const { unreadCount, startUnreadListener } = useMessages(user);
  useEffect(() => {
    const unsub = startUnreadListener();
    return () => unsub && unsub();
  }, [user]);

  // LÓGICA DE NOTIFICACIONES NO LEÍDAS
  const { unreadNotisCount, startNotificationsListener } = useNotifications(user);
  useEffect(() => {
    const unsub = startNotificationsListener(false);
    return () => unsub && unsub();
  }, [user]);

  // Cargar usuarios para el buscador (Solo desde la colección 'users' como un sistema real)
  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Lógica de búsqueda en tiempo real
  useEffect(() => {
    if (searchTerm.trim() === "") {
      setSearchResults([]);
      return;
    }
    const term = searchTerm.toLowerCase();
    const results = allUsers.filter(u => {
      const e = u.email ? u.email.toLowerCase() : "";
      const f = u.fullName ? u.fullName.toLowerCase() : "";
      const un = u.username ? u.username.toLowerCase() : "";
      return e.includes(term) || f.includes(term) || un.includes(term);
    });
    setSearchResults(results);
  }, [searchTerm, allUsers, user]);

  // Cerrar buscador si hacemos clic afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("Error al salir:", error);
    }
  };

  return (
    <div className="sidebar">
      {/* Título de la App con tipografía especial */}
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        Googram
        <img src="/Googram%20logo.png" alt="Globe" style={{ height: '1em', width: 'auto' }} />
      </div>
      
      <nav className="sidebar-nav">
        
        {/* BUSCADOR */}
        <div className="search-container" ref={searchRef}>
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input 
              type="text" 
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsSearchOpen(true)}
              className="search-input"
            />
          </div>
          
          {/* RESULTADOS DESPLEGABLES */}
          {isSearchOpen && searchResults.length > 0 && (
            <div className="search-dropdown fade-in">
              {searchResults.map((res, i) => (
                <Link 
                  key={i} 
                  to={`/profile/${res.email}`} 
                  className="search-result-item"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchTerm("");
                  }}
                >
                  <div className="search-result-avatar" style={res.photoURL ? { padding: 0, overflow: 'hidden' } : {}}>
                    {res.photoURL ? (
                      <img src={res.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      res.email.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span style={{ textTransform: 'capitalize' }}>{res.fullName || res.username || res.email}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Link to="/" className="nav-item">
          <Home size={24} strokeWidth={1.5} />
          <span className="nav-text">Inicio</span>
        </Link>
        
        <Link to="/explore" className="nav-item">
          <Compass size={24} strokeWidth={1.5} />
          <span className="nav-text">Explorar</span>
        </Link>
        
        <button onClick={onOpenUploadModal} className="nav-item">
          <PlusSquare size={24} strokeWidth={1.5} />
          <span className="nav-text">Crear Publicación</span>
        </button>

        <Link to="/messages" className="nav-item" style={{ position: "relative" }}>
          <MessageSquare size={24} strokeWidth={1.5} color={unreadCount > 0 ? "var(--danger-color)" : "currentColor"} />
          {unreadCount > 0 && (
            <span className="nav-badge" style={{ position: "absolute", top: "5px", left: "22px", background: "var(--danger-color)", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "10px", fontWeight: "bold", display: "flex" }}>
                {unreadCount}
            </span>
          )}
          <span className="nav-text" style={{ color: unreadCount > 0 ? "var(--danger-color)" : "inherit", fontWeight: unreadCount > 0 ? "bold" : "normal" }}>Mensajes</span>
        </Link>
        
        <Link to="/notifications" className="nav-item" style={{ position: "relative" }}>
          <Bell size={24} strokeWidth={1.5} color={unreadNotisCount > 0 ? "var(--danger-color)" : "currentColor"} />
          {unreadNotisCount > 0 && (
            <span className="nav-badge" style={{ position: "absolute", top: "5px", left: "22px", background: "var(--danger-color)", color: "white", borderRadius: "50%", padding: "2px 6px", fontSize: "10px", fontWeight: "bold", display: "flex" }}>
                {unreadNotisCount}
            </span>
          )}
          <span className="nav-text" style={{ color: unreadNotisCount > 0 ? "var(--danger-color)" : "inherit", fontWeight: unreadNotisCount > 0 ? "bold" : "normal" }}>Notificaciones</span>
        </Link>

        <Link to={`/profile/${user?.email}`} className="nav-item">
          <User size={24} strokeWidth={1.5} />
          <span className="nav-text">Mi Perfil</span>
        </Link>
        
        <Link to="/settings" className="nav-item" style={{ marginTop: "20px" }}>
          <SettingsIcon size={24} strokeWidth={1.5} />
          <span className="nav-text">Configuración</span>
        </Link>
        
        <button onClick={handleLogout} className="nav-item logout">
          <LogOut size={24} strokeWidth={1.5} />
          <span className="nav-text">Salir</span>
        </button>
        
      </nav>
      
      {/* Copyright Footer */}
      <div className="sidebar-footer" style={{ 
        marginTop: "auto", 
        paddingTop: "30px",
        paddingBottom: "10px", 
        textAlign: "center", 
        fontSize: "12px", 
        color: "var(--text-secondary)", 
        opacity: 0.7 
      }}>
        &copy; {new Date().getFullYear()} Googram.<br/>Todos los derechos reservados.
      </div>
    </div>
  );
}

export default Sidebar;
