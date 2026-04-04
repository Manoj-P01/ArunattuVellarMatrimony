const base = import.meta.env.VITE_API_URL ?? "";

export async function fetchInitialData() {
  const [profilesRes, notificationsRes] = await Promise.all([
    fetch(`${base}/api/profiles`),
    fetch(`${base}/api/notifications`),
  ]);
  if (!profilesRes.ok || !notificationsRes.ok) {
    throw new Error("Failed to load initial data from API");
  }
  const [profiles, notifications] = await Promise.all([
    profilesRes.json(),
    notificationsRes.json(),
  ]);
  return { profiles, notifications };
}
