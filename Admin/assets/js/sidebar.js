document.addEventListener("click", (event)=>{

    const link = event.target.closest(".sidebar-link");

    if(!link) return;

    event.preventDefault();

    const page = link.dataset.page;

    loadPage(page);

});