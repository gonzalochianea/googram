/**
 * App.jsx — Componente raíz de la aplicación
 * Maneja las rutas, el tema oscuro, y la verificación de email.
 * Si el usuario no verificó su correo, muestra una pantalla de espera.
 */
import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "./firebase";
import Login from "./components/pages/Login";
import Register from "./components/pages/Register";
import Home from "./components/pages/Home";
import Profile from "./components/pages/Profile";
import Messages from "./components/pages/Messages";
import Notifications from "./components/pages/Notifications";
import Settings from "./components/pages/Settings";
import Explore from "./components/pages/Explore";
import Landing from "./components/pages/Landing";
import MainLayout from "./components/layout/MainLayout";
import LiquidBackground from "./components/layout/LiquidBackground";
import ErrorBoundary from "./ErrorBoundary";

function App() {
    const { user, loading } = useAuth();

    // Cargar preferencia de tema oscuro globalmente
    useEffect(() => {
        const isDark = localStorage.getItem("darkMode") === "true";
        if (isDark) {
            document.body.classList.add("dark-theme");
        } else {
            document.body.classList.remove("dark-theme");
        }
    }, []);

    if (loading) {
        return <p>Cargando aplicación...</p>;
    }

    // ============================================================
    // PANTALLA DE VERIFICACIÓN DE EMAIL
    // Si el usuario existe pero no verificó su correo, bloqueamos el acceso.
    // ============================================================
    if (user && !user.emailVerified) {
        return (
            <ErrorBoundary>
                <LiquidBackground />
                <EmailVerificationScreen />
            </ErrorBoundary>
        );
    }

    return (
        <ErrorBoundary>
            <>
                <LiquidBackground />
                <Routes>
                    {/* Rutas Públicas */}
                    <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
                    <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />

                    {/* Rutas Protegidas (Envueltas en el MainLayout) o Landing Page (si no hay sesión) */}
                    <Route 
                        path="/" 
                        element={user ? <MainLayout><Home /></MainLayout> : <Landing />} 
                    />
                    
                    <Route 
                        path="/profile/:emailPerfil" 
                        element={user ? <MainLayout><Profile /></MainLayout> : <Navigate to="/login" />} 
                    />
                    
                    <Route 
                        path="/messages" 
                        element={user ? <MainLayout><Messages /></MainLayout> : <Navigate to="/login" />} 
                    />
                    
                    <Route 
                        path="/explore" 
                        element={user ? <MainLayout><Explore /></MainLayout> : <Navigate to="/login" />} 
                    />
                    
                    <Route 
                        path="/notifications" 
                        element={user ? <MainLayout><Notifications /></MainLayout> : <Navigate to="/login" />} 
                    />
                    
                    <Route 
                        path="/settings" 
                        element={user ? <MainLayout><Settings /></MainLayout> : <Navigate to="/login" />} 
                    />
                </Routes>
            </>
        </ErrorBoundary>
    );
}

/**
 * EmailVerificationScreen — Pantalla que se muestra cuando el usuario
 * se registró pero aún no verificó su correo electrónico.
 * Permite reenviar el email, verificar el estado, o cerrar sesión.
 */
function EmailVerificationScreen() {
    const [status, setStatus] = useState(null);
    const [checking, setChecking] = useState(false);

    /**
     * handleResend — Reenvía el email de verificación.
     */
    const handleResend = async () => {
        setStatus(null);
        try {
            await sendEmailVerification(auth.currentUser);
            setStatus({ type: "success", text: "¡Email reenviado! Revisá tu bandeja de entrada y spam." });
        } catch (err) {
            console.error("Error al reenviar:", err);
            if (err.code === 'auth/too-many-requests') {
                setStatus({ type: "error", text: "Esperá unos minutos antes de volver a intentar." });
            } else {
                setStatus({ type: "error", text: "Error al reenviar. Intentá de nuevo." });
            }
        }
    };

    /**
     * handleCheckVerification — Recarga el usuario de Firebase para ver
     * si ya verificó el email. Si sí, recarga la página para dejarlo entrar.
     */
    const handleCheckVerification = async () => {
        setChecking(true);
        setStatus(null);
        try {
            await auth.currentUser.reload();
            if (auth.currentUser.emailVerified) {
                window.location.reload();
            } else {
                setStatus({ type: "error", text: "Todavía no verificaste tu correo. Revisá tu bandeja." });
            }
        } catch (err) {
            console.error("Error al verificar:", err);
            setStatus({ type: "error", text: "Error al comprobar. Intentá de nuevo." });
        }
        setChecking(false);
    };

    /**
     * handleLogout — Cierra sesión y vuelve al login.
     */
    const handleLogout = async () => {
        await signOut(auth);
    };

    return (
        <div className="auth-container" style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
            <div className="auth-form" style={{ textAlign: "center", padding: "40px 30px" }}>
                <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    Googram
                    <img src="/Googram%20logo.png" alt="Globe" style={{ height: '1em', width: 'auto' }} />
                </div>

                <h2 style={{ marginBottom: "10px" }}>Verificá tu Email</h2>
                
                <p style={{ color: "var(--text-secondary)", fontSize: "14px", lineHeight: "1.6", marginBottom: "20px" }}>
                    Te enviamos un correo de verificación a <strong style={{ color: "var(--text-primary)" }}>{auth.currentUser?.email}</strong>. 
                    Hacé clic en el link que te llegó y después presioná el botón de abajo.<br/><br/>
                    <span style={{ color: "var(--accent-color)", fontWeight: "600" }}>⚠️ Importante:</span> Por favor, revisá también tu carpeta de Spam o Correo No Deseado.
                </p>

                {status && (
                    <p style={{ 
                        color: status.type === "success" ? "#28a745" : "var(--danger-color)", 
                        fontSize: "14px", marginBottom: "15px", lineHeight: "1.4" 
                    }}>
                        {status.text}
                    </p>
                )}

                <button 
                    onClick={handleCheckVerification}
                    disabled={checking}
                    className="auth-btn" 
                    style={{ marginBottom: "10px" }}
                >
                    {checking ? "Comprobando..." : "Ya verifiqué mi correo"}
                </button>

                <button 
                    onClick={handleResend}
                    style={{ 
                        width: "100%", padding: "12px", borderRadius: "12px",
                        border: "1px solid var(--text-primary)", background: "transparent", 
                        color: "var(--text-primary)", cursor: "pointer", fontWeight: "600",
                        fontSize: "16px", marginBottom: "15px"
                    }}
                >
                    Reenviar email de verificación
                </button>

                <p 
                    onClick={handleLogout}
                    style={{ color: "var(--danger-color)", cursor: "pointer", fontSize: "14px", fontWeight: "600", marginTop: "10px" }}
                >
                    Cerrar sesión
                </p>
            </div>
        </div>
    );
}

export default App;
