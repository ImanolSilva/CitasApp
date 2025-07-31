const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {initializeApp} = require("firebase-admin/app");
const {getFirestore, FieldValue} = require("firebase-admin/firestore");
const logger = require("firebase-functions/logger");

initializeApp();

async function createGlobalNotification(message, icon) {
  try {
    const db = getFirestore();
    const notificationsRef = db.collection("notifications");
    await notificationsRef.add({
      message: message,
      icon: icon,
      timestamp: FieldValue.serverTimestamp(),
    });
    logger.log(`Global notification created: ${message}`);
  } catch (error) {
    logger.error(`Failed to create global notification:`, error);
  }
}

exports.onAppointmentCreate = onDocumentCreated("appointments/{appointmentId}", (event) => {
  const appointment = event.data.data();
  const message = `Nueva cita agendada: "${appointment.title}".`;
  return createGlobalNotification(message, "fa-solid fa-calendar-plus");
});

exports.onAppointmentUpdate = onDocumentUpdated("appointments/{appointmentId}", (event) => {
  const appointmentAfter = event.data.after.data();
  const message = `La cita "${appointmentAfter.title}" ha sido modificada.`;
  return createGlobalNotification(message, "fa-solid fa-pen-to-square");
});

exports.dailyReminder = onSchedule("every day 09:00", async (event) => {
  const db = getFirestore();
  const today = new Date();
  const tomorrowStart = new Date(today);
  tomorrowStart.setDate(today.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const query = db.collection("appointments")
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
    const message = `Recordatorio: La cita "${appointment.title}" es mañana.`;
    promises.push(createGlobalNotification(message, "fa-solid fa-bell"));
  });
  
  await Promise.all(promises);
  logger.log(`Sent ${promises.length} reminders for tomorrow's appointments.`);
  return null;
});
