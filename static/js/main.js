import { fetchLastGuest, fetchGuestCount, fetchGuests } from './api.js';
import { showGuestInfo, showGuestCount, renderGuestTable } from './ui.js';
import { renderPagination } from './pagination.js';
import { countdown } from './countdown.js';

let guestsData = [];
let currentPage = 1;
let rowsPerPage = 13;

async function updateGuestCheckin() {
  try {
    const res = await fetchLastGuest();
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
    const res = await fetchGuestCount();
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
    const res = await fetchGuests();
    guestsData = res.sort((a, b) => a.data.name.localeCompare(b.data.name));
    renderGuestTable(guestsData, currentPage, rowsPerPage);
    renderPagination(guestsData, currentPage, rowsPerPage, changePage);
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
  const newRows = Math.floor((height - headerHeight - theadHeight - titleHeight - 104) / rowHeight);

  if (newRows !== rowsPerPage && newRows > 0) {
    rowsPerPage = newRows;
    console.log("Cập nhật rowsPerPage:", rowsPerPage);
    renderGuestTable(guestsData, currentPage, rowsPerPage);
    renderPagination(guestsData, currentPage, rowsPerPage, changePage);
  }
}

window.addEventListener("DOMContentLoaded", function () {
  const tbody = document.getElementById("tbody-guests");

  calculateRowsPerPage();
  updateGuestCount();
  updateGuestData();

  countdown();
  setInterval(countdown, 1000);

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
  evtSource.onerror = function (err) {
    console.error("SSE lỗi:", err);
  };
});
