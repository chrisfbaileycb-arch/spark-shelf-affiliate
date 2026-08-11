/* Echo Your Influence — notification worker for due-post reminders.
 * This worker only displays notifications the app hands it while a tab is
 * open, plus real Push events IF push delivery keys are ever configured.
 * It does not cache the app and is not an offline service worker.
 */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = { title: "Your campaign video is ready to publish!", body: "" };
  try {
    if (event.data) payload = { ...payload, ...event.data.json() };
  } catch {
    /* keep defaults */
  }
  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/favicon.svg",
      data: { url: "/publishing" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow(event.notification.data?.url || "/publishing"));
});
