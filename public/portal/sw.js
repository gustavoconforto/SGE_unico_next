// Guardian portal service worker (scope /portal/): shows the school's pushed notices and opens the portal on tap.
self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(data.title || "Único Educacional", {
      body: data.body,
      icon: "/img/icon-192.png",
      data: { url: data.url || "/portal" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data.url;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => new URL(w.url).pathname.startsWith("/portal"));
      return open ? open.navigate(url).then((w) => (w || open).focus()) : self.clients.openWindow(url);
    }),
  );
});
