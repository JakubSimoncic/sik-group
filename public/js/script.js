// ==========================================================================
// 0. AUTOMATICKÁ DETEKCE JAZYKA (CZ / SK -> CZ, OSTATNÍ ZEMĚ -> EN)
// ==========================================================================
(function initAutoLanguage() {
    let savedLang = localStorage.getItem('sik_web_lang');

    if (!savedLang) {
        const browserLangs = navigator.languages && navigator.languages.length
            ? navigator.languages
            : [navigator.language || navigator.userLanguage || ''];

        const primaryLang = (browserLangs[0] || '').toLowerCase();
        savedLang = (primaryLang.startsWith('cs') || primaryLang.startsWith('sk')) ? 'cz' : 'en';
        localStorage.setItem('sik_web_lang', savedLang);
    }

    // Nastavení jazyka dokumentu a zákaz automatického strojového překladu prohlížečem
    document.documentElement.lang = savedLang === 'en' ? 'en' : 'cs';
    document.documentElement.setAttribute('translate', 'no');
})();

document.addEventListener('DOMContentLoaded', () => {
    // ==========================================================================
    // 1. NAVIGACE & OVLÁDÁNÍ MOBILNÍHO MENU
    // ==========================================================================
    const menuToggle = document.getElementById('mobile-menu');
    const navPanel = document.getElementById('nav-panel');
    const dimOverlay = document.getElementById('nav-overlay');
    const mainNav = document.getElementById('main-nav');
    const navWrapper = document.getElementById('nav-wrapper');
    
    let lastScrollTop = 0;
    let scrollAtMenuOpen = 0;
    const threshold = 40; 
    const scrollCloseLimit = 80; 

    function closeMenu() {
        if (menuToggle) menuToggle.classList.remove('active');
        if (navPanel) navPanel.classList.remove('active');
        if (dimOverlay) dimOverlay.classList.remove('active');
    }

    if (menuToggle && navPanel && dimOverlay) {
        function toggleMenu() {
            const isOpening = !navPanel.classList.contains('active');
            if (isOpening) {
                scrollAtMenuOpen = window.scrollY || document.documentElement.scrollTop;
            }
            menuToggle.classList.toggle('active');
            navPanel.classList.toggle('active');
            dimOverlay.classList.toggle('active');
        }

        menuToggle.addEventListener('click', toggleMenu);
        dimOverlay.addEventListener('click', toggleMenu);

        document.querySelectorAll('.nav-list a, .side-socials a').forEach(link => {
            link.addEventListener('click', closeMenu);
        });
    }

    // ==========================================================================
    // 2. SCROLL CHOVÁNÍ (OPTIMALIZOVÁNO PRO GPU 60 FPS)
    // ==========================================================================
    let isScrolling = false;
    let navHeight = mainNav ? mainNav.offsetHeight : 0;
    let isScrolledClass = false;
    let isNavHidden = false;

    window.addEventListener('resize', () => {
        if (mainNav) navHeight = mainNav.offsetHeight;
    }, { passive: true });

    window.addEventListener('scroll', () => {
        if (!isScrolling) {
            window.requestAnimationFrame(() => {
                handleScroll();
                isScrolling = false;
            });
            isScrolling = true;
        }
    }, { passive: true });

    function handleScroll() {
        const scrollTop = window.scrollY || document.documentElement.scrollTop;
        
        if (navPanel && navPanel.classList.contains('active')) {
            if (Math.abs(scrollTop - scrollAtMenuOpen) > scrollCloseLimit) {
                menuToggle.classList.remove('active');
                navPanel.classList.remove('active');
                dimOverlay.classList.remove('active');
                if (navWrapper) {
                    navWrapper.style.transform = `translateY(-${navHeight}px)`;
                    isNavHidden = true;
                }
                lastScrollTop = scrollTop;
            }
            return;
        }

        if (!navWrapper || !mainNav) return;

        const shouldBeScrolled = scrollTop > 80;
        if (shouldBeScrolled !== isScrolledClass) {
            navWrapper.classList.toggle('scrolled', shouldBeScrolled);
            isScrolledClass = shouldBeScrolled;
        }

        if (scrollTop <= 0) {
            if (isNavHidden) {
                navWrapper.style.transform = "translateY(0)";
                isNavHidden = false;
            }
            lastScrollTop = scrollTop;
            return;
        }

        const scrollDistance = Math.abs(scrollTop - lastScrollTop);

        if (scrollDistance > threshold) {
            if (scrollTop > lastScrollTop && !isNavHidden) {
                navWrapper.style.transform = `translateY(-${navHeight}px)`; 
                isNavHidden = true;
            } else if (scrollTop < lastScrollTop && isNavHidden) {
                navWrapper.style.transform = "translateY(0)";
                isNavHidden = false;
            }
            lastScrollTop = scrollTop;
        }
    }

    // ==========================================================================
    // 3. DYNAMICKÉ NAČÍTÁNÍ COMMON.JSON (HLAVIČKA, PŘEPÍNAČ JAZYKŮ, PATIČKA)
    // ==========================================================================
    async function initGlobalElements() {
        const activeLang = localStorage.getItem('sik_web_lang') || 'cz';

        let langSwitcherContainer = document.getElementById('dynamic-lang-switcher');
        if (!langSwitcherContainer && menuToggle && menuToggle.parentNode) {
            langSwitcherContainer = document.createElement('div');
            langSwitcherContainer.id = 'dynamic-lang-switcher';
            langSwitcherContainer.className = 'lang-switcher';
            menuToggle.parentNode.insertBefore(langSwitcherContainer, menuToggle);
        }

        const pathname = window.location.pathname;
        const isInPagesFolder = pathname.includes('/pages/');
        const pathPrefix = isInPagesFolder ? '../../' : '';
        const fileName = activeLang === 'en' ? 'common_en.json' : 'common.json';
        const jsonPath = isInPagesFolder ? `../data/${fileName}` : `public/data/${fileName}`;

        try {
            const response = await fetch(jsonPath + '?t=' + Date.now());
            if (!response.ok) throw new Error(`Chyba při načítání ${fileName}`);
            
            const cData = await response.json();
            
            // Přepínač jazyků
            if (cData.header && langSwitcherContainer) {
                const czText = cData.header.langCzText || 'CZ';
                const enText = cData.header.langEnText || 'EN';

                langSwitcherContainer.innerHTML = `
                    <button type="button" id="lang-cz-btn" class="lang-switch-btn ${activeLang === 'cz' ? 'active' : ''}" onclick="switchWebsiteLang('cz')">${czText}</button>
                    <button type="button" id="lang-en-btn" class="lang-switch-btn ${activeLang === 'en' ? 'active' : ''}" onclick="switchWebsiteLang('en')">${enText}</button>
                `;
            }

            // Logo
            const logoLink = document.getElementById('header-logo-link');
            if (logoLink) logoLink.href = pathPrefix + 'index.html';

            // Štítky / Popisky v hlavičce
            if (cData.header) {
                if (document.getElementById('label-header-email') && cData.header.labelEmail) {
                    document.getElementById('label-header-email').textContent = cData.header.labelEmail;
                }
                if (document.getElementById('label-header-phone') && cData.header.labelPhone) {
                    document.getElementById('label-header-phone').textContent = cData.header.labelPhone;
                }
                if (document.getElementById('label-header-socials') && cData.header.labelSocials) {
                    document.getElementById('label-header-socials').textContent = cData.header.labelSocials;
                }

                // Email & Telefon
                const emailEl = document.getElementById('header-email');
                if (emailEl && cData.header.email) {
                    emailEl.textContent = cData.header.email;
                    emailEl.href = 'mailto:' + cData.header.email;
                }

                const phoneEl = document.getElementById('header-phone');
                if (phoneEl && cData.header.phone) {
                    phoneEl.textContent = cData.header.phone;
                    phoneEl.href = 'tel:' + cData.header.phone.replace(/\s+/g, '');
                }

                // Sociální sítě
                const socialsContainer = document.getElementById('header-socials');
                if (socialsContainer && cData.header.instagram) {
                    socialsContainer.innerHTML = `
                        <a href="${cData.header.instagram}" target="_blank">Instagram</a>
                        <a href="${cData.header.facebook}" target="_blank">Facebook</a>
                        <a href="${cData.header.youtube}" target="_blank">YouTube</a>
                    `;
                }

                // Navigační lišta
                const navList = document.getElementById('dynamic-nav-list');
                if (navList && cData.header.navLinks) {
                    navList.innerHTML = cData.header.navLinks.map((link, idx) => {
                        let finalUrl = link.url;
                        if (!finalUrl.startsWith('http') && !finalUrl.startsWith('#')) {
                            finalUrl = pathPrefix + finalUrl.replace(/^(\.\.\/)+/, '');
                        }
                        const cleanTarget = link.url.replace(/^(\.\.\/)+/, '');
                        const isActive = (idx === 0 && (pathname.endsWith('index.html') || pathname.endsWith('/'))) || pathname.endsWith(cleanTarget)
                            ? 'class="active"'
                            : '';
                        return `<li ${isActive}><a href="${finalUrl}">${link.text}</a></li>`;
                    }).join('');
                }
            }

            // Patička
            const footerGrid = document.getElementById('dynamic-footer-grid');
            if (footerGrid && cData.footer && cData.footer.columns) {
                let brandHtml = `
                    <div class="footer-brand">
                        <h3>${cData.footer.brandTitle}</h3>
                        <p>${cData.footer.tagline}</p>
                    </div>
                `;

                let colsHtml = cData.footer.columns.map(col => {
                    let linksList = col.links.map(l => {
                        let fUrl = l.url;
                        if (!fUrl.startsWith('http') && !fUrl.startsWith('#')) {
                            fUrl = pathPrefix + fUrl.replace(/^(\.\.\/)+/, '');
                        }
                        return `<li><a href="${fUrl}">${l.text}</a></li>`;
                    }).join('');

                    return `
                        <div class="footer-column">
                            <h4>${col.title}</h4>
                            <ul>${linksList}</ul>
                        </div>
                    `;
                }).join('');

                footerGrid.innerHTML = brandHtml + colsHtml;
            }

            const copyrightEl = document.getElementById('footer-copyright');
            if (copyrightEl && cData.footer && cData.footer.copyright) {
                copyrightEl.textContent = cData.footer.copyright;
            }

            document.querySelectorAll('.nav-list a, .side-socials a').forEach(link => {
                link.addEventListener('click', closeMenu);
            });
        } catch (err) {
            console.error('Nelze načíst globální prvky:', err);
        }
    }

    initGlobalElements();
});

// Globální funkce pro přepnutí jazyka
function switchWebsiteLang(lang) {
    localStorage.setItem('sik_web_lang', lang);
    
    const czBtn = document.getElementById('lang-cz-btn');
    const enBtn = document.getElementById('lang-en-btn');

    if (czBtn && enBtn) {
        czBtn.classList.toggle('active', lang === 'cz');
        enBtn.classList.toggle('active', lang === 'en');
    }

    console.log("Přepnuto na jazyk:", lang.toUpperCase());

    location.reload();
}
