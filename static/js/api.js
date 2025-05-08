export async function fetchGetLastGuest() {
  const res = await fetch("/api/get_last_guest", { method: "GET" });
  return await res.json();
}

export async function fetchGetGuestCount() {
  const res = await fetch("/api/get_count_guests", { method: "GET" });
  return await res.json();
}

export async function fetchGetGuests() {
  const res = await fetch("/api/get_guests", { method: "GET" });
  return await res.json();
}

export async function fetchGetStartTime() {
  const res = await fetch("/api/get_starttime", { method: "GET" });
  return await res.json();
}

export async function fetchGetRfid() {
  const res = await fetch("/api/get_rfid", { method: "GET" });
  return await res.json();
}

export async function fetchPostStartTime(starttime) {
  const res = await fetch("/api/set_starttime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(starttime),
  });
}