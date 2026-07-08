/**
 * Login.jsx — Página de Inicio de Sesión
 * Incluye el formulario de login y la funcionalidad de "Olvidé mi contraseña"
 * que envía un email de recuperación vía Firebase Auth.
 */
import { useState } from "react";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth, db } from "../../firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import "../../styles/Auth.css";

function Login() {
    const [loginIdentifier, setLoginIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(null);

    // Estado para el flujo de "Olvidé mi contraseña"
    const [forgotMode, setForgotMode] = useState(false);
    const [resetEmail, setResetEmail] = useState("");
    const [resetStatus, setResetStatus] = useState(null);

    /**
     * handleSubmit — Valida credenciales con Firebase Auth.
     */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError(null);

        try {
            let finalEmail = loginIdentifier.trim();

            // Si NO tiene arroba, es un nombre de usuario. Vamos a buscar su email a la base de datos.
            if (!finalEmail.includes("@")) {
                let cleanUsername = finalEmail.startsWith("@") ? finalEmail.substring(1).toLowerCase() : finalEmail.toLowerCase();
                
                const q = query(collection(db, "users"), where("username", "==", cleanUsername));
                const qs = await getDocs(q);
                
                if (qs.empty) {
                    setError("No se encontró ninguna cuenta con ese usuario.");
                    return;
                }
                
                // ¡Lo encontramos! Sacamos su email real para poder iniciar sesión
                finalEmail = qs.docs[0].data().email;
            }

            // Iniciamos sesión en Firebase con el email (el que tipeó o el que encontramos en la BD)
            await signInWithEmailAndPassword(auth, finalEmail, password);
        } catch (err) {
            console.error("Error al iniciar sesión:", err);
            setError("Credenciales incorrectas.");
        }
    };

    /**
     * handleResetPassword — Envía un email de recuperación de contraseña.
     * Firebase genera automáticamente un link seguro para restablecer la clave.
     */
    const handleResetPassword = async (e) => {
        e.preventDefault();
        setResetStatus(null);

        if (!resetEmail.trim()) {
            setResetStatus({ type: "error", text: "Ingresá tu correo electrónico." });
            return;
        }

        try {
            await sendPasswordResetEmail(auth, resetEmail);
            setResetStatus({ type: "success", text: "¡Listo! Revisá tu bandeja de entrada (y spam) para restablecer tu contraseña." });
        } catch (err) {
            console.error("Error al enviar reset:", err);
            if (err.code === 'auth/user-not-found') {
                setResetStatus({ type: "error", text: "No existe una cuenta con ese correo." });
            } else {
                setResetStatus({ type: "error", text: "Error al enviar el correo. Intentalo de nuevo." });
            }
        }
    };

    return (
        <div className="auth-container">
            {!forgotMode ? (
                /* ========== FORMULARIO DE LOGIN ========== */
                <form className="auth-form" onSubmit={handleSubmit}>
                    <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        Googram
                        <img src="/Googram%20logo.png" alt="Globe" style={{ height: '1em', width: 'auto' }} />
                    </div>
                    <h2>Iniciar Sesión</h2>

                    {error && <p className="error-msg">{error}</p>}

                    <div className="input-group">
                        <label>Email o Usuario</label>
                        <input
                            type="text"
                            value={loginIdentifier}
                            onChange={(e) => setLoginIdentifier(e.target.value)}
                            required
                            placeholder="tu@email.com o usuario"
                        />
                    </div>

                    <div className="input-group">
                        <label>Contraseña</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                            placeholder="Tu contraseña secreta"
                        />
                    </div>

                    <button type="submit" className="auth-btn">Entrar</button>

                    {/* Link de "Olvidé mi contraseña" */}
                    <p 
                        onClick={() => { 
                            setForgotMode(true); 
                            setResetEmail(loginIdentifier.includes('@') ? loginIdentifier : ''); 
                            setResetStatus(null); 
                        }}
                        style={{ 
                            textAlign: "center", marginTop: "15px", color: "var(--accent-color)", 
                            cursor: "pointer", fontSize: "14px", fontWeight: "600" 
                        }}
                    >
                        ¿Olvidaste tu contraseña?
                    </p>
                </form>
            ) : (
                /* ========== FORMULARIO DE RECUPERACIÓN ========== */
                <form className="auth-form" onSubmit={handleResetPassword}>
                    <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        Googram
                        <img src="/Googram%20logo.png" alt="Globe" style={{ height: '1em', width: 'auto' }} />
                    </div>
                    <h2>Recuperar Contraseña</h2>
                    <p style={{ color: "var(--text-secondary)", fontSize: "14px", textAlign: "center", lineHeight: "1.5", marginBottom: "10px" }}>
                        Ingresá el correo con el que te registraste y te enviaremos un link para restablecer tu contraseña.
                    </p>

                    {resetStatus && (
                        <p style={{ 
                            color: resetStatus.type === "success" ? "#28a745" : "var(--danger-color)", 
                            fontSize: "14px", textAlign: "center", lineHeight: "1.4" 
                        }}>
                            {resetStatus.text}
                        </p>
                    )}

                    <div className="input-group">
                        <label>Email</label>
                        <input
                            type="email"
                            value={resetEmail}
                            onChange={(e) => setResetEmail(e.target.value)}
                            required
                            placeholder="tu@email.com"
                            autoFocus
                        />
                    </div>

                    <button type="submit" className="auth-btn">Enviar Email de Recuperación</button>

                    <p 
                        onClick={() => { setForgotMode(false); setError(null); }}
                        style={{ 
                            textAlign: "center", marginTop: "15px", color: "var(--accent-color)", 
                            cursor: "pointer", fontSize: "14px", fontWeight: "600" 
                        }}
                    >
                        ← Volver al inicio de sesión
                    </p>
                </form>
            )}
        </div>
    );
}

export default Login;
