// Clique no aviso de pendência: traz o sistema para a frente (ou abre).
self.addEventListener("notificationclick", (evento) => {
  evento.notification.close();
  const url = (evento.notification.data && evento.notification.data.url) || "/";
  evento.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((janelas) => {
      for (const j of janelas) if ("focus" in j) return j.focus().then((f) => f && f.navigate && f.navigate(url));
      return self.clients.openWindow(url);
    }),
  );
});
