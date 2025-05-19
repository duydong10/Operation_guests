export function renderPagination(
  guestsData,
  currentPage,
  rowsPerPage,
  onPageChange
) {
  const pagination = document.getElementById("pagination-guests");
  const totalPages = Math.ceil(guestsData.length / rowsPerPage);
  const startEntry = (currentPage - 1) * rowsPerPage + 1;
  const endEntry = Math.min(currentPage * rowsPerPage, guestsData.length);

  let html = `
    <nav class="flex items-center justify-between py-2" aria-label="Table navigation">
      <span class="text-sm font-normal text-gray-500">Showing 
        <span class="font-semibold text-gray-900">${startEntry}-${endEntry}</span> of 
        <span class="font-semibold text-gray-900">${guestsData.length}</span>
      </span>
      <ul class="inline-flex -space-x-px text-sm h-8">
        <li>
          <a href="#" data-page="${1}" class="page-btn flex items-center justify-center px-3 h-8 border rounded-s-lg ${
    currentPage === 1 ? "pointer-events-none opacity-50" : ""
  }"> << </a>
        </li>
        <li>
          <a href="#" data-page="${
            currentPage - 1
          }" class="page-btn flex items-center justify-center px-3 h-8 border${
    currentPage === 1 ? "pointer-events-none opacity-50 border" : ""
  }"> < </a>
        </li>`;

  function addPage(i) {
    html += `
      <li>
        <a href="#" data-page="${i}" class="page-btn flex items-center justify-center px-3 h-8 ${
      i === currentPage ? "bg-blue-500 text-white border-y border-gray-900" : ""
    } border">${i}</a>
      </li>`;
  }

  let addedDots = false;
  for (let i = 1; i <= totalPages; i++) {
    if (Math.abs(i - currentPage) <= 1) {
      addPage(i);
      addedDots = false;
    } else if (!addedDots) {
      addedDots = true;
    }
  }

  html += `
        <li>
          <a href="#" data-page="${
            currentPage + 1
          }" style="border-color: gray; ${currentPage === totalPages ? "border: 1px solid gray;" : ""}" class="page-btn flex items-center justify-center px-3 h-8 border${
    currentPage === totalPages ? "pointer-events-none opacity-50" : ""
  }"> > </a>
        </li>
        <li>
          <a href="#" data-page="${totalPages}" class="page-btn flex items-center justify-center px-3 h-8 border rounded-e-lg ${
    currentPage === totalPages ? "pointer-events-none opacity-50" : ""
  }"> >> </a>
        </li>
      </ul>
    </nav>`;

  pagination.innerHTML = html;

  document.querySelectorAll(".page-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      const page = parseInt(btn.getAttribute("data-page"));
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        onPageChange(page);
      }
    });
  });
}