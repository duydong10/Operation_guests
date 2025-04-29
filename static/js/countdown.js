import { fetchGetStartTime, fetchPostStartTime } from "./api.js";

let startTime = null;

/**
 * Hàm khởi tạo countdown – chỉ gọi 1 lần khi DOM loaded
 */
export async function initCountdown() {
  try {
    // Gọi API để lấy thời gian bắt đầu chỉ một lần
    const res = await fetchGetStartTime();
    startTime = res;

    countdown(); // Hiển thị ngay lần đầu
    setInterval(countdown, 1000); // Cập nhật mỗi giây
  } catch (err) {
    console.error("Không thể lấy thời gian bắt đầu:", err);
  }
}

/**
 * Hàm đếm ngược, dùng thời gian đã được lưu từ initCountdown()
 */
function countdown() {
  if (!startTime) return;

  const now = new Date();
  let diffHours = startTime.hours - now.getHours();
  let diffMinutes = startTime.minutes - now.getMinutes();
  let diffSeconds = startTime.seconds - now.getSeconds();

  if (diffSeconds < 0) {
    diffSeconds += 60;
    diffMinutes--;
  }
  if (diffMinutes < 0) {
    diffMinutes += 60;
    diffHours--;
  }
  if (diffHours < 0) {
    diffHours = diffMinutes = diffSeconds = 0;
  }

  const hours = String(diffHours).padStart(2, "0");
  const minutes = String(diffMinutes).padStart(2, "0");
  const seconds = String(diffSeconds).padStart(2, "0");

  const el = document.getElementById("countdown");
  if (el) el.innerHTML = `${hours}:${minutes}:${seconds}`;
}

/**
 * Hàm xử lý form cập nhật thời gian trên trang setting
 */
export function set_startTime() {
  const form = document.getElementById("timeForm");
  if (!form) return;

  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const hours = parseInt(document.getElementById("hours").value, 10);
    const minutes = parseInt(document.getElementById("minutes").value, 10);
    const seconds = parseInt(document.getElementById("seconds").value, 10);

    const data = { hours, minutes, seconds };

    fetchPostStartTime(data)
      .then(() => {
        alert("⏱️ Thời gian bắt đầu đã được cập nhật!");
      })
      .catch((err) => {
        console.error("Lỗi cập nhật thời gian:", err);
        alert("❌ Cập nhật thất bại.");
      });
  });
}
