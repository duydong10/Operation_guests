import {
  fetchGetLastGuest,
  fetchGetGuestCount,
  fetchGetGuests,
} from "./api.js";
import {
  showGuestInfo,
  showGuestCount,
  renderGuestTable,
  hiddenGuestInfo,
} from "./ui.js";
import { renderPagination } from "./pagination.js";
import { initCountdown } from "./countdown.js";

let guestsData = [];
let currentPage = 1;
let rowsPerPage = 11;

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

    const checkedIn = res
      .filter((g) => g.image && g.timestamp)
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));


    const notCheckedIn = res
      .filter((g) => !g.status)
      .sort((a, b) => {
        const codeA = (a?.code || "").toLowerCase();
        const codeB = (b?.code || "").toLowerCase();
        return codeA.localeCompare(codeB);
      });

    guestsData = [...checkedIn, ...notCheckedIn];
    renderGuestTable(guestsData, currentPage, rowsPerPage);
    renderPagination(guestsData, currentPage, rowsPerPage, changePage);

    setTimeout(() => hiddenGuestInfo(guestsData), 100);
  } catch (err) {
    console.error("Lỗi khi lấy dữ liệu khách mời:", err);
  }
}

function changePage(page) {
  currentPage = page;
  renderGuestTable(guestsData, currentPage, rowsPerPage);
  renderPagination(guestsData, currentPage, rowsPerPage, changePage);
  setTimeout(() => hiddenGuestInfo(guestsData), 100);
}

function calculateRowsPerPage() {
  const headerHeight = 80;
  const theadHeight = 40;
  const titleHeight = 56;
  const tbody = document.getElementById("tbody-guests");
  const rowSample = tbody ? tbody.querySelector("tr") : null;

  let rowHeight = 74;
  if (rowSample) {
    rowHeight = rowSample.offsetHeight || 74;
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
    setTimeout(() => hiddenGuestInfo(guestsData), 100);
  }
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

  window.addEventListener("resize", calculateRowsPerPage);

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
