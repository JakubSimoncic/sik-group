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

    if (menuToggle && navPanel && dimOverlay) {
        function closeMenu() {
            menuToggle.classList.remove('active');
            navPanel.classList.remove('active');
            dimOverlay.classList.remove('active');
        }

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
    // 3. DYNAMICKÉ NAČÍTÁNÍ COMMON.JSON A PŘEPÍNAČE JAZYKŮ
    // ==========================================================================
    async function initGlobalElements() {
        // Zjistíme aktivní jazyk z localStorage (výchozí je 'cz')
        const activeLang = localStorage.getItem('sik_web_lang') || 'cz';

        // Vyhledáme kontejner, nebo ho automaticky vytvoříme, pokud v HTML chybí
        let langSwitcherContainer = document.getElementById('dynamic-lang-switcher');
        if (!langSwitcherContainer && menuToggle && menuToggle.parentNode) {
            langSwitcherContainer = document.createElement('div');
            langSwitcherContainer.id = 'dynamic-lang-switcher';
            langSwitcherContainer.className = 'lang-switcher';
            // Vložíme ho automaticky před hamburger menu
            menuToggle.parentNode.insertBefore(langSwitcherContainer, menuToggle);
        }

        // Určení cesty k JSON souboru podle jazyka a umístění stránky (kořen vs podadresář)
        const isInSubfolder = window.location.pathname.includes('/public/pages/');
        const fileName = activeLang === 'en' ? 'common_en.json' : 'common.json';
        const jsonPath = isInSubfolder ? `../data/${fileName}` : `public/data/${fileName}`;

        try {
            const response = await fetch(jsonPath + '?t=' + Date.now());
            if (!response.ok) throw new Error(`Chyba při načítání ${fileName}`);
            
            const data = await response.json();
            
            if (data.header && langSwitcherContainer) {
                const czText = data.header.langCzText || 'CZ';
                const enText = data.header.langEnText || 'EN';

                // Vykreslení tlačítek přepínače
                langSwitcherContainer.innerHTML = `
                    <button type="button" id="lang-cz-btn" class="lang-switch-btn ${activeLang === 'cz' ? 'active' : ''}" onclick="switchWebsiteLang('cz')">${czText}</button>
                    <button type="button" id="lang-en-btn" class="lang-switch-btn ${activeLang === 'en' ? 'active' : ''}" onclick="switchWebsiteLang('en')">${enText}</button>
                `;
            }
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
}
