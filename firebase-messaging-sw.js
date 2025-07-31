// Importa e inicializa Firebase
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.6.1/firebase-messaging-compat.js');

// NOTA: Usa tu propia configuración de Firebase aquí
        const firebaseConfig = {
            apiKey: "AIzaSyA_4H46I7TCVLnFjet8fQPZ006latm-mRE",
            authDomain: "loginliverpool.firebaseapp.com",
            projectId: "loginliverpool",
            storageBucket: "loginliverpool.firebasestorage.app",
            messagingSenderId: "704223815941",
            appId: "1:704223815941:web:c871525230fb61caf96f6c",
            measurementId: "G-QFEPQ4TSPY"
        };

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Este código maneja las notificaciones cuando la app está en segundo plano
messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './icon-192.png' // Cambia esto por un ícono tuyo
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});