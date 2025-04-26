let guestsData = [];
let currentPage = 1;
const rowsPerPage = 12;

function updateGuestCheckin() {
  fetch("/api/get_last_guest")
    .then((res) => res.json())
    .then((res) => {
      if (res) {
        document.getElementById("guest-image").innerHTML = `
        <img src="${res.url}" alt="Guest"/>
        `;
        document.getElementById("guest-checkin").innerHTML = `
        <ul>
          <li><strong>Họ tên: </strong>${res.data.name}</li>
          <li><strong>Tuổi: </strong>${res.data.age}</li>
          <li><strong>Đơn vị: </strong>${res.data.company}</li>
          <li><strong>Vị trí: </strong>${res.data.position}</li>
        </ul>
        `;
        document.getElementById("guest-image").style.display = "inline";
        document.getElementById("guest-checkin").style.display = "inline";
        setTimeout(() => {
          document.getElementById("guest-image").style.display = "none";
          document.getElementById("guest-checkin").style.display = "none";
        }, 5000);
      } else {
        console.warn(res.message || "Không có dữ liệu.");
      }
    })
    .catch((err) => {
      console.error("Lỗi:", err);
    });
}

function updateGuestCount() {
  fetch("/api/get_count_guests")
    .then((res) => res.json())
    .then((res) => {
      if (res.number_of_guests) {
        document.getElementById("number-of-guests").innerHTML = `
          <strong>${res.count}/${res.number_of_guests}</strong>
        `;
      } else {
        console.warn(res.message || "Không có dữ liệu.");
      }
    })
    .catch((err) => {
      console.error("Lỗi:", err);
    });
}

function updateGuestData() {
  fetch("/api/get_guests")
    .then((res) => res.json())
    .then((res) => {
      guestsData = res.sort((a, b) => a.data.name.localeCompare(b.data.name));
      renderGuestTable();
      renderPagination();
    })
    .catch((err) => console.error("Lỗi khi lấy dữ liệu khách mời:", err));
}

function renderGuestTable() {
  const tbody = document.getElementById("tbody-guests");
  tbody.innerHTML = "";

  const start = (currentPage - 1) * rowsPerPage;
  const end = start + rowsPerPage;
  const pageData = guestsData.slice(start, end);

  pageData.forEach((guest, index) => {
    const row = document.createElement("tr");
    row.className = "odd:bg-white even:bg-gray-50 border-b border-gray-200";
    row.innerHTML = `
      <td class="px-6 py-4">${start + index + 1}</td>
      <td class="px-6 py-4">${guest.data.name}</td>
      <td class="px-6 py-4">${guest.data.age}</td>
      <td class="px-6 py-4">${guest.data.company}</td>
      <td class="px-6 py-4 ${
        guest.status ? "text-green-500" : "text-red-500"
      }">${guest.status ? "Đã check-in" : "Chưa check-in"}</td>
    `;
    tbody.appendChild(row);
  });
}

function renderPagination() {
  const pagination = document.getElementById("pagination-guests");
  const totalPages = Math.ceil(guestsData.length / rowsPerPage);
  const startEntry = (currentPage - 1) * rowsPerPage + 1;
  const endEntry = Math.min(currentPage * rowsPerPage, guestsData.length);

  let html = `
    <nav class="flex items-center justify-between pt-4" aria-label="Table navigation">
      <span class="text-sm font-normal text-gray-500">Showing 
        <span class="font-semibold text-gray-900">${startEntry}-${endEntry}</span> of 
        <span class="font-semibold text-gray-900">${guestsData.length}</span>
      </span>
      <ul class="inline-flex -space-x-px text-sm h-8">
        <li>
          <a href="#" data-page="${
            currentPage - 1
          }" class="page-btn flex items-center justify-center px-3 h-8 border rounded-s-lg ${
    currentPage === 1 ? "pointer-events-none opacity-50" : ""
  }">Previous</a>
        </li>`;

  for (let i = 1; i <= totalPages; i++) {
    html += `
      <li>
        <a href="#" data-page="${i}" class="page-btn flex items-center justify-center px-3 h-8 ${
      i === currentPage ? "bg-blue-500 text-white" : ""
    } border">${i}</a>
      </li>`;
  }

  html += `
        <li>
          <a href="#" data-page="${
            currentPage + 1
          }" class="page-btn flex items-center justify-center px-3 h-8 border rounded-e-lg ${
    currentPage === totalPages ? "pointer-events-none opacity-50" : ""
  }">Next</a>
        </li>
      </ul>
    </nav>`;

  pagination.innerHTML = html;

  document.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const page = parseInt(btn.getAttribute("data-page"));
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        currentPage = page;
        renderGuestTable();
        renderPagination();
      }
    });
  });
}

window.addEventListener("DOMContentLoaded", function () {
  // Gọi ban đầu
  updateGuestCount();
  updateGuestData();

  // Lắng nghe từ server
  const evtSource = new EventSource("/guests/stream");

  evtSource.onmessage = function (event) {
    console.log("Nhận dữ liệu SSE:", event.data);

    // Khi có thay đổi thì gọi lại function
    updateGuestCount();
    updateGuestData();
    updateGuestCheckin();
  };

  evtSource.onerror = function (err) {
    console.error("SSE lỗi:", err);
    // Có thể thử reconnect nếu cần
  };
});
