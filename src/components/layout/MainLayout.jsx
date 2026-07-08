import { useState, useEffect } from "react";
import Sidebar from "./Sidebar";
import UploadModal from "./UploadModal";
import "../../styles/Layout.css";

// MainLayout es el "Esqueleto" visual. Envuelve a todas las páginas de la app.
function MainLayout({ children }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [uploadType, setUploadType] = useState("post"); // "post" o "story"

  // Escuchar el evento de abrir historias disparado desde StoriesBar.jsx
  useEffect(() => {
    const handleOpenStory = () => {
      setUploadType("story");
      setIsModalOpen(true);
    };
    document.addEventListener("openStoryUpload", handleOpenStory);
    return () => document.removeEventListener("openStoryUpload", handleOpenStory);
  }, []);

  const handleOpenPostUpload = () => {
    setUploadType("post");
    setIsModalOpen(true);
  };

  return (
    <div className="main-layout fade-in">
      
      {/* El menú lateral siempre está fijo a la izquierda */}
      <Sidebar onOpenUploadModal={handleOpenPostUpload} />
      
      {/* Esta es la zona dinámica. Acá adentro React va a inyectar el Feed o el Perfil según la URL */}
      <main className="content-area">
        {children}
      </main>

      {/* El Modal de subida de fotos queda escondido acá a nivel global */}
      {isModalOpen && (
        <UploadModal 
          isOpen={isModalOpen} 
          uploadType={uploadType}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
      
    </div>
  );
}

export default MainLayout;
