const startTime = { hours: 20, minutes: 0, seconds: 0 };

export function countdown() {
  const today = new Date();
  let diffHours = startTime.hours - today.getHours();
  let diffMinutes = startTime.minutes - today.getMinutes();
  let diffSeconds = startTime.seconds - today.getSeconds();

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

  document.getElementById("countdown").innerHTML = `${hours}:${minutes}:${seconds}`;
}
