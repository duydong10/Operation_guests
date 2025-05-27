// api.js
// fetch APIs
//-------------------------------------------------------------

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

export async function fetchGetTCP() {
  const res = await fetch("/api/get_tcpclient", { method: "GET" });
  return await res.json();
}

export async function fetchGetMinio() {
  const res = await fetch("/api/get_minio", { method: "GET" });
  return await res.json();
}

export async function fetchPostStartTime(starttime) {
  const res = await fetch("/api/set_starttime", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(starttime),
  });
}

export async function fetchPostTCP(tcp_host, tcp_port) {
  const res = await fetch("/api/set_tcpclient", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ tcp_host, tcp_port }),
  })
}

export async function fetchPostMinio(end_point, access_key, secret_key, bucket_name) {
  const res = await fetch("/api/set_minio", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ end_point, access_key, secret_key, bucket_name }),
  })
}
