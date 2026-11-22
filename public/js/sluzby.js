const SERVICE_KEY = document.body.dataset.service || 'propagace';
let currentServiceLang = localStorage.getItem('sik_lang') || 'cz';

function resolveMediaPath(rawPath) {
    if (!rawPath) return '';
    if (
        rawPath.startsWith('http://') ||
        rawPath.startsWith('https://') ||
        rawPath.startsWith('data:') ||
        rawPath.startsWith('blob:')
    ) {
        return rawPath;
    }
    const clean = rawPath
        .replace(/^(\.\.\/)+/, '')
        .replace(/^\.\//, '')
        .replace(/^public\//, '');
    return '../' + clean;
}

function getExternalEmbedUrl(url) {
    if (!url) return null;
    // YouTube (watch, youtu.be, shorts, embed)
    const ytMatch = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    if (ytMatch) {
        return `https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
    }
    // Vimeo
    const vimeoMatch = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
    return null;
}

function getYouTubeThumb(url) {
    if (!url) return null;
    const ytMatch = url.match(
        /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
    );
    return ytMatch ? `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg` : null;
}

function setServiceLanguage(lang) {
    currentServiceLang = lang === 'en' ? 'en' : 'cz';
    localStorage.setItem('sik_lang', currentServiceLang);

    document.querySelectorAll('.lang-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentServiceLang);
    });

    updateNavLabels();
    loadServiceContent();
}

function updateNavLabels() {
    const navMap = currentServiceLang === 'en'
        ? {
            home: 'Home',
            propagace: 'Commercial & Brand',
            firemni: 'Large Events',
            osobni: 'Personal Events',
            eshop: 'E-shop',
            kontakt: 'Contact'
        }
        : {
            home: 'Úvod',
            propagace: 'Propagační videa',
            firemni: 'Velké eventy',
            osobni: 'Osobní akce',
            eshop: 'E-shop',
            kontakt: 'Kontakt'
        };

    document.querySelectorAll('[data-nav-key]').forEach(el => {
        const key = el.dataset.navKey;
        if (navMap[key]) el.textContent = navMap[key];
    });
}

async function loadServiceContent() {
    const suffix = currentServiceLang === 'en' ? '_en.json' : '.json';
    const jsonUrl = `../data/${SERVICE_KEY}${suffix}?t=${Date.now()}`;

    try {
        const res = await fetch(jsonUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        renderServicePage(data);
    } catch (err) {
        console.error('Chyba při načítání dat služby:', err);
    }
}

function renderServicePage(data) {
    document.getElementById('srv-badge').textContent = data.badge || '';
    document.getElementById('srv-title').textContent = data.title || '';
    document.getElementById('srv-subtitle').textContent = data.subtitle || '';
    document.getElementById('srv-cta-btn').textContent = data.ctaText || 'Nezávazně poptat';

    // Showreel (hlavní video)
    document.getElementById('srv-showreel-title').textContent = data.showreelTitle || 'Showreel';
    const showreelContainer = document.getElementById('srv-showreel-container');
    const showreelEmbed = getExternalEmbedUrl(data.showreelVideo);

    if (showreelEmbed) {
        const cleanEmbed = showreelEmbed.replace('autoplay=1', 'autoplay=0');
        showreelContainer.innerHTML = `<iframe src="${cleanEmbed}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    } else {
        const videoSrc = resolveMediaPath(data.showreelVideo || 'public/video/drone-hero.mp4');
        const posterSrc = resolveMediaPath(data.showreelPoster || 'public/img/hero-poster.jpg');
        showreelContainer.innerHTML = `
            <video controls muted loop playsinline poster="${posterSrc}">
                <source src="${videoSrc}" type="video/mp4">
            </video>
        `;
    }

    // Galerie videí
    document.getElementById('srv-gallery-title').textContent = data.galleryTitle || 'Ukázky';
    const grid = document.getElementById('srv-video-grid');
    grid.innerHTML = '';

    (data.videos || []).forEach(item => {
        const card = document.createElement('article');
        card.className = 'video-card';

        const ytThumb = getYouTubeThumb(item.video);
        const posterUrl = ytThumb || resolveMediaPath(item.poster || 'public/img/drone.png');

        card.innerHTML = `
            <div class="video-thumb-wrap">
                <img src="${posterUrl}" alt="${item.title || ''}" loading="lazy">
                <div class="play-overlay">
                    <div class="play-circle">▶</div>
                </div>
            </div>
            <div class="video-card-body">
                <span class="video-card-tag">${item.tag || ''}</span>
                <h3>${item.title || ''}</h3>
                <p>${item.description || ''}</p>
            </div>
        `;

        card.addEventListener('click', () => openVideoModal(item.video));
        grid.appendChild(card);
    });

    // Co dodáváme (Deliverables)
    document.getElementById('srv-deliverables-title').textContent = data.deliverablesTitle || '';
    const delivGrid = document.getElementById('srv-deliverables-grid');
    delivGrid.innerHTML = '';

    (data.deliverables || []).forEach(del => {
        const box = document.createElement('div');
        box.className = 'deliverable-card';
        box.innerHTML = `
            <span class="deliverable-num">${del.number || ''}</span>
            <h3>${del.title || ''}</h3>
            <p>${del.description || ''}</p>
        `;
        delivGrid.appendChild(box);
    });

    // Spodní CTA
    document.getElementById('srv-bottom-title').textContent = data.bottomCtaTitle || '';
    document.getElementById('srv-bottom-text').textContent = data.bottomCtaText || '';
    document.getElementById('srv-bottom-btn').textContent = data.bottomCtaBtn || 'Rezervovat termín';
}

function openVideoModal(rawVideoUrl) {
    const modal = document.getElementById('video-modal');
    const playerWrap = document.getElementById('video-modal-player');
    const embedUrl = getExternalEmbedUrl(rawVideoUrl);

    if (embedUrl) {
        playerWrap.innerHTML = `<iframe src="${embedUrl}" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    } else {
        const src = resolveMediaPath(rawVideoUrl || 'public/video/drone-hero.mp4');
        playerWrap.innerHTML = `
            <video controls autoplay playsinline>
                <source src="${src}" type="video/mp4">
            </video>
        `;
    }

    modal.classList.add('open');
}

function closeVideoModal() {
    const modal = document.getElementById('video-modal');
    const playerWrap = document.getElementById('video-modal-player');
    modal.classList.remove('open');
    playerWrap.innerHTML = '';
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('video-modal-close').addEventListener('click', closeVideoModal);
    document.getElementById('video-modal').addEventListener('click', (e) => {
        if (e.target.id === 'video-modal') closeVideoModal();
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeVideoModal();
    });

    setServiceLanguage(currentServiceLang);
});
