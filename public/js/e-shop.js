document.addEventListener('DOMContentLoaded', () => {

    let productsData = [];
    let baseSubtitleText = "";
    let filterBtnHide = "Skrýt filtry";
    let filterBtnShow = "Zobrazit filtry";
    let currencyTextGlobal = "Kč";

    const productGrid = document.getElementById('product-grid');
    const categoryCheckboxes = document.querySelectorAll('.category-filter');
    const stockCheckboxes = document.querySelectorAll('.stock-filter');

    const minRange = document.getElementById('price-min-range');
    const maxRange = document.getElementById('price-max-range');
    const minValSpan = document.getElementById('price-min-value');
    const maxValSpan = document.getElementById('price-max-value');
    const sliderTrack = document.getElementById('slider-track');
    const priceMinLabel = document.getElementById('price-min-label');
    const priceMaxLabel = document.getElementById('price-max-label');

    const productCountSpan = document.getElementById('product-count') || document.querySelector('.tech-subtitle');

    let minPrice = 0;
    let maxPrice = 0;
    const priceGap = 500;

    // ==========================================================================
    // 0. NAČTENÍ COMMON.JSON (Hlavička & Patička)
    // ==========================================================================
    async function loadCommonData() {
        try {
            const resCommon = await fetch('../data/common.json?t=' + Date.now());
            if (!resCommon.ok) return;
            const cData = await resCommon.json();

            // Logo
            const logoLink = document.getElementById('header-logo-link');
            if (logoLink) logoLink.href = '../../index.html';

            // Štítky
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
                navList.innerHTML = cData.header.navLinks.map((link) => {
                    let finalUrl = link.url;
                    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('#')) {
                        finalUrl = '../../' + finalUrl.replace(/^(\.\.\/)+/, '');
                    }
                    const isActive = link.url.includes('e-shop.html') ? 'class="active"' : '';
                    return `<li ${isActive}><a href="${finalUrl}">${link.text}</a></li>`;
                }).join('');
            }

            // Patička
            const footerGrid = document.getElementById('dynamic-footer-grid');
            if (footerGrid && cData.footer.columns) {
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
                            fUrl = '../../' + fUrl.replace(/^(\.\.\/)+/, '');
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
            if (copyrightEl && cData.footer.copyright) {
                copyrightEl.textContent = cData.footer.copyright;
            }

        } catch (err) {
            console.error('Chyba při načítání common.json:', err);
        }
    }

    loadCommonData();

    // ==========================================================================
    // 1. DYNAMICKÉ NAČTENÍ Z E-SHOP.JSON (S OŠETŘENÍM CACHE)
    // ==========================================================================
    async function fetchAllShopData() {
        try {
            const res = await fetch('../data/e-shop.json?t=' + Date.now());
            if (res.ok) {
                const shopData = await res.json();

                if (shopData.mainTitle && document.getElementById('eshop-main-title')) {
                    document.getElementById('eshop-main-title').textContent = shopData.mainTitle;
                }
                if (shopData.mainSubtitle) {
                    baseSubtitleText = shopData.mainSubtitle;
                }
                if (shopData.filterBtnHideText) filterBtnHide = shopData.filterBtnHideText;
                if (shopData.filterBtnShowText) filterBtnShow = shopData.filterBtnShowText;
                if (shopData.currencyText) currencyTextGlobal = shopData.currencyText;

                const filterBtnTextEl = document.getElementById('eshop-filter-btn-text');
                if (filterBtnTextEl) filterBtnTextEl.textContent = filterBtnHide;

                if (shopData.sortRecommended) {
                    if (document.getElementById('eshop-sort-current')) document.getElementById('eshop-sort-current').textContent = shopData.sortRecommended;
                    if (document.getElementById('eshop-sort-recommended')) document.getElementById('eshop-sort-recommended').textContent = shopData.sortRecommended;
                }
                if (shopData.sortPriceAsc && document.getElementById('eshop-sort-price-asc')) {
                    document.getElementById('eshop-sort-price-asc').textContent = shopData.sortPriceAsc;
                }
                if (shopData.sortPriceDesc && document.getElementById('eshop-sort-price-desc')) {
                    document.getElementById('eshop-sort-price-desc').textContent = shopData.sortPriceDesc;
                }

                if (shopData.resetAllFiltersText && document.getElementById('reset-all-filters-btn')) {
                    document.getElementById('reset-all-filters-btn').textContent = shopData.resetAllFiltersText;
                }
                if (shopData.captionCategories && document.getElementById('caption-categories')) {
                    document.getElementById('caption-categories').textContent = shopData.captionCategories;
                }
                if (shopData.catCinematicText && document.getElementById('label-cat-cinematic')) {
                    document.getElementById('label-cat-cinematic').textContent = shopData.catCinematicText;
                }
                if (shopData.catLongrangeText && document.getElementById('label-cat-longrange')) {
                    document.getElementById('label-cat-longrange').textContent = shopData.catLongrangeText;
                }
                if (shopData.catFreestyleText && document.getElementById('label-cat-freestyle')) {
                    document.getElementById('label-cat-freestyle').textContent = shopData.catFreestyleText;
                }
                if (shopData.captionPriceRange && document.getElementById('caption-price-range')) {
                    document.getElementById('caption-price-range').textContent = shopData.captionPriceRange;
                }
                if (shopData.pricePrefixFrom && document.getElementById('price-prefix-from')) {
                    document.getElementById('price-prefix-from').textContent = shopData.pricePrefixFrom;
                }
                if (shopData.pricePrefixTo && document.getElementById('price-prefix-to')) {
                    document.getElementById('price-prefix-to').textContent = shopData.pricePrefixTo;
                }
                if (shopData.currencyText && document.getElementById('price-currency')) {
                    document.getElementById('price-currency').textContent = shopData.currencyText;
                }
                if (shopData.resetPriceText && document.getElementById('reset-price-btn')) {
                    document.getElementById('reset-price-btn').textContent = shopData.resetPriceText;
                }
                if (shopData.captionStock && document.getElementById('caption-stock')) {
                    document.getElementById('caption-stock').textContent = shopData.captionStock;
                }
                if (shopData.stockInStockText && document.getElementById('label-stock-instock')) {
                    document.getElementById('label-stock-instock').textContent = shopData.stockInStockText;
                }
                if (shopData.modalSpecsHeading && document.getElementById('modal-specs-heading')) {
                    document.getElementById('modal-specs-heading').textContent = shopData.modalSpecsHeading;
                }
                if (shopData.modalButtonText && document.getElementById('modal-btn-text')) {
                    document.getElementById('modal-btn-text').textContent = shopData.modalButtonText;
                }

                productsData = shopData.products || [];
                initShop();
            }
        } catch (err) {
            console.error('Chyba při načítání e-shop JSON dat:', err);
        }
    }

    // ==========================================================================
    // 2. GENERÁTOR KARET PRODUKTŮ DO GRIDU (VČETNĚ EUR CENY)
    // ==========================================================================
    function renderProducts(items) {
        if (!productGrid) return;
        productGrid.innerHTML = '';

        if (!items || items.length === 0) {
            productGrid.innerHTML = '<p style="color: #666; padding: 40px 0;">Žádné drony neodpovídají zvoleným filtrům.</p>';
            return;
        }

        items.forEach(product => {
            const card = document.createElement('div');
            card.className = 'tech-card';
            card.setAttribute('data-price', product.price);
            card.setAttribute('data-category', product.category);
            card.setAttribute('data-stock', product.stock || 'skladem');
            card.setAttribute('data-id', product.id);

            const formattedPrice = product.price.toLocaleString('cs-CZ');
            const eurPrice = product.eurPrice || Math.round(product.price / 25);
            const imagePath = product.image || '../img/drone.png';
            const tagText = product.tag || 'FPV Spec';

            card.innerHTML = `
                <div class="tech-img-wrapper">
                    <img src="${imagePath}" alt="${product.title}" loading="lazy">
                    <div class="tech-card-overlay"><span>Zobrazit specifikaci</span></div>
                </div>
                <div class="tech-card-meta">
                    <div class="tech-card-row">
                        <span class="tech-spec-tag">${tagText}</span>
                        <span class="tech-card-price">${formattedPrice} ${currencyTextGlobal} <span class="card-price-eur">/ ${eurPrice} EUR</span></span>
                    </div>
                    <h3 class="tech-card-title">${product.title}</h3>
                </div>
            `;

            card.addEventListener('click', () => openModal(product));
            productGrid.appendChild(card);
        });
    }

    // ==========================================================================
    // 3. INICIALIZACE CENOVÉHO FILTRU
    // ==========================================================================
    function initShop() {
        renderProducts(productsData);

        if (productsData.length > 0) {
            const prices = productsData.map(p => p.price);
            minPrice = Math.min(...prices);
            maxPrice = Math.max(...prices);
        }

        if (minRange && maxRange) {
            minRange.min = minPrice; minRange.max = maxPrice; minRange.value = minPrice;
            maxRange.min = minPrice; maxRange.max = maxPrice; maxRange.value = maxPrice;

            if (priceMinLabel) priceMinLabel.textContent = `${minPrice.toLocaleString('cs-CZ')} ${currencyTextGlobal}`;
            if (priceMaxLabel) priceMaxLabel.textContent = `${maxPrice.toLocaleString('cs-CZ')} ${currencyTextGlobal}`;
        }

        updateShop();
    }

    function updateSliderTrack() {
        if (!minRange || !maxRange || !sliderTrack) return;
        const currentMin = parseFloat(minRange.value);
        const currentMax = parseFloat(maxRange.value);
        const range = maxPrice - minPrice;

        if (range <= 0) return;

        const percentMin = ((currentMin - minPrice) / range) * 100;
        const percentMax = ((currentMax - minPrice) / range) * 100;

        sliderTrack.style.background = `linear-gradient(to right, #222222 ${percentMin}%, #00D1C7 ${percentMin}%, #00D1C7 ${percentMax}%, #222222 ${percentMax}%)`;
    }

    // ==========================================================================
    // 4. LOGIKA FILTROVÁNÍ PRODUKTŮ
    // ==========================================================================
    function updateShop() {
        if (!productGrid) return;
        const cards = productGrid.querySelectorAll('.tech-card');

        const activeCategories = Array.from(categoryCheckboxes).filter(cb => cb.checked).map(cb => cb.value);
        const activeStock = Array.from(stockCheckboxes).filter(cb => cb.checked).map(cb => cb.value);

        const currentMinPrice = minRange ? parseFloat(minRange.value) : -Infinity;
        const currentMaxPrice = maxRange ? parseFloat(maxRange.value) : Infinity;

        if (minValSpan) minValSpan.textContent = currentMinPrice.toLocaleString('cs-CZ');
        if (maxValSpan) maxValSpan.textContent = currentMaxPrice.toLocaleString('cs-CZ');

        updateSliderTrack();

        let visibleCount = 0;

        cards.forEach(card => {
            const productCategory = card.getAttribute('data-category');
            const productStock = card.getAttribute('data-stock');
            const productPrice = parseFloat(card.getAttribute('data-price')) || 0;

            const matchCategory = activeCategories.length === 0 || activeCategories.includes(productCategory);
            const matchStock = activeStock.length === 0 || activeStock.includes(productStock);
            const matchPrice = productPrice >= currentMinPrice && productPrice <= currentMaxPrice;

            if (matchCategory && matchStock && matchPrice) {
                card.style.display = 'flex';
                visibleCount++;
            } else {
                card.style.display = 'none';
            }
        });

        let countText = '';
        if (visibleCount === 1) countText = `(1 produkt)`;
        else if (visibleCount > 1 && visibleCount < 5) countText = `(${visibleCount} produkty)`;
        else countText = `(${visibleCount} produktů)`;

        if (productCountSpan) {
            productCountSpan.textContent = `${baseSubtitleText} ${countText}`;
        }
    }

    if (minRange && maxRange) {
        minRange.addEventListener('input', () => {
            if (parseFloat(maxRange.value) - parseFloat(minRange.value) < priceGap) {
                minRange.value = parseFloat(maxRange.value) - priceGap;
            }
            updateShop();
        });

        maxRange.addEventListener('input', () => {
            if (parseFloat(maxRange.value) - parseFloat(minRange.value) < priceGap) {
                maxRange.value = parseFloat(minRange.value) + priceGap;
            }
            updateShop();
        });
    }

    // ==========================================================================
    // 5. SKRÝVÁNÍ FILTRŮ A RESET TLAČÍTKA
    // ==========================================================================
    const toggleFilterBtn = document.getElementById('toggle-filter-btn');
    const shopLayoutContainer = document.getElementById('shop-layout-container');
    const btnText = toggleFilterBtn ? toggleFilterBtn.querySelector('.btn-text') : null;

    if (toggleFilterBtn && shopLayoutContainer) {
        toggleFilterBtn.addEventListener('click', () => {
            shopLayoutContainer.classList.toggle('filters-hidden');
            if (btnText) {
                btnText.textContent = shopLayoutContainer.classList.contains('filters-hidden') ? filterBtnShow : filterBtnHide;
            }
        });
    }

    document.getElementById('reset-price-btn')?.addEventListener('click', () => {
        if (minRange && maxRange) {
            minRange.value = minPrice;
            maxRange.value = maxPrice;
            updateShop();
        }
    });

    document.getElementById('reset-all-filters-btn')?.addEventListener('click', () => {
        categoryCheckboxes.forEach(cb => cb.checked = false);
        stockCheckboxes.forEach(cb => cb.checked = false);
        if (minRange && maxRange) {
            minRange.value = minPrice;
            maxRange.value = maxPrice;
        }
        updateShop();
    });

    // ==========================================================================
    // 6. HIGH-TECH MODÁLNÍ OKNO
    // ==========================================================================
    const modal = document.getElementById('product-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    function getScrollbarWidth() {
        return window.innerWidth - document.documentElement.clientWidth;
    }

    function openModal(product) {
        if (!modal) return;

        const eurPrice = product.eurPrice || Math.round(product.price / 25);

        document.getElementById('modal-img').src = product.image || '../img/drone.png';
        document.getElementById('modal-title').textContent = product.title;
        
        const catLabel = (product.categoryLabel || product.category || '').toUpperCase();
        document.getElementById('modal-category').textContent = `${catLabel} //`;
        
        const catBadge = document.getElementById('modal-category-badge');
        if (catBadge) catBadge.textContent = product.categoryLabel || product.category;

        const formattedPrice = product.price.toLocaleString('cs-CZ');
        document.getElementById('modal-price').innerHTML = `${formattedPrice} ${currencyTextGlobal} <span class="price-eur">/ ${eurPrice} EUR</span>`;
        document.getElementById('modal-description').textContent = product.description || 'Detailní popis připravujeme.';

        const specsList = document.getElementById('modal-specs');
        specsList.innerHTML = '';
        if (product.specs) {
            Object.entries(product.specs).forEach(([k, v]) => {
                const li = document.createElement('li');
                li.innerHTML = `
                    <span class="spec-name">${k}</span>
                    <span class="spec-dots"></span>
                    <span class="spec-val">${v}</span>
                `;
                specsList.appendChild(li);
            });
        }

        const scrollbarWidth = getScrollbarWidth();
        document.body.style.paddingRight = `${scrollbarWidth}px`;
        document.body.style.overflow = 'hidden';

        modal.classList.add('active');
    }

    function closeModal() {
        if (!modal) return;
        modal.classList.remove('active');
        
        setTimeout(() => {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        }, 200);
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal && modal.classList.contains('active')) closeModal();
    });

    // ==========================================================================
    // 7. CUSTOM DROPDOWN A ŘAZENÍ
    // ==========================================================================
    const customDropdown = document.getElementById('tech-custom-dropdown');
    const dropdownToggle = customDropdown ? customDropdown.querySelector('.tech-dropdown-toggle') : null;
    const dropdownMenuOptions = customDropdown ? customDropdown.querySelectorAll('.tech-dropdown-menu li') : [];
    const currentSortSpan = customDropdown ? customDropdown.querySelector('.current-sort') : null;

    if (dropdownToggle && customDropdown) {
        dropdownToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            customDropdown.classList.toggle('dropdown-open');
        });
    }

    document.addEventListener('click', (e) => {
        if (customDropdown && !customDropdown.contains(e.target)) {
            customDropdown.classList.remove('dropdown-open');
        }
    });

    dropdownMenuOptions.forEach(option => {
        option.addEventListener('click', () => {
            const sortBy = option.getAttribute('data-value');
            if (currentSortSpan) currentSortSpan.textContent = option.textContent;
            dropdownMenuOptions.forEach(li => li.classList.remove('active'));
            option.classList.add('active');
            customDropdown.classList.remove('dropdown-open');

            sortProducts(sortBy);
        });
    });

    function sortProducts(sortBy) {
        if (!productGrid) return;
        const cards = Array.from(productGrid.querySelectorAll('.tech-card'));

        if (sortBy === 'price-asc') {
            cards.sort((a, b) => parseFloat(a.getAttribute('data-price')) - parseFloat(b.getAttribute('data-price')));
        } else if (sortBy === 'price-desc') {
            cards.sort((a, b) => parseFloat(b.getAttribute('data-price')) - parseFloat(a.getAttribute('data-price')));
        } else {
            cards.sort((a, b) => parseFloat(a.getAttribute('data-id')) - parseFloat(b.getAttribute('data-id')));
        }

        cards.forEach(card => productGrid.appendChild(card));
    }

    categoryCheckboxes.forEach(cb => cb.addEventListener('change', updateShop));
    stockCheckboxes.forEach(cb => cb.addEventListener('change', updateShop));

    fetchAllShopData();
});
