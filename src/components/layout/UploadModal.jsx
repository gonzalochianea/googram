import { useState } from "react";
import { db } from "../../firebase";
import { collection, addDoc, serverTimestamp, query, where, getDocs } from "firebase/firestore";
import { useAuth } from "../../context/AuthContext";
import { useStories } from "../../hooks/useStories";
import "../../styles/UploadModal.css";

function UploadModal({ isOpen, onClose, uploadType = "post" }) {
  const { user } = useAuth();
  const { uploadStory } = useStories(user);
  const [images, setImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const [caption, setCaption] = useState("");
  const [location, setLocation] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("filter-normal");

  const filters = [
    { name: "Normal", class: "filter-normal" },
    { name: "B&N", class: "filter-grayscale" },
    { name: "Sepia", class: "filter-sepia" },
    { name: "Vintage", class: "filter-vintage" },
    { name: "Contraste", class: "filter-high-contrast" },
    { name: "Frío", class: "filter-cool" }
  ];

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    if (uploadType === "post" && files.length > 10) {
      alert("¡Máximo 10 fotos permitidas por post!");
      return;
    }
    setImages(files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (images.length === 0) return alert("¡Elegí al menos una foto!");
    setUploading(true); 

    try {
      const imageUrls = [];
      const imgbbKey = import.meta.env.VITE_IMGBB_API_KEY; 

      for (const image of images) {
        const formData = new FormData();
        formData.append("image", image);
        
        const res = await fetch(`https://api.imgbb.com/1/upload?key=${imgbbKey}`, {
          method: "POST",
          body: formData
        });
        const data = await res.json();
        imageUrls.push(data.data.url);
      }

      if (uploadType === "story") {
        await uploadStory(imageUrls[0]);
      } else {
        const docRef = await addDoc(collection(db, "posts"), {
          userId: user.uid,
          userEmail: user.email, 
          imageUrls: imageUrls,
          caption: caption,
          location: location,
          filterClass: selectedFilter,
          likes: [],
          comments: [],
          createdAt: serverTimestamp() 
        });

        // --- ENVIAR NOTIFICACIÓN DE MENCIÓN ---
        if (caption) {
          const mentions = caption.match(/@\w+/g) || [];
          const uniqueUsernames = [...new Set(mentions.map(m => m.substring(1)))];
          for (const un of uniqueUsernames) {
            const q = query(collection(db, "users"), where("username", "==", un));
            const qs = await getDocs(q);
            if (!qs.empty) {
              const targetEmail = qs.docs[0].data().email;
              if (targetEmail !== user.email) {
                await addDoc(collection(db, "notifications"), {
                  type: "mention",
                  postId: docRef.id,
                  postOwnerEmail: targetEmail, 
                  senderEmail: user.email,
                  text: "",
                  read: false,
                  createdAt: serverTimestamp()
                });
              }
            }
          }
        }
      }

      setImages([]);
      setImagePreviews([]);
      setCaption("");
      setLocation("");
      setSelectedFilter("filter-normal");
      onClose(); 
    } catch (error) {
      console.error("Error al subir:", error);
      alert("Hubo un error al subir la foto.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">{uploadType === "story" ? "Subir una Historia (24hs)" : "Crear nueva publicación"}</h2>
        
        <form onSubmit={handleUpload} className="upload-form">
          
          <label className="upload-file-label">
            <div className="upload-file-icon">📸</div>
            <span>Haz clic para seleccionar {uploadType === "post" ? "fotos" : "tu historia"}</span>
            <input 
              type="file" 
              accept="image/*" 
              multiple={uploadType === "post"}
              onChange={handleFileChange}
              style={{ display: "none" }}
            />
          </label>
          {images.length > 0 && (
              <span style={{ fontSize: '12px', color: 'var(--accent-color)', fontWeight: 'bold', textAlign: 'center' }}>
                  {images.length} {images.length === 1 ? 'archivo seleccionado' : 'archivos seleccionados'}
              </span>
          )}

          {images.length > 0 && (
            <div style={{ 
              display: 'flex', 
              gap: '15px', 
              overflowX: 'auto', 
              padding: '10px 0', 
              margin: '0 auto', 
              width: '100%',
              scrollSnapType: 'x mandatory'
            }}>
              {imagePreviews.map((preview, index) => (
                <img 
                  key={index} 
                  src={preview} 
                  alt={`Preview ${index}`} 
                  className={uploadType === "post" ? selectedFilter : ""}
                  style={{ 
                    width: '100%', 
                    flexShrink: 0,
                    aspectRatio: '1 / 1',
                    objectFit: 'cover', 
                    borderRadius: '12px', 
                    border: '1px solid var(--border-color)',
                    scrollSnapAlign: 'center'
                  }} 
                />
              ))}
            </div>
          )}

          {uploadType === "post" && (
            <span style={{fontSize: '12px', color: 'var(--text-secondary)', textAlign: 'center'}}>
              Hasta 10 fotos permitidas.
            </span>
          )}

          {uploadType === "post" && images.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', margin: '15px 0' }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Elegir Filtro:</span>
              <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '10px' }}>
                {filters.map(f => (
                  <button 
                    key={f.class} 
                    type="button"
                    onClick={() => setSelectedFilter(f.class)}
                    style={{ 
                      padding: '8px 12px', 
                      borderRadius: '20px', 
                      border: selectedFilter === f.class ? '2px solid var(--text-primary)' : '1px solid var(--border-color)',
                      background: selectedFilter === f.class ? 'var(--text-primary)' : 'transparent',
                      color: selectedFilter === f.class ? 'var(--bg-surface)' : 'var(--text-primary)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {f.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {uploadType === "post" && (
            <input 
              type="text" 
              placeholder="Ubicación (Ej: Jujuy, Argentina)" 
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="upload-input"
            />
          )}

          {uploadType === "post" && (
            <textarea 
              placeholder="Escribe una descripción..." 
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              className="upload-textarea"
            />
          )}

          <button type="submit" disabled={uploading} className="btn-submit">
            {uploading ? "Subiendo..." : "Publicar"}
          </button>
          
          <button type="button" onClick={onClose} className="btn-cancel" disabled={uploading}>
            Cancelar
          </button>
        </form>
      </div>
    </div>
  );
}

export default UploadModal;
