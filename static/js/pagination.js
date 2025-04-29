export function renderPagination(guestsData, currentPage, rowsPerPage, onPageChange) {
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
            <a href="#" data-page="${currentPage - 1}" class="page-btn flex items-center justify-center px-3 h-8 border rounded-s-lg ${currentPage === 1 ? "pointer-events-none opacity-50" : ""}">Previous</a>
          </li>`;
  
    for (let i = 1; i <= totalPages; i++) {
      html += `
        <li>
          <a href="#" data-page="${i}" class="page-btn flex items-center justify-center px-3 h-8 ${i === currentPage ? "bg-blue-500 text-white" : ""} border">${i}</a>
        </li>`;
    }
  
    html += `
          <li>
            <a href="#" data-page="${currentPage + 1}" class="page-btn flex items-center justify-center px-3 h-8 border rounded-e-lg ${currentPage === totalPages ? "pointer-events-none opacity-50" : ""}">Next</a>
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
  