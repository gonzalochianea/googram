import { Link } from "react-router-dom";
import "../../styles/Landing.css";

function Landing() {
  return (
    <div className="landing-page fade-in">
      <div className="landing-content">
        
        {/* NAVBAR */}
        <nav className="landing-navbar">
          <div className="landing-logo" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            Googram
            <img src="/Googram%20logo.png" alt="Globe" style={{ height: '1em', width: 'auto' }} />
          </div>
          <div className="landing-nav-buttons">
            <Link to="/login" className="btn-glass btn-login">Entrar</Link>
            <Link to="/register" className="btn-glass btn-register">Registrarse</Link>
          </div>
        </nav>

        {/* HERO SECTION */}
        <main className="landing-hero">
          
          <h1 className="hero-title">
            <span className="gradient-text-1">Conectá con tu mundo</span> <br />
            <span className="gradient-text-2">Compartí tu visión</span>
          </h1>
          
          <p className="hero-subtitle">
            Descubrí historias inspiradoras, conectate con tus amigos y 
            compartí los mejores momentos de tu vida en un espacio hecho a tu medida.
          </p>
          
          <Link to="/register" className="hero-cta">
            Comenzar Ahora Mismo
          </Link>
        </main>

        <footer style={{
          position: "absolute",
          bottom: "20px",
          left: 0,
          width: "100%",
          textAlign: "center",
          color: "rgba(0, 0, 0, 0.5)",
          fontSize: "13px",
          fontWeight: "500"
        }}>
          &copy; {new Date().getFullYear()} Googram. Todos los derechos reservados.
        </footer>

      </div>
    </div>
  );
}

export default Landing;
