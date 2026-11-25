(() => {
    const SERVICE_KEY = document.body.dataset.service || 'propagace';
    let loadedVideos = [];
    let activeCategory = 'ALL';
    let filterAllLabel = 'Vše';

    function detectCurrentLanguage() {
        const stored =
            localStorage.getItem('sik_web_lang') ||
            localStorage.getItem('selectedLang') ||
            localStorage.getItem('lang') ||
            localStorage.getItem('sik_lang') ||
            document.documentElement.lang ||
            'cz';
        return stored.toLowerCase().startsWith('en') ? 'en' : 'cz';
    }

    function extractYouTubeId(url) {
        if (!url) return null;
        const match = String(url).match(
            /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
        );
        return match ? match[1] : null;
    }

    function buildYouTubeEmbedUrl(url, autoplay = false) {
        const id = extractYouTubeId(url);
        if (!id) return url;
        const autoParam = autoplay ? '1' : '0';
        return `https://www.youtube-nocookie.com/embed/${id}?autoplay=${autoParam}&rel=0&modestbranding=1&playsinline=1`;
    }

    function getYouTubeThumbnail(url, customPoster = '') {
        if (customPoster && !customPoster.includes('drone.png')) {
            return customPoster.startsWith('http')
                ? customPoster
                : '../' + customPoster.replace(/^(\.\.\/)+/, '').replace(/^public\//, '');
        }
        const id = extractYouTubeId(url);
        if (id) {
            return `https://i.ytimg.com/vi/${id}/maxresdefault.jpg`;
        }
        return '../img/drone.png';
    }

    async function loadServiceData() {
        const lang = detectCurrentLanguage();
        const suffix = lang === 'en' ? '_en.json' : '.json';
        const url = `../data/${SERVICE_KEY}${suffix}?t=${Date.now()}`;

        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            renderPage(data);
        } catch (err) {
            console.error('Chyba při načítání dat podstránky:', err);
        }
    }

    function renderPage(data) {
        const setElText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '';
        };

        setElText('srv-eyebrow', data.badge);
        setElText('srv-title', data.title);
        setElText('srv-subtitle', data.subtitle);
        setElText('srv-cta-primary', data.ctaText);
        setElText('srv-cta-secondary', data.galleryBtnText || 'Prohlédnout výběr děl');

        // Hlavní Showreel YouTube iframe
        setElText('srv-stage-title', data.showreelTitle);
        setElText('srv-stage-spec', data.showreelSpec || '4K MASTER // YOUTUBE');
        const stageFrame = document.getElementById('srv-stage-frame');
        if (stageFrame) {
            const embedSrc = buildYouTubeEmbedUrl(data.showreelVideo, false);
            stageFrame.innerHTML = `
                <iframe
                    src="${embedSrc}"
                    title="${data.showreelTitle || 'Showreel'}"
                    loading="lazy"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowfullscreen>
                </iframe>
            `;
        }

        // Výběr děl + dynamické filtry
        setElText('srv-works-title', data.galleryTitle);
        filterAllLabel = data.filterAllText || 'Vše';
        loadedVideos = Array.isArray(data.videos) ? data.videos : [];
        activeCategory = 'ALL';

        renderFilterBar();
        renderWorksGrid();

        // Co dodáváme (Bento specifikace)
        setElText('srv-specs-title', data.deliverablesTitle);
        const specsGrid = document.getElementById('srv-specs-grid');
        if (specsGrid) {
            specsGrid.innerHTML = '';
            (data.deliverables || []).forEach(item => {
                const card = document.createElement('div');
                card.className = 'srv-spec-card';
                card.innerHTML = `
                    <span class="srv-spec-index">${item.number || ''}</span>
                    <h3>${item.title || ''}</h3>
                    <p>${item.description || ''}</p>
                `;
                specsGrid.appendChild(card);
            });
        }

        // Spodní CTA
        setElText('srv-bottom-title', data.bottomCtaTitle);
        setElText('srv-bottom-text', data.bottomCtaText);
        setElText('srv-bottom-btn', data.bottomCtaBtn);
    }

    function renderFilterBar() {
        const bar = document.getElementById('srv-filter-bar');
        if (!bar) return;
        bar.innerHTML = '';

        const categories = ['ALL', ...new Set(loadedVideos.map(v => v.category).filter(Boolean))];

        categories.forEach(cat => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'srv-filter-btn' + (activeCategory === cat ? ' active' : '');
            btn.textContent = cat === 'ALL' ? filterAllLabel : cat;
            btn.addEventListener('click', () => {
                activeCategory = cat;
                renderFilterBar();
                renderWorksGrid();
            });
            bar.appendChild(btn);
        });
    }

    function renderWorksGrid() {
        const grid = document.getElementById('srv-works-grid');
        if (!grid) return;
        grid.innerHTML = '';

        const visibleVideos = activeCategory === 'ALL'
            ? loadedVideos
            : loadedVideos.filter(v => v.category === activeCategory);

        visibleVideos.forEach(item => {
            const card = document.createElement('article');
            card.className = 'srv-work-card';

            const ytId = extractYouTubeId(item.video);
            const thumbUrl = getYouTubeThumbnail(item.video, item.poster);

            card.innerHTML = `
                <div class="srv-work-media" role="button" tabindex="0" aria-label="Přehrát ${item.title || ''}">
                    <img src="${thumbUrl}" alt="${item.title || ''}" loading="lazy">
                    <div class="srv-play-trigger">
                        <div class="srv-glass-play">
                            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                        </div>
                    </div>
                </div>
                <div class="srv-work-info">
                    <div class="srv-work-meta-row">
                        <span class="srv-work-cat">${item.category || ''}</span>
                        <span class="srv-work-spec">${item.spec || ''}</span>
                    </div>
                    <h3 class="srv-work-title">${item.title || ''}</h3>
                    <p class="srv-work-desc">${item.description || ''}</p>
                </div>
            `;

            const mediaBox = card.querySelector('.srv-work-media');
            const imgEl = mediaBox.querySelector('img');
            if (ytId && imgEl) {
                imgEl.addEventListener('error', () => {
                    if (!imgEl.dataset.fallbackApplied) {
                        imgEl.dataset.fallbackApplied = '1';
                        imgEl.src = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
                    }
                });
            }

            const activateIframe = () => {
                const embedSrc = buildYouTubeEmbedUrl(item.video, true);
                mediaBox.innerHTML = `
                    <iframe
                        src="${embedSrc}"
                        title="${item.title || 'YouTube video'}"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        allowfullscreen>
                    </iframe>
                `;
                mediaBox.style.cursor = 'default';
            };

            mediaBox.addEventListener('click', activateIframe, { once: true });
            mediaBox.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    activateIframe();
                }
            }, { once: true });

            grid.appendChild(card);
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        loadServiceData();

        // Reaguje na přepnutí jazyka ve vašem globálním script.js
        document.addEventListener('click', (e) => {
            if (e.target.closest('[data-lang], .lang-btn, #lang-cz, #lang-en, #lang-cz-btn, #lang-en-btn')) {
                setTimeout(loadServiceData, 60);
            }
        });

        const langObserver = new MutationObserver(() => loadServiceData());
        langObserver.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['lang']
        });
    });
})();
