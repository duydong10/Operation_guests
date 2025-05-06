export function showGuestInfo(data, url) {
  document.getElementById("guest-image").innerHTML = `
      <img src="${url}" class="border border-none rounded-full min-w-full aspect-square" alt="Guest"/>
    `;
  document.getElementById("guest-checkin").innerHTML = `
      <ul class="pl-10">
        <li class="mb-2"><p><strong>Họ tên: </strong>${data.name}</p></li>
        <li class="mb-2"><p><strong>Tuổi: </strong>${data.age}</p></li>
        <li class="mb-2"><p><strong>Đơn vị: </strong>${data.company}</p></li>
        <li class="mb-2"><p><strong>Vị trí: </strong>${data.position}</p></li>
      </ul>
    `;
  document.getElementById("guest-image").style.display = "inline";
  document.getElementById("guest-checkin").style.display = "inline";

  setTimeout(() => {
    document.getElementById("guest-image").innerHTML = `
        <img src="../static/images/portrait-placeholder.jpg" class="border border-none rounded-full min-w-full aspect-square" />
      `;
    document.getElementById("guest-checkin").innerHTML = `
        <p class="text-gray-400 text-center">No Information</p>
      `;
  }, 5000);
}

export function showGuestCount(count) {
  document.getElementById("number-of-guests").innerHTML = `
      <strong>${count}</strong>
    `;
}

export function renderGuestTable(guestsData, currentPage, rowsPerPage) {
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
        <td class="px-6 py-4"><img src="${guest.url}" id="${guest.qrcode}" class="h-[41px] cursor-pointer"></td>
        <td class="px-6 py-4">${guest.data.name}</td>
        <td class="px-6 py-4">${guest.data.age}</td>
        <td class="px-6 py-4">${guest.data.company}</td>
        <td class="px-6 py-4 ${
          guest.status ? "text-green-500" : "text-red-500"
        }">
          ${guest.status ? "Đã check-in" : "Chưa check-in"}
        </td>
      `;
    tbody.appendChild(row);
  });
}
