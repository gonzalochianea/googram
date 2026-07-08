import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../firebase";
import { collection, query, onSnapshot, doc } from "firebase/firestore";
import { useMessages } from "../../hooks/useMessages";
import { Send, MessageSquare, Trash2, Edit2, Check, CheckCheck, X, AlertTriangle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "../../styles/Messages.css";

function Messages() {
  const { user } = useAuth();
  const [allUsersData, setAllUsersData] = useState([]);
  const [following, setFollowing] = useState([]);
  const [followers, setFollowers] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [selectedContact, setSelectedContact] = useState(null);
  
  const {
    messages,
    startMessagesListener,
    sendMessage,
    markAsRead,
    deleteMessage,
    editMessage,
    clearChat
  } = useMessages(user);

  const [inputText, setInputText] = useState("");
  
  const [editingMsgId, setEditingMsgId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [selectedMessageId, setSelectedMessageId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const location = useLocation();
  const nav = useNavigate();
  const [chatSearchTerm, setChatSearchTerm] = useState("");
  
  // MODALES
  const [isClearChatModalOpen, setIsClearChatModalOpen] = useState(false);
  const [msgToDelete, setMsgToDelete] = useState(null);

  // AUTO-SELECT CHAT DESDE PERFIL
  useEffect(() => {
    if (location.state?.chatWith && allUsersData.length > 0) {
      const email = location.state.chatWith;
      const foundUser = allUsersData.find(u => u.email === email);
      setSelectedContact(foundUser || { email, username: email.split('@')[0] });
      nav(".", { replace: true, state: {} }); // Limpiamos el estado
    }
  }, [location.state, allUsersData, nav]);

  // 1. CARGAR DATOS DE USUARIO PARA SEGUIDOS/SEGUIDORES
  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) {
        setFollowing(docSnap.data().following || []);
        setFollowers(docSnap.data().followers || []);
      }
    });
    return () => unsubscribe();
  }, [user]);

  // 1.5. CARGAR TODOS LOS USUARIOS
  useEffect(() => {
    const q = query(collection(db, "users"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData = snapshot.docs.map(d => d.data());
      const otherUsers = usersData.filter(u => u.email && u.email !== user.email);
      setAllUsersData(otherUsers);
    });
    return () => unsubscribe();
  }, [user]);

  // 2. CARGAR TODOS LOS MENSAJES
  useEffect(() => {
    const unsub = startMessagesListener();
    return () => unsub && unsub();
  }, []);

  // 2.5 FILTRAR CONTACTOS RELEVANTES (Solo si hablé o si lo seleccioné)
  useEffect(() => {
    if (!user) return;
    
    // Recopilar todos los emails con los que interactuamos mediante mensajes
    const activeEmails = new Set();
    messages.forEach(m => {
        if (m.sender === user.email) activeEmails.add(m.receiver);
        if (m.receiver === user.email) activeEmails.add(m.sender);
    });

    // Añadir el seleccionado si no estaba en la lista (para que aparezca temporalmente)
    if (selectedContact && selectedContact.email) {
        activeEmails.add(selectedContact.email);
    }

    // Mapear esos emails a datos de usuario reales
    const filtered = Array.from(activeEmails).map(email => {
        const foundUser = allUsersData.find(u => u.email === email);
        if (foundUser) return foundUser;
        if (selectedContact && selectedContact.email === email && selectedContact.isNew) return selectedContact;
        return { email, isDeleted: true };
    });
    
    setContacts(filtered);
  }, [allUsersData, messages, user, selectedContact]);

  // 3. AUTO-SCROLL
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedContact]);

  // 4. FILTRAR MENSAJES DEL CHAT ACTUAL
  const currentChatMessages = selectedContact ? messages.filter(msg => 
    (msg.sender === user.email && msg.receiver === selectedContact.email) ||
    (msg.sender === selectedContact.email && msg.receiver === user.email)
  ) : [];

  // 5. MARCAR MENSAJES COMO LEÍDOS AUTOMÁTICAMENTE
  useEffect(() => {
    if (!selectedContact || !user) return;
    const unreadMessages = currentChatMessages.filter(msg => msg.receiver === user.email && msg.read === false);
    
    if (unreadMessages.length > 0) {
      unreadMessages.forEach(async (msg) => {
        await markAsRead(msg.id);
      });
    }
  }, [currentChatMessages, selectedContact, user]);

  // 6. ENVIAR MENSAJE
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || !selectedContact) return;
    await sendMessage(selectedContact.email, inputText);
    setInputText("");
  };

  // 7. BORRAR MENSAJE INDIVIDUAL
  const handleDeleteMessage = (msgId) => {
    setMsgToDelete(msgId);
  };

  const confirmDeleteMessage = async () => {
    if (msgToDelete) {
        await deleteMessage(msgToDelete);
        setMsgToDelete(null);
    }
  };

  // 8. GUARDAR EDICIÓN
  const handleSaveEdit = async (msgId) => {
    await editMessage(msgId, editingText);
    setEditingMsgId(null);
  };

  // 9. VACIAR CHAT ENTERO (MEGA BORRADO)
  const handleClearChat = () => {
    setIsClearChatModalOpen(true);
  };

  const confirmClearChat = async () => {
    await clearChat(currentChatMessages);
    setSelectedContact(null);
    setIsClearChatModalOpen(false);
  };

  return (
    <div className="messages-container fade-in">
      <div className="contacts-sidebar">
        <div className="contacts-header" style={{ display: "flex", flexDirection: "column", gap: "10px", paddingBottom: "15px", height: "auto" }}>
            <span style={{ fontWeight: "800", fontSize: "18px" }}>Mensajes Directos</span>
            <div style={{ position: "relative" }}>
                <input 
                  type="text"
                  placeholder="Buscar seguidos para chatear..."
                  value={chatSearchTerm}
                  onChange={(e) => setChatSearchTerm(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: "12px", border: "1px solid var(--border-color)", background: "var(--bg-main)", color: "var(--text-primary)", outline: "none", fontSize: "13px" }}
                />
                {chatSearchTerm && (
                  <div className="fade-in" style={{ position: "absolute", top: "calc(100% + 5px)", left: 0, right: 0, background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "12px", zIndex: 10, maxHeight: "200px", overflowY: "auto", boxShadow: "var(--shadow-md)" }}>
                     {allUsersData.filter(u => following.includes(u.email) && ((u.username || "").toLowerCase().includes(chatSearchTerm.toLowerCase()) || (u.fullName || "").toLowerCase().includes(chatSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(chatSearchTerm.toLowerCase()))).map(u => (
                        <div key={u.email} onClick={() => { setSelectedContact(u); setChatSearchTerm(""); }} style={{ padding: "10px", display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", borderBottom: "1px solid var(--border-color)" }}>
                            <div className="contact-avatar" style={{ width: "30px", height: "30px", fontSize: "12px", ...(u.photoURL ? { padding: 0, overflow: 'hidden' } : {}) }}>
                               {u.photoURL ? <img src={u.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.email.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontSize: "13px", fontWeight: "bold", textTransform: "capitalize" }}>{u.fullName || u.username || u.email.split('@')[0]}</span>
                        </div>
                     ))}
                     {allUsersData.filter(u => following.includes(u.email) && ((u.username || "").toLowerCase().includes(chatSearchTerm.toLowerCase()) || (u.fullName || "").toLowerCase().includes(chatSearchTerm.toLowerCase()) || u.email.toLowerCase().includes(chatSearchTerm.toLowerCase()))).length === 0 && (
                         <div style={{ padding: "10px", fontSize: "12px", color: "var(--text-secondary)", textAlign: "center" }}>No sigues a nadie con ese nombre</div>
                     )}
                  </div>
                )}
            </div>
        </div>
        <div className="contacts-list">
          {contacts.map((contact, index) => {
            // Contar no leídos de este contacto específico
            const unreadCount = messages.filter(m => m.sender === contact.email && m.receiver === user.email && m.read === false).length;
            
            return (
              <div 
                key={index} 
                className={`contact-item ${selectedContact?.email === contact.email ? 'active' : ''}`}
                onClick={() => setSelectedContact(contact)}
              >
                <div className="contact-avatar" style={contact.photoURL ? { padding: 0, overflow: 'hidden' } : { background: contact.isDeleted ? 'var(--bg-surface)' : 'var(--accent-color)' }}>
                  {contact.photoURL && !contact.isDeleted ? (
                    <img src={contact.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : contact.isDeleted ? (
                    <span style={{ color: 'var(--text-secondary)' }}>?</span>
                  ) : (
                    contact.email.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="contact-info" style={{ flex: 1, display: "flex", justifyContent: "space-between", alignItems: "center", minWidth: 0, paddingRight: "10px" }}>
                  <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span className="contact-name" style={{ textTransform: "capitalize", fontSize: "15px", fontWeight: "600", color: contact.isDeleted ? 'var(--text-secondary)' : 'inherit' }}>
                          {contact.isDeleted ? "Usuario Eliminado" : (contact.fullName || contact.username || contact.email.split('@')[0])}
                      </span>
                  </div>
                  {/* GLOBITO ROJO DE NOTIFICACIÓN DE MENSAJES */}
                  {unreadCount > 0 && (
                      <div style={{ background: "var(--danger-color)", color: "white", padding: "2px 8px", borderRadius: "10px", fontSize: "12px", fontWeight: "bold" }}>
                          {unreadCount}
                      </div>
                  )}
                </div>
              </div>
            );
          })}
          {contacts.length === 0 && (
              <p style={{ padding: "20px", color: "var(--text-secondary)", fontSize: "14px", textAlign: "center" }}>
                  Aún no hay otros usuarios registrados para chatear.
              </p>
          )}
        </div>
      </div>

      {selectedContact ? (
        <div className="chat-area">
          <div className="chat-header" style={{ display: "flex", justifyContent: "space-between" }}>
            {selectedContact.isDeleted ? (
                <div style={{ display: "flex", alignItems: "center", gap: "10px", color: "var(--text-secondary)", cursor: "not-allowed" }}>
                    <div className="contact-avatar" style={{ width: "35px", height: "35px", fontSize: "14px", background: "var(--bg-surface)" }}>
                        ?
                    </div>
                    <strong>Usuario Eliminado</strong>
                </div>
            ) : (
                <Link to={`/profile/${selectedContact.email}`} style={{ display: "flex", alignItems: "center", gap: "10px", textDecoration: "none", color: "inherit", cursor: "pointer", transition: "opacity 0.2s ease" }} onMouseOver={e => e.currentTarget.style.opacity = "0.7"} onMouseOut={e => e.currentTarget.style.opacity = "1"}>
                    <div className="contact-avatar" style={{ width: "35px", height: "35px", fontSize: "14px", ...(selectedContact.photoURL ? { padding: 0, overflow: 'hidden' } : {}) }}>
                        {selectedContact.photoURL ? (
                            <img src={selectedContact.photoURL} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                            selectedContact.email.charAt(0).toUpperCase()
                        )}
                    </div>
                    <strong style={{ textTransform: "capitalize" }}>
                        {selectedContact.fullName || selectedContact.username || selectedContact.email.split('@')[0]}
                    </strong>
                </Link>
            )}
            
            {/* BOTÓN VACIAR CHAT */}
            <button onClick={handleClearChat} style={{ display: "flex", alignItems: "center", gap: "5px", background: "transparent", border: "1px solid var(--danger-color)", color: "var(--danger-color)", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px" }}>
                <Trash2 size={14} /> Vaciar Chat
            </button>
          </div>
          
          <div className="chat-messages">
            {currentChatMessages.map((msg) => {
              const isMine = msg.sender === user.email;
              
              // MODO EDICIÓN DE ESTE MENSAJE
              if (editingMsgId === msg.id) {
                  return (
                      <div key={msg.id} className={`message-bubble ${isMine ? 'message-sent' : 'message-received'}`} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px" }}>
                          <input 
                              type="text" 
                              value={editingText}
                              onChange={e => setEditingText(e.target.value)}
                              autoFocus
                              style={{ border: "none", padding: "5px", borderRadius: "5px", outline: "none", color: "black", width: "100%" }}
                          />
                          <button onClick={() => handleSaveEdit(msg.id)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><Check size={16} /></button>
                          <button onClick={() => setEditingMsgId(null)} style={{ background: "none", border: "none", color: "white", cursor: "pointer" }}><X size={16} /></button>
                      </div>
                  )
              }
              
              // MODO LECTURA NORMAL
              return (
                <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", marginBottom: "15px" }}>
                    <div 
                        className={`message-bubble ${isMine ? 'message-sent' : 'message-received'}`} 
                        style={{ position: "relative", cursor: isMine ? "pointer" : "default" }}
                        onClick={() => isMine ? setSelectedMessageId(selectedMessageId === msg.id ? null : msg.id) : null}
                    >
                        {/* MINIATURA DE LA HISTORIA SI ES UNA RESPUESTA */}
                        {msg.storyImageUrl && (
                           <div style={{ marginBottom: "8px" }}>
                               <span style={{ fontSize: "11px", opacity: 0.8, display: "block", marginBottom: "4px", fontStyle: "italic" }}>
                                   {isMine ? "Respondiste a su historia" : "Respondió a tu historia"}
                               </span>
                               <img src={msg.storyImageUrl} alt="Historia" style={{ width: "120px", height: "213px", objectFit: "cover", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.2)" }} />
                           </div>
                        )}
                        
                        {msg.text}
                        {msg.isEdited && <span style={{ fontSize: "10px", opacity: 0.6, marginLeft: "5px" }}>(Editado)</span>}
                        
                        {/* Menú de acciones Flotante (solo para mis mensajes al hacer clic) */}
                        {isMine && selectedMessageId === msg.id && (
                            <div className="message-floating-menu" style={{ position: "absolute", bottom: "-35px", right: "0", background: "var(--bg-surface)", border: "1px solid var(--border-color)", borderRadius: "8px", display: "flex", gap: "10px", padding: "5px 10px", boxShadow: "0 2px 10px rgba(0,0,0,0.2)", zIndex: 10 }}>
                                <button onClick={(e) => { e.stopPropagation(); setEditingMsgId(msg.id); setEditingText(msg.text); setSelectedMessageId(null); }} style={{ background: "none", border: "none", color: "var(--text-primary)", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "bold", padding: 0 }}>
                                  <Edit2 size={12} /> Editar
                                </button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteMessage(msg.id); setSelectedMessageId(null); }} style={{ background: "none", border: "none", color: "var(--danger-color)", cursor: "pointer", display: "flex", alignItems: "center", gap: "5px", fontSize: "12px", fontWeight: "bold", padding: 0 }}>
                                  <Trash2 size={12} /> Borrar
                                </button>
                            </div>
                        )}
                    </div>
                    {/* Leído / No Leído con íconos */}
                    {isMine && (
                        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "2px", marginRight: "4px" }}>
                            {msg.read ? (
                                <CheckCheck size={16} color="var(--accent-color)" />
                            ) : (
                                <Check size={16} color="var(--text-secondary)" />
                            )}
                        </div>
                    )}
                </div>
              );
            })}
            {currentChatMessages.length === 0 && (
                <p style={{ textAlign: "center", color: "var(--text-secondary)", marginTop: "auto", marginBottom: "auto" }}>
                    Inicia la conversación con {selectedContact.fullName || selectedContact.username || selectedContact.email.split('@')[0]}
                </p>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="chat-input-area">
            <form onSubmit={handleSendMessage} className="chat-form">
              <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={selectedContact.isDeleted ? "No puedes responder a esta conversación." : "Escribe un mensaje..."} 
                className="chat-input"
                disabled={selectedContact.isDeleted}
                autoFocus={!selectedContact.isDeleted}
              />
              <button type="submit" disabled={!inputText.trim() || selectedContact.isDeleted} className="chat-send-btn">
                Enviar
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="no-chat-selected">
          <MessageSquare size={60} strokeWidth={1} />
          <h2>Tus Mensajes</h2>
          <p>Selecciona un contacto a la izquierda para enviar o modificar mensajes privados.</p>
        </div>
      )}

      {/* MODAL VACIAR CHAT */}
      {isClearChatModalOpen && (
        <div className="fullscreen-overlay fade-in" style={{ zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '400px', background: 'var(--liquid-bg-color)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border-color)', position: 'relative', boxShadow: 'var(--shadow-md)' }}>
            <button 
              onClick={() => setIsClearChatModalOpen(false)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ color: 'var(--danger-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <AlertTriangle size={24} /> Vaciar Chat
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
              ¿Estás seguro que deseas vaciar el chat con esta persona? Esta acción eliminará todos los mensajes y <strong>no se puede deshacer</strong>.
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button type="button" onClick={() => setIsClearChatModalOpen(false)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--text-primary)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button type="button" onClick={confirmClearChat} style={{ padding: '10px 15px', borderRadius: '8px', border: 'none', background: 'var(--danger-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Sí, vaciar chat</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BORRAR MENSAJE */}
      {msgToDelete && (
        <div className="fullscreen-overlay fade-in" style={{ zIndex: 99999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="modal-content" style={{ width: '90%', maxWidth: '400px', background: 'var(--liquid-bg-color)', padding: '30px', borderRadius: '24px', border: '1px solid var(--border-color)', position: 'relative', boxShadow: 'var(--shadow-md)' }}>
            <button 
              onClick={() => setMsgToDelete(null)}
              style={{ position: 'absolute', top: '15px', right: '15px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)' }}
            >
              <X size={24} />
            </button>
            
            <h2 style={{ color: 'var(--danger-color)', marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Trash2 size={24} /> Borrar Mensaje
            </h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '25px', fontSize: '14px', lineHeight: '1.5' }}>
              ¿Seguro que querés borrar este mensaje?
            </p>
            
            <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
              <button type="button" onClick={() => setMsgToDelete(null)} style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid var(--text-primary)', background: 'transparent', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 'bold' }}>Cancelar</button>
              <button type="button" onClick={confirmDeleteMessage} style={{ padding: '10px 15px', borderRadius: '8px', border: 'none', background: 'var(--danger-color)', color: 'white', cursor: 'pointer', fontWeight: 'bold' }}>Borrar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Messages;
