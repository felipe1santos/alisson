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

// Cidade do visitante via IP (badge "Atendemos em ...")
// Dentro da Grande Vitória o atendimento é presencial; fora dela é online.
// Sem esse aviso, quem acessa de outro estado acha que não é atendido e sai do site.
const cidadeEl = document.getElementById("cidade-usuario");
const prefixoEl = document.getElementById("badge-prefixo");
if (cidadeEl && prefixoEl) {
    const GRANDE_VITORIA = ["vitoria", "vila velha", "serra", "cariacica", "viana", "guarapari", "fundao"];

    // Remove acentos e caixa para comparar "Vitória" com "vitoria"
    const normalizar = (s) => String(s || "")
        .normalize("NFD").replace(new RegExp("[\u0300-\u036f]", "g"), "").toLowerCase().trim();

    const aplicarCidade = (cidade, uf, pais) => {
        if (!cidade || typeof cidade !== "string" || cidade.length > 40) return;
        if (pais && normalizar(pais) !== "br") return; // fora do Brasil mantém o texto padrão

        // Só é presencial se for cidade da Grande Vitória E estiver no ES:
        // existem Viana/MA, Serra/outros estados etc.
        const ufNorm = normalizar(uf);
        const noES = ufNorm === "es" || ufNorm === "espirito santo";
        const presencial = noES && GRANDE_VITORIA.indexOf(normalizar(cidade)) !== -1;

        prefixoEl.textContent = presencial ? "Atendemos em" : "Atendemos online em";
        cidadeEl.textContent = cidade;
    };

    fetch("https://ipapi.co/json/")
        .then((r) => r.json())
        .then((d) => {
            if (d && d.city) { aplicarCidade(d.city, d.region_code || d.region, d.country_code); return; }
            throw new Error("sem cidade");
        })
        .catch(() => {
            fetch("https://ipwho.is/")
                .then((r) => r.json())
                .then((d) => { if (d && d.city) aplicarCidade(d.city, d.region, d.country_code); })
                .catch(() => { /* mantém texto padrão */ });
        });
}
