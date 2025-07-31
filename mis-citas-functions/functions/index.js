const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore} = require("firebase-admin/firestore");
const {getMessaging} = require("firebase-admin/messaging");
const logger = require("firebase-functions/logger");

initializeApp();

async function sendNotificationToUser(userId, payload) {
  const db = getFirestore();
  const tokensSnapshot = await db.collection(`users/${userId}/fcmTokens`).get();
  if (tokensSnapshot.empty) {
    logger.warn(`No FCM tokens found for user: ${userId}`);
    return;
  }
  const tokens = tokensSnapshot.docs.map((snap) => snap.id);
  logger.log(`Sending notification to user ${userId} with tokens:`, tokens);
  return getMessaging().sendToDevice(tokens, payload);
}

exports.onAppointmentCreate = onDocumentCreated("users/{userId}/appointments/{appointmentId}", async (event) => {
  const appointment = event.data.data();
  const userId = event.params.userId;
  logger.log(`New appointment created for user ${userId}:`, appointment.title);
  const payload = {
    notification: {
      title: "✅ Cita Creada",
      body: `Tu cita "${appointment.title}" ha sido agendada con éxito.`,
    },
  };
  return sendNotificationToUser(userId, payload);
});

exports.onAppointmentUpdate = onDocumentUpdated("users/{userId}/appointments/{appointmentId}", async (event) => {
  const appointmentAfter = event.data.after.data();
  const userId = event.params.userId;
  logger.log(`Appointment updated for user ${userId}:`, appointmentAfter.title);
  const payload = {
    notification: {
      title: "🔄 Cita Actualizada",
      body: `Tu cita "${appointmentAfter.title}" ha sido modificada.`,
    },
  };
  return sendNotificationToUser(userId, payload);
});

exports.dailyReminder = onSchedule("every day 09:00", async (event) => {
  logger.log("Running daily check for tomorrow's appointments...");
  const db = getFirestore();
  const today = new Date();
  const tomorrowStart = new Date(today);
  tomorrowStart.setDate(today.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);
  const query = db.collectionGroup("appointments")
    .where("dateTime", ">=", tomorrowStart.toISOString())
    .where("dateTime", "<=", tomorrowEnd.toISOString())
    .where("status", "==", "pendiente");
  const appointmentsSnapshot = await query.get();
  if (appointmentsSnapshot.empty) {
    logger.log("No appointments scheduled for tomorrow.");
    return null;
  }
  const promises = [];
  appointmentsSnapshot.forEach((doc) => {
    const appointment = doc.data();
    const userId = appointment.userId;
    const payload = {
      notification: {
        title: "🗓️ Recordatorio: Cita Mañana",
        body: `No olvides tu cita "${appointment.title}" programada para mañana.`,
      },
    };
    promises.push(sendNotificationToUser(userId, payload));
  });
  await Promise.all(promises);
  logger.log(`Sent ${promises.length} reminders for tomorrow's appointments.`);
  return null;
});