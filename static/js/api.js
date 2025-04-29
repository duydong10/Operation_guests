export async function fetchLastGuest() {
    const res = await fetch("/api/get_last_guest");
    return await res.json();
  }
  
  export async function fetchGuestCount() {
    const res = await fetch("/api/get_count_guests");
    return await res.json();
  }
  
  export async function fetchGuests() {
    const res = await fetch("/api/get_guests");
    return await res.json();
  }
  