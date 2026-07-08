import { useState } from "react";
import { createUserWithEmailAndPassword, sendEmailVerification } from "firebase/auth";
// 1. AHORA IMPORTAMOS db (Nuestra base de datos Firestore)
import { auth, db } from "../../firebase";
// 2. Importamos funciones para consultar y escribir en Firestore
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import "../../styles/Auth.css";

function Register() {
  // 3. Dos estados nuevos
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Validar Email sin espacios
    if (/\s/.test(email)) {
      return setError("El email no puede contener espacios.");
    }

    // Validar Contraseña: Mínimo 7 letras, 1 número, máximo 30 caracteres.
    const letterCount = (password.match(/[a-zA-Z]/g) || []).length;
    const numberCount = (password.match(/\d/g) || []).length;
    
    if (password.length > 30 || letterCount < 7 || numberCount < 1) {
      return setError("La contraseña debe tener un Mínimo 7 letras y 1 número (Máx 30 caracteres)");
    }

    // Limpiar el username (sacar arroba inicial si lo puso)
    let rawUsername = username.trim().toLowerCase();
    if (rawUsername.startsWith('@')) {
      rawUsername = rawUsername.substring(1);
    }

    // Validar formato del Username
    const userRegex = /^[^\s]{3,30}$/;
    if (!userRegex.test(rawUsername)) {
      return setError("El usuario debe tener entre 3 y 30 caracteres, sin espacios.");
    }

    try {
      // Verificar si el usuario ya existe en Firestore
      const checkUsername = async (uname) => {
        const q = query(collection(db, "users"), where("username", "==", uname));
        const qs = await getDocs(q);
        return !qs.empty;
      };

      const isTaken = await checkUsername(rawUsername);
      if (isTaken) {
        // Generar 3 sugerencias con números
        const suggestions = [];
        let attempts = 0;
        while (suggestions.length < 3 && attempts < 20) {
          const suggestion = `${rawUsername}${Math.floor(Math.random() * 9999)}`;
          const taken = await checkUsername(suggestion);
          if (!taken && !suggestions.includes(suggestion)) {
            suggestions.push(suggestion);
          }
          attempts++;
        }
        return setError(`El usuario @${rawUsername} ya existe. Probá con: ${suggestions.map(s => '@'+s).join(', ')}`);
      }

      // Paso A: Creamos la seguridad del usuario en Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Paso B: Guardamos su Perfil Público en Firestore
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        fullName: fullName,
        username: rawUsername, 
        createdAt: new Date()
      });

      // Paso C: Enviar email de verificación
      await sendEmailVerification(user);

    } catch (err) {
      console.error("Error al registrar:", err);
      if (err.code === 'auth/email-already-in-use') {
        setError("Ese email ya está registrado. Por favor, iniciá sesión.");
      } else {
        setError("Hubo un error al crear la cuenta. Intentalo de nuevo.");
      }
    }
  };

  return (
    <div className="auth-container">
      <form className="auth-form" onSubmit={handleSubmit}>
        <div className="auth-logo" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          Googram
          <img src="/Googram%20logo.png" alt="Globe" style={{ height: '1em', width: 'auto' }} />
        </div>
        <h2>Crear Cuenta en Googram</h2>

        {error && <p className="error-msg">{error}</p>}

        {/* --- NUEVO CAMPO: NOMBRE COMPLETO --- */}
        <div className="input-group">
          <label>Nombre Completo</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            placeholder="Nombre y Apellido"
          />
        </div>

        {/* --- NUEVO CAMPO: NOMBRE DE USUARIO --- */}
        <div className="input-group">
          <label>Nombre de Usuario</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s/g, '').toLowerCase())}
            required
            placeholder="tu_usuario"
          />
        </div>

        <div className="input-group">
          <label>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.replace(/\s/g, ''))}
            required
            placeholder="tu@email.com"
          />
        </div>

        <div className="input-group">
          <label>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
            required
            maxLength="30"
            placeholder="Password123"
          />
        </div>

        <button type="submit" className="auth-btn">Registrarme</button>
      </form>
    </div>
  );
}

export default Register;
