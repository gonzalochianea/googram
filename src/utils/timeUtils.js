/**
 * timeUtils.js — Utilidades de Formato de Tiempo
 * Convierte timestamps de Firebase a texto legible en español.
 * Ej: "Hace un momento", "Hace 5 min", "Hace 2 horas", "3 de jul."
 */

/**
 * formatTimeAgo — Convierte un timestamp de Firebase a texto relativo en español.
 * @param {Object|Date|number} timestamp — Timestamp de Firebase, Date o milisegundos.
 * @returns {string} — Texto formateado (ej: "Hace 5 min", "3 de jul.").
 */
export function formatTimeAgo(timestamp) {
    if (!timestamp) return "Hace un momento";
    
    // Si viene de Firebase (Timestamp), pasarlo a milisegundos
    const timeMs = typeof timestamp.toMillis === 'function' 
        ? timestamp.toMillis() 
        : (timestamp.seconds ? timestamp.seconds * 1000 : new Date(timestamp).getTime());
    
    const now = Date.now();
    const diffInSeconds = Math.floor((now - timeMs) / 1000);
    
    if (diffInSeconds < 60) {
        return "Hace un momento";
    }
    
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return `Hace ${diffInMinutes} min`;
    }
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return `Hace ${diffInHours} ${diffInHours === 1 ? 'hora' : 'horas'}`;
    }
    
    // Si pasaron 24 horas (1 día) o más, formatear la fecha
    const date = new Date(timeMs);
    const day = date.getDate();
    const months = ["ene.", "feb.", "mar.", "abr.", "may.", "jun.", "jul.", "ago.", "sep.", "oct.", "nov.", "dic."];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();
    
    if (year === currentYear) {
        return `${day} de ${month}`;
    } else {
        return `${day} de ${month} ${year}`;
    }
}
