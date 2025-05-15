export function showGuestInfo(data, url, code) {
  document.getElementById("guest-image").innerHTML = `
  <div class="">
      <img src="${url}" class="border-blue-600 border-2 rounded-full w-[300px] h-[300px] aspect-square p-1" alt="Guest"/></div>
    `;
  document.getElementById("guest-checkin").innerHTML = `
      <ul>
        <li class="text-black"><p><strong>${
    data.name
  }</strong></p></li>
        <li class="text-sm text-gray-500"><p>${data.company}</p></li>
        <li><div class="flex flex-row justify-center-safe mt-1">
          <p class="text-center border rounded-l-lg border-gray-400 py-1 px-2">Chức danh<br><strong>${data.position}</strong></p>
          <p class="text-center border border-gray-400 py-1 px-2">Code<br><strong>${code}</strong></p>
          <p class="text-center border rounded-r-lg border-gray-400 py-1 px-2">Bàn tiệc số<br><strong>${data.tableid}</strong></p>
          </div></li>
      </ul>
      <p class="text-center text-gray-400 p-2">Chân thành cảm ơn Quý khách hàng - Quý đối tác đã tham gia sự kiện <strong>Kỷ niệm 10 năm thành lập Tân Hưng Hà và Công bố thành lập THH Holdings!</strong></p>
    `;
  document.getElementById("guest-image").style.display = "inline";
  document.getElementById("guest-checkin").style.display = "inline";
}

export function showGuestCount(count) {
  document.getElementById("number-of-guests").innerHTML = `
      ${count}
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
        <td class="px-4 py-2 text-center">${start + index + 1}</td>
        <td class="px-4 py-2 flex justify-center"><img src="${guest.url}" id="${
      guest.code
    }" class="cursor-pointer h-11 w-11 rounded-lg text-center"></td>
        <td class="px-4 py-2 text-left">${
      guest.data.name
    }</td>
        <td class="px-4 py-2 text-center">${guest.data.company}</td>
        <td class="px-4 py-2 text-center"><div class="border-none rounded-lg bg-gray-100 h-7 grid place-items-center"><p>${
          guest.data.tableid ? guest.data.tableid : "extra"
        }<p></div></td>
        <td class="px-4 py-2 text-center ${
          guest.image ? "text-green-500" : "text-gray-500"
        }">
          <strong>${guest.image ? "Đã check-in" : "Chưa check-in"}</strong>
        </td>
      `;
    tbody.appendChild(row);
  });
}

export function hiddenGuestInfo(guestsData) {
  const hc = document.getElementById("hidden-container");
  const pcontent = document.getElementById("popup-content");
  guestsData.forEach((guest) => {
    const el = document.getElementById(guest.code);
    if (!el) return;
    el.addEventListener("click", function (e) {
      e.preventDefault();
      pcontent.innerHTML = `
        <img src="${
          guest.url
        }" class="border border-none rounded-full w-full aspect-square" alt="Guest"/>
        <p class="mt-8"><strong>${
        guest.data.name
      }</strong></p>
        <p><strong>Công ty: </strong> ${guest.data.company}</p>
        <p><strong>Chức vụ: </strong> ${guest.data.position}</p>
        <p><strong>Bàn số ${guest.data.tableid}</strong></p>
      `;
      hc.style.display = "block";
    });
  });
}
