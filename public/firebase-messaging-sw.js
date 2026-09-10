importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA86w6QY5rrm9-BN_MTdm2XKj5HyAkmZe0",
  authDomain: "livingston-lift.firebaseapp.com",
  projectId: "livingston-lift",
  storageBucket: "livingston-lift.firebasestorage.app",
  messagingSenderId: "476847711255",
  appId: "1:476847711255:web:7167287b68a9624d15a852"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/icon.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});