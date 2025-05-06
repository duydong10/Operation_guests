import {
  fetchGetLastGuest,
  fetchGetGuestCount,
  fetchGetGuests,
} from "./api.js";
import { showGuestInfo, showGuestCount, renderGuestTable } from "./ui.js";
import { renderPagination } from "./pagination.js";
import { initCountdown } from "./countdown.js";

let guestsData = [];
let currentPage = 1;
let rowsPerPage = 13;

async function updateGuestCheckin() {
  try {
    const res = await fetchGetLastGuest();
    if (res.data) {
      showGuestInfo(res.data, res.url);
    } else {
      console.warn(res.message || "Không có dữ liệu.");
    }
  } catch (err) {
    console.error("Lỗi:", err);
  }
}

async function updateGuestCount() {
  try {
    const res = await fetchGetGuestCount();
    if (res.number_of_guests) {
      showGuestCount(res.count);
    } else {
      console.warn(res.message || "Không có dữ liệu.");
    }
  } catch (err) {
    console.error("Lỗi:", err);
  }
}

async function updateGuestData() {
  try {
    const res = await fetchGetGuests();
    // Sắp xếp: người đã check-in có timestamp => đưa lên đầu theo timestamp giảm dần
    const checkedIn = res
      .filter((g) => g.status && g.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Người chưa check-in sắp theo alphabet tên
    const notCheckedIn = res
      .filter((g) => !g.status)
      .sort((a, b) => {
        const nameA = (a.data?.name || "").toLowerCase();
        const nameB = (b.data?.name || "").toLowerCase();
        return nameA.localeCompare(nameB);
      });

    guestsData = [...checkedIn, ...notCheckedIn];
    renderGuestTable(guestsData, currentPage, rowsPerPage);
    renderPagination(guestsData, currentPage, rowsPerPage, changePage);

    setTimeout(hiddenGuestInfo, 100);

  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu khách mời:", err);
  }
}

function changePage(page) {
  currentPage = page;
  renderGuestTable(guestsData, currentPage, rowsPerPage);
  renderPagination(guestsData, currentPage, rowsPerPage, changePage);
}

function calculateRowsPerPage() {
  const headerHeight = 80;
  const theadHeight = 40;
  const titleHeight = 56;
  const tbody = document.getElementById("tbody-guests");
  const rowSample = tbody ? tbody.querySelector("tr") : null;

  let rowHeight = 53;
  if (rowSample) {
    rowHeight = rowSample.offsetHeight || 53;
  }

  const height = window.innerHeight;
  const newRows = Math.floor(
    (height - headerHeight - theadHeight - titleHeight - 104) / rowHeight
  );

  if (newRows !== rowsPerPage && newRows > 0) {
    rowsPerPage = newRows;
    console.log("Cập nhật rowsPerPage:", rowsPerPage);
    renderGuestTable(guestsData, currentPage, rowsPerPage);
    renderPagination(guestsData, currentPage, rowsPerPage, changePage);
  }
}

function hiddenGuestInfo() {
  const hc = document.getElementById("hidden-container");
  const pcontent = document.getElementById("popup-content");
  guestsData.forEach((guest) => {
    const el = document.getElementById(guest.qrcode);
    if (!el) return;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      pcontent.innerHTML = `
        <img src="${guest.url}" class="border border-none rounded-full w-70 aspect-square" alt="Guest"/>
        <p class="mt-8">${guest.data.name}</p>
        <p>${guest.data.age}</p>
        <p>${guest.data.company}</p>
        <p>${guest.data.position}</p>
      `;
      hc.style.display = "block";
    });
  });
}

window.addEventListener("DOMContentLoaded", function () {
  const tbody = document.getElementById("tbody-guests");

  calculateRowsPerPage();
  updateGuestCount();
  updateGuestData();

  if (tbody) {
    const resizeObserver = new ResizeObserver(() => {
      calculateRowsPerPage();
    });
    resizeObserver.observe(tbody);
  }

  const evtSource = new EventSource("/guests/stream");
  evtSource.onmessage = function () {
    updateGuestCount();
    updateGuestData();
    updateGuestCheckin();
  };
  initCountdown();
  evtSource.onerror = function (err) {
    console.error("SSE lỗi:", err);
  };
});
