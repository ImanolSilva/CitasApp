// =======================================================
//  1. IMPORTACIONES DE FIREBASE
// =======================================================
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, doc, getDoc, addDoc, updateDoc, deleteDoc, onSnapshot, collection, query, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-storage.js";
import { getMessaging, getToken, onMessage } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging.js";


// =======================================================
//  2. REFERENCIAS AL DOM Y VARIABLES GLOBALES
// =======================================================
const loadingSpinner = document.getElementById('loadingSpinner');
const authSection = document.getElementById('authSection');
const appSection = document.getElementById('appSection');
const authEmail = document.getElementById('authEmail');
const authPassword = document.getElementById('authPassword');
const loginBtn = document.getElementById('loginBtn');
const registerBtn = document.getElementById('registerBtn');
const authMessage = document.getElementById('authMessage');
const logoutBtn = document.getElementById('logoutBtn');
const addAppointmentBtn = document.getElementById('addAppointmentBtn');
const toggleThemeBtn = document.getElementById('toggleThemeBtn');
const themeIcon = document.getElementById('themeIcon');
const appointmentsGrid = document.getElementById('appointmentsGrid');
const noAppointmentsMessage = document.getElementById('noAppointmentsMessage');
const appointmentModal = document.getElementById('appointmentModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const appointmentForm = document.getElementById('appointmentForm');
const modalTitle = document.getElementById('modalTitle');
const appointmentIdInput = document.getElementById('appointmentId');
const appointmentTitleInput = document.getElementById('appointmentTitle');
const appointmentDateInput = document.getElementById('appointmentDate');
const appointmentTimeInput = document.getElementById('appointmentTime');
const appointmentDescriptionInput = document.getElementById('appointmentDescription');
const imageUploadInput = document.getElementById('imageUpload');
const uploadImageBtn = document.getElementById('uploadImageBtn');
const imagePreview = document.getElementById('imagePreview');
const generateImageBtn = document.getElementById('generateImageBtn');
const iconPreview = document.getElementById('iconPreview');
const customIconInput = document.getElementById('customIconInput');
const suggestIconButton = document.getElementById('suggestIconButton');
const messageBoxContainer = document.getElementById('messageBox');
const userIdDisplay = document.getElementById('userIdDisplay');
const appointmentLocationInput = document.getElementById('appointmentLocation');
const appointmentVideoUrlInput = document.getElementById('appointmentVideoUrl');
const mediaModal = document.getElementById('mediaModal');
const mediaModalTitle = document.getElementById('mediaModalTitle');
const mediaModalBody = document.getElementById('mediaModalBody');
const closeMediaModalBtn = document.getElementById('closeMediaModalBtn');

let app, db, auth, storage, messaging, userId;
let firebaseApiKey = "";


// =======================================================
//  3. FUNCIONES DE UTILIDAD
// =======================================================
const showLoading = () => loadingSpinner.classList.add('show');
const hideLoading = () => loadingSpinner.classList.remove('show');

function showMessage(message, type = 'info') {
    const icons = { success: 'fa-check-circle', error: 'fa-times-circle', info: 'fa-info-circle' };
    const colors = { success: 'bg-green-500', error: 'bg-red-500', info: 'bg-blue-500' };
    const messageElement = document.createElement('div');
    messageElement.className = `message-box ${colors[type]}`;
    messageElement.innerHTML = `<i class="fas ${icons[type]} icon"></i><p>${message}</p>`;
    messageBoxContainer.appendChild(messageElement);
    messageBoxContainer.classList.remove('hidden');
    setTimeout(() => {
        messageElement.style.animation = 'fadeOut 0.5s forwards';
        messageElement.addEventListener('animationend', () => {
            messageElement.remove();
            if (messageBoxContainer.children.length === 0) {
                messageBoxContainer.classList.add('hidden');
            }
        });
    }, 4000);
}

function base64ToBlob(base64, mimeType) {
    const byteString = atob(base64.split(',')[1]);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) { ia[i] = byteString.charCodeAt(i); }
    return new Blob([ab], { type: mimeType });
}


// =======================================================
//  4. LÓGICA DE FIREBASE Y AUTENTICACIÓN
// =======================================================
async function setupFirebase() {
    showLoading();
    try {
        const firebaseConfig = {
            apiKey: "AIzaSyA_4H46I7TCVLnFjet8fQPZ006latm-mRE",
            authDomain: "loginliverpool.firebaseapp.com",
            projectId: "loginliverpool",
            storageBucket: "loginliverpool.appspot.com",
            messagingSenderId: "704223815941",
            appId: "1:704223815941:web:c871525230fb61caf96f6c",
        };
        firebaseApiKey = firebaseConfig.apiKey;
        app = initializeApp(firebaseConfig);
        db = getFirestore(app); auth = getAuth(app); storage = getStorage(app); messaging = getMessaging(app);
        
        onAuthStateChanged(auth, (user) => {
            if (user) {
                userId = user.uid;
                userIdDisplay.textContent = `UID: ${userId.substring(0, 8)}...`;
                authSection.classList.add('hidden');
                appSection.classList.remove('hidden');
                listenForAppointments();
                requestNotificationPermission(); 
            } else {
                userId = null;
                authSection.classList.remove('hidden');
                appSection.classList.add('hidden');
                appointmentsGrid.innerHTML = '';
            }
            hideLoading();
        });
    } catch (error) {
        console.error("Error al configurar Firebase:", error);
        authMessage.textContent = `Error de Firebase: ${error.message}`;
        hideLoading();
    }
}

async function handleAuthAction(action) {
    showLoading();
    const email = authEmail.value; const password = authPassword.value;
    authMessage.textContent = '';
    try {
        if (action === 'login') {
            await signInWithEmailAndPassword(auth, email, password);
            showMessage('Inicio de sesión exitoso.', 'success');
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
            showMessage('Registro exitoso. ¡Bienvenido!', 'success');
        }
    } catch (error) {
        console.error(`Error de ${action}:`, error);
        authMessage.textContent = error.message;
        showMessage(`Error en ${action}: ${error.code}`, 'error');
    } finally {
        hideLoading();
    }
}

async function handleLogout() {
    showLoading();
    try {
        await signOut(auth);
        showMessage('Sesión cerrada correctamente.', 'info');
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        showMessage(`Error al cerrar sesión: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}


// =======================================================
//  5. GESTIÓN DE CITAS (CRUD)
// =======================================================
function renderAppointments(appointments) {
    appointmentsGrid.innerHTML = '';
    if (appointments.length === 0) { noAppointmentsMessage.classList.remove('hidden'); return; }
    noAppointmentsMessage.classList.add('hidden');
    appointments.forEach((appointment, index) => {
        const date = new Date(appointment.dateTime);
        const day = date.getDate();
        const month = date.toLocaleDateString('es-ES', { month: 'short' });
        const formattedTime = date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const statusInfo = {
            cumplida: { text: 'Cumplida', class: 'cumplida', icon: 'fa-check-circle' },
            'no-asistimos': { text: 'No Asistida', class: 'no-asistimos', icon: 'fa-times-circle' },
            pendiente: { text: 'Pendiente', class: 'pendiente', icon: 'fa-hourglass-half' }
        }[appointment.status || 'pendiente'];
        const cardElement = document.createElement('div');
        cardElement.className = 'card-appointment';
        cardElement.setAttribute('data-appointment-id', appointment.id);
        cardElement.style.animationDelay = `${index * 100}ms`;
        const locationHTML = appointment.location ? `<div class="info-item"><i class="fas fa-map-marker-alt fa-fw"></i><button data-action="show-map" data-location="${appointment.location}" title="${appointment.location}">Ver en Mapa</button></div>` : '';
        const videoHTML = appointment.videoUrl ? `<div class="info-item"><i class="fas fa-video fa-fw"></i><button data-action="show-video" data-url="${appointment.videoUrl}">Ver video de referencia</button></div>` : '';
        cardElement.innerHTML = `
            <div class="card-content">
                <div class="card-image-container" style="background-image: url('${appointment.imageUrl || './placeholder.png'}')">
                    <div class="card-header"><div class="status-pill ${statusInfo.class}"><i class="fas ${statusInfo.icon}"></i><span>${statusInfo.text}</span></div><div class="date-display"><div class="date-day">${day}</div><div class="date-month">${month}</div></div></div>
                    <div class="card-footer"><h4>${appointment.title}</h4></div>
                </div>
                <div class="card-body">
                    <div class="space-y-3 mb-4">
                        <div class="info-item"><i class="fas fa-clock fa-fw"></i><span>${formattedTime}</span></div>
                        <div class="info-item"><i class="${appointment.icon || 'fas fa-star'} fa-fw"></i><span class="flex-1">${appointment.description || 'Sin descripción.'}</span></div>
                        ${locationHTML}
                        ${videoHTML}
                    </div>
                    <div class="card-actions">
                        ${appointment.status !== 'cumplida' ? `<button class="btn-action-card" data-action="complete" title="Marcar como Cumplida"><i class="fas fa-check"></i></button>` : ''}
                        ${appointment.status !== 'no-asistimos' ? `<button class="btn-action-card" data-action="miss" title="Marcar como No Asistida"><i class="fas fa-times"></i></button>` : ''}
                        ${appointment.status !== 'pendiente' ? `<button class="btn-action-card" data-action="reset" title="Marcar como Pendiente"><i class="fas fa-history"></i></button>` : ''}
                        <div class="flex-grow"></div>
                        <button class="btn-action-card" data-action="edit" title="Editar"><i class="fas fa-pencil-alt"></i></button>
                        <button class="btn-action-card" data-action="delete" title="Eliminar"><i class="fas fa-trash-alt"></i></button>
                    </div>
                </div>
            </div>`;
        appointmentsGrid.appendChild(cardElement);
    });
}
async function listenForAppointments() {
    if (!userId) return;
    const q = query(collection(db, `users/${userId}/appointments`));
    onSnapshot(q, (snapshot) => {
        const appointments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        appointments.sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime));
        renderAppointments(appointments);
    }, (error) => {
        console.error("Error al escuchar citas:", error);
        showMessage("Error al cargar las citas.", 'error');
    });
}
async function toggleAppointmentStatus(id, status) {
    showLoading();
    try {
        const appointmentRef = doc(db, `users/${userId}/appointments`, id);
        await updateDoc(appointmentRef, { status: status });
        showMessage('Estado de la cita actualizado.', 'success');
    } catch (error) {
        console.error("Error al actualizar estado:", error);
        showMessage("Error al cambiar el estado de la cita.", 'error');
    } finally {
        hideLoading();
    }
}
async function saveAppointment(event) {
    event.preventDefault();
    showLoading();
    const id = appointmentIdInput.value;
    let currentStatus = 'pendiente';
    if (id) {
        const docRef = doc(db, `users/${userId}/appointments`, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) { currentStatus = docSnap.data().status; }
    }
    const appointmentData = {
        title: appointmentTitleInput.value,
        dateTime: `${appointmentDateInput.value}T${appointmentTimeInput.value}`,
        description: appointmentDescriptionInput.value,
        icon: customIconInput.value || iconPreview.className,
        userId: userId,
        status: currentStatus,
        location: appointmentLocationInput.value,
        videoUrl: appointmentVideoUrlInput.value,
    };
    try {
        let imageUrlToSave = imagePreview.src;
        if (imagePreview.src.includes('placeholder.png')) {
            imageUrlToSave = '';
        }
        const file = imageUploadInput.files[0];
        const isGenerated = imagePreview.src.startsWith('data:image/');
        if (file || isGenerated) {
            const blob = file ? file : base64ToBlob(imagePreview.src, 'image/png');
            const storageRef = ref(storage, `images/appointments/${userId}/${Date.now()}`);
            const uploadTask = await uploadBytes(storageRef, blob);
            imageUrlToSave = await getDownloadURL(uploadTask.ref);
        }
        appointmentData.imageUrl = imageUrlToSave;
        if (id) {
            await updateDoc(doc(db, `users/${userId}/appointments`, id), appointmentData);
            showMessage('Cita actualizada correctamente.', 'success');
        } else {
            await addDoc(collection(db, `users/${userId}/appointments`), appointmentData);
            showMessage('Cita guardada correctamente.', 'success');
        }
        closeAppointmentModal();
    } catch (error) {
        console.error("Error al guardar cita:", error);
        showMessage(`Error al guardar: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}
async function openEditModal(id) {
    showLoading();
    try {
        const docRef = doc(db, `users/${userId}/appointments`, id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            modalTitle.textContent = 'Editar Cita';
            appointmentForm.reset();
            appointmentIdInput.value = id;
            appointmentTitleInput.value = data.title;
            if (data.dateTime && !isNaN(new Date(data.dateTime))) {
                const dt = new Date(data.dateTime);
                appointmentDateInput.value = dt.toISOString().split('T')[0];
                appointmentTimeInput.value = dt.toTimeString().substring(0, 5);
            } else {
                console.warn(`Cita con ID ${id} tiene una fecha inválida:`, data.dateTime);
                appointmentDateInput.value = '';
                appointmentTimeInput.value = '';
            }
            appointmentDescriptionInput.value = data.description || '';
            imagePreview.src = data.imageUrl || './placeholder.png';
            iconPreview.className = `${data.icon || 'fas fa-calendar-alt'} text-3xl text-accent w-8 text-center`;
            customIconInput.value = data.icon || '';
            appointmentLocationInput.value = data.location || '';
            appointmentVideoUrlInput.value = data.videoUrl || '';
            appointmentModal.classList.remove('hidden');
        } else {
            showMessage('La cita no fue encontrada.', 'error');
        }
    } catch (error) {
        console.error("Error al abrir modal de edición:", error);
        showMessage("Error al cargar la cita para editar.", 'error');
    } finally {
        hideLoading();
    }
}
async function deleteAppointment(id) {
    if (!confirm('¿Estás segura de que quieres eliminar esta cita permanentemente?')) return;
    showLoading();
    try {
        await deleteDoc(doc(db, `users/${userId}/appointments`, id));
        showMessage('Cita eliminada.', 'success');
    } catch (error) {
        console.error("Error al eliminar cita:", error);
        showMessage("Error al eliminar la cita.", 'error');
    } finally {
        hideLoading();
    }
}


// =======================================================
//  6. LÓGICA DE UI (MODAL, TEMA, IMÁGENES)
// =======================================================
function openAddModal() {
    modalTitle.textContent = 'Nueva Cita';
    appointmentForm.reset();
    appointmentIdInput.value = '';
    imagePreview.src = './placeholder.png';
    iconPreview.className = 'fas fa-calendar-alt text-3xl text-accent w-8 text-center';
    customIconInput.value = 'fas fa-calendar-alt';
    appointmentModal.classList.remove('hidden');
}
const closeAppointmentModal = () => appointmentModal.classList.add('hidden');
function showMapModal(location) {
    mediaModalTitle.textContent = "Ubicación de la Cita";
    const mapUrl = `https://maps.google.com/maps?q=$4{firebaseApiKey}&q=${encodeURIComponent(location)}`;
    mediaModalBody.innerHTML = `<iframe src="${mapUrl}" loading="lazy"></iframe>`;
    mediaModal.classList.remove('hidden');
}
function getYoutubeVideoId(url) {
    const youtubeRegex = /^(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^\/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
    const match = url.match(youtubeRegex);
    return match ? match[1] : null;
}
function showVideoModal(videoUrl) {
    const videoId = getYoutubeVideoId(videoUrl);
    if (videoId) {
        mediaModalTitle.textContent = "Video de Referencia";
        const embedUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1`;
        mediaModalBody.innerHTML = `<iframe src="${embedUrl}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
        mediaModal.classList.remove('hidden');
    } else {
        showMessage("Este video no es de YouTube, se abrirá en una nueva pestaña.", "info");
        window.open(videoUrl, '_blank');
    }
}
function closeMediaModal() {
    mediaModal.classList.add('hidden');
    mediaModalBody.innerHTML = '';
}
function toggleTheme() {
    document.body.classList.toggle('light-mode');
    document.body.classList.toggle('dark-mode');
    const isDarkMode = document.body.classList.contains('dark-mode');
    themeIcon.className = `fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`;
    localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
}
window.previewImage = function(event) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => imagePreview.src = e.target.result;
        reader.readAsDataURL(file);
    }
}
async function generateImageWithAI() {
    const prompt = appointmentTitleInput.value || appointmentDescriptionInput.value;
    if (!prompt) { return showMessage('Introduce un título para generar una imagen.', 'info'); }
    showLoading();
    try {
        const apiKey = "AIzaSyAc-0QNQ7-pCgj_T19e-UJbZiJVKn0kbdA";
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
        const payload = { instances: [{ prompt }], parameters: { "sampleCount": 1 } };
        const response = await fetch(apiUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        const result = await response.json();
        if (result.predictions?.[0]?.bytesBase64Encoded) {
            imagePreview.src = `data:image/png;base64,${result.predictions[0].bytesBase64Encoded}`;
            showMessage('Imagen generada con éxito.', 'success');
        } else {
            throw new Error(result.error?.message || 'Respuesta inválida de la API.');
        }
    } catch (error) {
        console.error("Error al generar imagen con IA:", error);
        showMessage(`Error de IA: ${error.message}`, 'error');
    } finally {
        hideLoading();
    }
}
function suggestIcon() {
    const title = appointmentTitleInput.value.toLowerCase();
    const map = {
        'reunión': 'fas fa-handshake', 'doctor': 'fas fa-stethoscope', 'médico': 'fas fa-stethoscope',
        'cumpleaños': 'fas fa-birthday-cake', 'fiesta': 'fas fa-glass-cheers', 'comida': 'fas fa-utensils',
        'viaje': 'fas fa-plane-departure', 'vacaciones': 'fas fa-umbrella-beach', 'deporte': 'fas fa-dumbbell',
        'clase': 'fas fa-book-open', 'estudio': 'fas fa-graduation-cap', 'trabajo': 'fas fa-briefcase',
        'llamada': 'fas fa-phone-alt', 'coche': 'fas fa-car-side', 'compras': 'fas fa-shopping-bag',
        'café': 'fas fa-coffee', 'película': 'fas fa-film', 'concierto': 'fas fa-music'
    };
    let suggestedClass = 'fas fa-star';
    for (const key in map) {
        if (title.includes(key)) { suggestedClass = map[key]; break; }
    }
    iconPreview.className = `${suggestedClass} text-3xl text-accent w-8 text-center`;
    customIconInput.value = suggestedClass;
}


// =======================================================
//  7. NOTIFICACIONES Y EVENT LISTENERS
// =======================================================
async function saveFCMToken(token) {
    if (!userId) return;
    try {
        const tokenRef = doc(db, `users/${userId}/fcmTokens`, token);
        await setDoc(tokenRef, { token: token, createdAt: new Date() });
        console.log('Token de FCM guardado en Firestore.');
    } catch (error) {
        console.error('Error al guardar el token de FCM:', error);
    }
}

async function requestNotificationPermission() {
    try {
        if (!('Notification' in window) || !messaging) {
            console.error("Este navegador no es compatible con las notificaciones.");
            return;
        }

        // DETECTA EL ENTORNO PARA USAR LA RUTA CORRECTA DEL SERVICE WORKER
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const swPath = isLocal ? '/firebase-messaging-sw.js' : '/CitasApp/firebase-messaging-sw.js';
        
        console.log(`Intentando registrar Service Worker en la ruta: ${swPath}`);
        const swRegistration = await navigator.serviceWorker.register(swPath);
        console.log("Service Worker registrado con éxito en el scope:", swRegistration.scope);
        
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            showMessage('¡Notificaciones activadas!', 'success');
            const vapidKey = 'BHEl2UQpgEU8Rd9a1GttWtiUYwbqSJ4nKK7jpQsQxGhFh4xKGaSEH-7hN-EW6zWVBZXeA9PfeMtGGHPNCw0f2G0';
            
            const token = await getToken(messaging, { 
                vapidKey: vapidKey,
                serviceWorkerRegistration: swRegistration
            });
            
            console.log('Token de FCM obtenido:', token);
            await saveFCMToken(token);

            onMessage(messaging, (payload) => {
                console.log('Mensaje recibido en primer plano:', payload);
                showMessage(`${payload.notification.title}: ${payload.notification.body}`, 'info');
            });
        }
    } catch (error) {
        console.error("Error al configurar notificaciones:", error);
        showMessage('Error al configurar notificaciones.', 'error');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.replace('dark-mode', 'light-mode');
        themeIcon.className = 'fas fa-moon';
    }
    setupFirebase();
});

appointmentsGrid.addEventListener('mousemove', e => {
    const card = e.target.closest('.card-appointment');
    if (card) {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        card.style.setProperty('--mouse-x', `${x}px`);
        card.style.setProperty('--mouse-y', `${y}px`);
    }
});

closeMediaModalBtn.addEventListener('click', closeMediaModal);
closeModalBtn.addEventListener('click', closeAppointmentModal);
loginBtn.addEventListener('click', () => handleAuthAction('login'));
registerBtn.addEventListener('click', () => handleAuthAction('register'));
logoutBtn.addEventListener('click', handleLogout);
addAppointmentBtn.addEventListener('click', openAddModal);
appointmentForm.addEventListener('submit', saveAppointment);
toggleThemeBtn.addEventListener('click', toggleTheme);
uploadImageBtn.addEventListener('click', () => imageUploadInput.click());
generateImageBtn.addEventListener('click', generateImageWithAI);
suggestIconButton.addEventListener('click', suggestIcon);
customIconInput.addEventListener('input', () => {
    iconPreview.className = `${customIconInput.value || 'fas fa-star'} text-3xl text-accent w-8 text-center`;
});
appointmentTitleInput.addEventListener('input', suggestIcon);

appointmentsGrid.addEventListener('click', (e) => {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const card = button.closest('.card-appointment');
    const id = card ? card.dataset.appointmentId : null;
    const action = button.dataset.action;
    const actions = {
        'edit': () => openEditModal(id),
        'delete': () => deleteAppointment(id),
        'complete': () => toggleAppointmentStatus(id, 'cumplida'),
        'miss': () => toggleAppointmentStatus(id, 'no-asistimos'),
        'reset': () => toggleAppointmentStatus(id, 'pendiente'),
        'show-map': () => showMapModal(button.dataset.location),
        'show-video': () => showVideoModal(button.dataset.url),
    };
    if (actions[action]) { actions[action](); }
});