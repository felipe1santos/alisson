// Modal WhatsApp
const modal = document.getElementById("whatsappModal");
const btn = document.getElementById("openModalBtn");
const form = document.getElementById("waForm");

if (modal && btn && form) {
    const span = modal.querySelector(".close-btn");
    btn.onclick = () => { modal.style.display = "block"; };
    span.onclick = () => { modal.style.display = "none"; };
    window.addEventListener("click", (e) => { if (e.target === modal) modal.style.display = "none"; });
    form.onsubmit = (event) => {
        event.preventDefault();
        const nome = document.getElementById("nome").value;
        const telefone = document.getElementById("telefone").value;
        const descricao = document.getElementById("descricao").value;
        const mensagem = `Olá, meu nome é ${nome}. \nTelefone: ${telefone}. \n\nGostaria de falar sobre: ${descricao}`;
        window.open(`https://wa.me/5527992291973?text=${encodeURIComponent(mensagem)}`, "_blank");
        modal.style.display = "none";
        form.reset();
    };
}

// Carrossel
const track = document.querySelector(".carousel-track");
if (track) {
    let slideIndex = 0;
    const slides = document.querySelectorAll(".carousel-slide");
    const dots = document.querySelectorAll(".dot");
    const updateCarousel = () => {
        track.style.transform = `translateX(-${slideIndex * 100}%)`;
        dots.forEach(d => d.classList.remove("active"));
        if (dots[slideIndex]) dots[slideIndex].classList.add("active");
    };
    window.moveSlide = (n) => {
        slideIndex = (slideIndex + n + slides.length) % slides.length;
        updateCarousel();
    };
    window.currentSlide = (n) => { slideIndex = n; updateCarousel(); };
    setInterval(() => window.moveSlide(1), 5000);
}
