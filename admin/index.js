let currentAdminLang = 'cz';
let productsData = [];
let fullShopData = {};
let pagesData = [];
let currentLoadedPageData = {};
let currentActiveItem = null; // Uchovává aktuálně spravovanou položku

const toggleSettingsBtn = document.getElementById('toggle-settings-btn');
const configPanel = document.getElementById('config-panel');
const saveConfigBtn = document.getElementById('save-config-btn');

toggleSettingsBtn.addEventListener('click', () => configPanel.classList.toggle('open'));

function setAdminLanguage(lang) {
    currentAdminLang = lang;
    document.getElementById('lang-cz-btn').classList.toggle('active', lang === 'cz');
    document.getElementById('lang-en-btn').classList.toggle('active', lang === 'en');
    log(`Přepnuto CMS na jazyk: ${lang.toUpperCase()}`, 'success');
    renderDashboard();
    
    adjustProductFormLanguage();
}

function loadConfig() {
    document.getElementById('gh-owner').value = localStorage.getItem('sik_gh_owner') || 'JakubSimoncic';
    document.getElementById('gh-repo').value = localStorage.getItem('sik_gh_repo') || 'sik-group';
    document.getElementById('gh-branch').value = localStorage.getItem('sik_gh_branch') || 'main';
    document.getElementById('gh-token').value = localStorage.getItem('sik_gh_token') || '';
}

saveConfigBtn.addEventListener('click', () => {
    localStorage.setItem('sik_gh_owner', document.getElementById('gh-owner').value.trim());
    localStorage.setItem('sik_gh_repo', document.getElementById('gh-repo').value.trim());
    localStorage.setItem('sik_gh_branch', document.getElementById('gh-branch').value.trim());
    localStorage.setItem('sik_gh_token', document.getElementById('gh-token').value.trim());
    log('Konfigurace GitHubu uložena v prohlížeči.', 'success');
    configPanel.classList.remove('open');
});

function log(msg, type = '') {
    const terminal = document.getElementById('terminal-log');
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
    terminal.appendChild(entry);
    terminal.scrollTop = terminal.scrollHeight;
}

function switchView(viewId) {
    document.querySelectorAll('.admin-view').forEach(v => v.classList.remove('active'));
    document.getElementById(viewId).classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showDashboard() {
    resetProductForm();
    switchView('view-dashboard');
}

function sanitizePath(dataFile, type, id, lang = 'cz') {
    // Inteligentní doplnění _en.json podle jazyka CMS, pokud cesta nekončí správně
    let path = dataFile || '';
    
    if (type === 'products' || id.includes('eshop')) {
        path = lang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';
    } else {
        if (lang === 'en' && !path.includes('_en.json')) {
            path = path.replace('.json', '_en.json');
        } else if (lang === 'cz' && path.includes('_en.json')) {
            path = path.replace('_en.json', '.json');
        }
    }

    if (path.startsWith('data/')) path = 'public/' + path;
    if (!path.startsWith('public/')) path = 'public/data/' + path;
    return path;
}

async function initData() {
    try {
        const pagesUrl = '../public/data/pages.json';
        log(`Načítám rozcestník z: ${pagesUrl}`);
        const pagesRes = await fetch(pagesUrl + '?t=' + Date.now());
        if (!pagesRes.ok) throw new Error(`HTTP chyba ${pagesRes.status}`);
        
        const loadedPages = await pagesRes.json();
        if (Array.isArray(loadedPages) && loadedPages.length > 0) {
            pagesData = loadedPages;
            renderDashboard();
            log('Rozcestník úspěšně načten z pages.json.', 'success');
        } else {
            throw new Error('pages.json je prázdný.');
        }
    } catch (e) {
        log('Chyba při načítání pages.json: ' + e.message, 'error');
        pagesData = [
            { "id": "eshop-products-cz", "title": "E-shop Produkty [CZ]", "description": "Správa aktivních dronů a cen", "icon": "🛒", "type": "products", "dataFile": "public/data/e-shop.json", "lang": "cz" },
            { "id": "eshop-products-en", "title": "E-shop Products [EN]", "description": "Active drones and pricing management", "icon": "🛒", "type": "products", "dataFile": "public/data/e-shop_en.json", "lang": "en" },
            { "id": "home-cz", "title": "Úvodní stránka", "description": "Správa obsahu hlavní stránky", "icon": "📄", "type": "page", "dataFile": "public/data/index.json", "lang": "cz" },
            { "id": "home-en", "title": "Home Page [EN]", "description": "Main page content management", "icon": "📄", "type": "page", "dataFile": "public/data/index_en.json", "lang": "en" },
            { "id": "contact-cz", "title": "Kontakt & Tým", "description": "Správa kontaktů a podpory", "icon": "📞", "type": "page", "dataFile": "public/data/kontakt.json", "lang": "cz" },
            { "id": "contact-en", "title": "Contact & Team [EN]", "description": "Contacts and support management", "icon": "📞", "type": "page", "dataFile": "public/data/kontakt_en.json", "lang": "en" }
        ];
        renderDashboard();
        log('Použita záložní struktura rozcestníku.', 'success');
    }
}

function renderDashboard() {
    const container = document.getElementById('dashboard-list');
    container.innerHTML = '';

    const filteredPages = pagesData.filter(item => {
        const itemLang = item.lang || (item.id.endsWith('-en') ? 'en' : 'cz');
        return itemLang.toLowerCase() === currentAdminLang;
    });

    filteredPages.forEach(item => {
        const card = document.createElement('div');
        card.className = 'item-card';

        const icon = item.icon || '📄';
        const subtitle = item.description || (item.dataFile ? `Soubor: ${item.dataFile}` : '');

        card.innerHTML = `
            <div class="item-info">
                <div class="item-thumb">${icon}</div>
                <div class="item-details">
                    <h4>${item.title}</h4>
                    <p>${subtitle}</p>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-primary" onclick="openSection('${item.id}')" type="button">Spravovat</button>
            </div>
        `;
        container.appendChild(card);
    });
}

function renderFlatFields(obj, prefix = '', container) {
    if (obj === null || obj === undefined) return;

    Object.keys(obj).forEach(key => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const val = obj[key];

        if (val !== null && typeof val === 'object') {
            renderFlatFields(val, fullKey, container);
        } else {
            const fieldGroup = document.createElement('div');
            fieldGroup.className = 'field-group';

            const friendlyName = getFriendlyCmsLabel(fullKey);

            const labelEl = document.createElement('label');
            labelEl.textContent = friendlyName;
            fieldGroup.appendChild(labelEl);

            let input;
            if (typeof val === 'string' && val.length > 60) {
                input = document.createElement('textarea');
                input.rows = 4;
            } else {
                input = document.createElement('input');
                input.type = 'text';
            }

            input.className = 'page-field-input';
            input.dataset.keyPath = fullKey;
            input.value = val !== undefined && val !== null ? val : '';
            input.placeholder = friendlyName;

            fieldGroup.appendChild(input);
            container.appendChild(fieldGroup);
        }
    });
}

async function openSection(id) {
    const item = pagesData.find(p => p.id === id);
    if (!item) return;

    currentActiveItem = item;
    const itemLang = item.lang || (item.id.endsWith('-en') ? 'en' : 'cz');
    const dataFile = sanitizePath(item.dataFile, item.type, item.id, itemLang);
    const targetUrl = `../${dataFile}`;

    if (item.type === 'products') {
        try {
            log(`Načítám e-shop data z: ${targetUrl}`);
            const prodRes = await fetch(targetUrl + '?t=' + Date.now());
            if (!prodRes.ok) throw new Error(`HTTP chyba ${prodRes.status}`);
            fullShopData = await prodRes.json();
            
            if (Array.isArray(fullShopData)) {
                productsData = fullShopData;
                fullShopData = { products: productsData };
            } else {
                productsData = fullShopData.products || [];
            }

            const textsContainer = document.getElementById('shop-texts-dynamic-fields');
            textsContainer.innerHTML = '';

            Object.keys(fullShopData).forEach(key => {
                if (key !== 'products') {
                    const fieldGroup = document.createElement('div');
                    fieldGroup.className = 'field-group';

                    const label = document.createElement('label');
                    label.textContent = getFriendlyCmsLabel(key);

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'shop-text-input';
                    input.dataset.key = key;
                    input.value = fullShopData[key] || '';

                    fieldGroup.appendChild(label);
                    fieldGroup.appendChild(input);
                    textsContainer.appendChild(fieldGroup);
                }
            });

            adjustProductFormLanguage();
            renderProductsList();
            switchView('view-products');
        } catch (e) {
            log('Chyba při načítání produktů: ' + e.message, 'error');
        }
    } else {
        document.getElementById('edit-page-id').value = item.id;
        document.getElementById('page-title').value = item.title;
        document.getElementById('editor-page-heading').textContent = `Úprava obsahu: ${item.title}`;

        const dynamicFields = document.getElementById('page-dynamic-fields');
        dynamicFields.innerHTML = '<p style="color: var(--text-muted);">Načítám data...</p>';

        try {
            log(`Načítám data stránky z: ${targetUrl}`);
            const res = await fetch(targetUrl + '?t=' + Date.now());
            if (!res.ok) throw new Error(`HTTP chyba ${res.status}`);
            
            currentLoadedPageData = await res.json();

            dynamicFields.innerHTML = '';
            dynamicFields.dataset.dataFile = dataFile;

            renderFlatFields(currentLoadedPageData, '', dynamicFields);

            switchView('view-page-editor');
        } catch (err) {
            log('Chyba při načítání obsahu stránky: ' + err.message, 'error');
        }
    }
}

function adjustProductFormLanguage() {
    const enFields = document.querySelectorAll('.en-only-field');
    const czFields = document.querySelectorAll('.cz-only-field');

    if (currentAdminLang === 'en') {
        enFields.forEach(el => el.style.display = 'flex');
        czFields.forEach(el => el.style.display = 'none');
    } else {
        enFields.forEach(el => el.style.display = 'none');
        czFields.forEach(el => el.style.display = 'flex');
    }
}

function renderProductsList() {
    const container = document.getElementById('products-list');
    container.innerHTML = '';

    productsData.forEach(p => {
        const card = document.createElement('div');
        card.className = 'item-card';

        const imgPath = p.image ? '../public/' + p.image.replace(/^\.\//, '') : '../public/img/drone.png';
        const formattedPrice = p.price ? p.price.toLocaleString('cs-CZ') : 0;
        const eurPrice = p.eurPrice ? p.eurPrice.toLocaleString('cs-CZ') : Math.round((p.price || 0) / 25);

        card.innerHTML = `
            <div class="item-info">
                <img src="${imgPath}" alt="${p.title}" class="item-thumb" style="object-fit: cover;">
                <div class="item-details">
                    <h4>${p.title}</h4>
                    <p>${p.categoryLabel || p.category} // ${formattedPrice} Kč / ${eurPrice} EUR</p>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn-secondary" onclick="editProduct('${p.id}')" type="button">Upravit</button>
                <button class="btn-delete" onclick="deleteProduct('${p.id}')" type="button">Smazat</button>
            </div>
        `;
        container.appendChild(card);
    });
}

const specsContainer = document.getElementById('specs-builder');
document.getElementById('add-spec-btn').addEventListener('click', () => addSpecRow());

function addSpecRow(key = '', val = '') {
    const row = document.createElement('div');
    row.className = 'spec-item-row';
    row.innerHTML = `
        <input type="text" class="spec-key" placeholder="Parametr" value="${key}" style="flex: 1;">
        <input type="text" class="spec-val" placeholder="Hodnota" value="${val}" style="flex: 1;">
        <button type="button" class="btn-delete" onclick="this.parentElement.remove()">✕</button>
    `;
    specsContainer.appendChild(row);
}

function editProduct(id) {
    const prod = productsData.find(p => String(p.id) === String(id));
    if (!prod) return;

    document.getElementById('edit-prod-id').value = prod.id;
    document.getElementById('prod-title').value = prod.title;
    document.getElementById('prod-price').value = prod.price;
    document.getElementById('prod-eur-price').value = prod.eurPrice || Math.round(prod.price / 25);
    document.getElementById('prod-category').value = prod.category;
    document.getElementById('prod-tag').value = prod.tag || '';
    document.getElementById('prod-tag-en').value = prod.tagEn || prod.tag || '';
    document.getElementById('prod-desc').value = prod.description || '';
    document.getElementById('prod-desc-en').value = prod.descriptionEn || prod.description || '';

    specsContainer.innerHTML = '';
    if (prod.specs) {
        Object.entries(prod.specs).forEach(([k, v]) => addSpecRow(k, v));
    }

    document.getElementById('product-form-title').textContent = `Upravit dron: ${prod.title}`;
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';

    const formContainer = document.getElementById('product-form-container');
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    log(`Načten k úpravě dron: ${prod.title}`, 'success');
}

function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-prod-id').value = '';
    document.getElementById('product-form-title').textContent = 'Přidat nový dron';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    specsContainer.innerHTML = '';
}

document.getElementById('cancel-edit-btn').addEventListener('click', resetProductForm);

async function commitFileToGithub(filePath, contentObject, commitMessage) {
    const owner = localStorage.getItem('sik_gh_owner') || 'JakubSimoncic';
    const repo = localStorage.getItem('sik_gh_repo') || 'sik-group';
    const branch = localStorage.getItem('sik_gh_branch') || 'main';
    const token = localStorage.getItem('sik_gh_token');

    if (!token || !owner || !repo) {
        log('Upozornění: Není vyplněn GitHub token. Úpravy nebyly odeslány.', 'error');
        return;
    }

    try {
        log(`Získávám SHA pro ${filePath}...`);
        const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let sha = '';
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        log(`Odesílám novou verzi na GitHub...`);
        const jsonText = JSON.stringify(contentObject, null, 2);
        const base64Content = btoa(unescape(encodeURIComponent(jsonText)));

        const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: commitMessage,
                content: base64Content,
                sha: sha || undefined,
                branch: branch
            })
        });

        if (!putRes.ok) throw new Error('Chyba GitHub API.');
        log(`✓ Úspěšně uloženo a zacommitováno na GitHub!`, 'success');
    } catch (err) {
        log(`Chyba: ${err.message}`, 'error');
    }
}

function setNestedValue(obj, path, value) {
    const parts = path.split('.');
    let curr = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const part = parts[i];
        const nextPart = parts[i + 1];
        if (curr[part] === undefined) {
            curr[part] = !isNaN(nextPart) ? [] : {};
        }
        curr = curr[part];
    }
    curr[parts[parts.length - 1]] = value;
}

document.getElementById('save-shop-texts-btn').addEventListener('click', async () => {
    document.querySelectorAll('.shop-text-input').forEach(input => {
        const k = input.dataset.key;
        fullShopData[k] = input.value;
    });

    fullShopData.products = productsData;

    const itemLang = currentActiveItem ? (currentActiveItem.lang || 'cz') : currentAdminLang;
    const filePath = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';

    await commitFileToGithub(filePath, fullShopData, `CMS: Aktualizovány texty e-shopu (${itemLang.toUpperCase()})`);
});

document.getElementById('page-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const dynamicFields = document.getElementById('page-dynamic-fields');
    const dataFile = dynamicFields.dataset.dataFile; 
    if (!dataFile) return;

    let updatedData = JSON.parse(JSON.stringify(currentLoadedPageData));

    document.querySelectorAll('.page-field-input').forEach(input => {
        const keyPath = input.dataset.keyPath;
        setNestedValue(updatedData, keyPath, input.value);
    });

    const pageTitle = document.getElementById('page-title').value;
    await commitFileToGithub(dataFile, updatedData, `CMS: Aktualizován obsah ${dataFile} (${pageTitle})`);
    showDashboard();
});

document.getElementById('product-form').addEventListener('submit', async (e) => {
    e.preventDefault();

    const editId = document.getElementById('edit-prod-id').value;
    const title = document.getElementById('prod-title').value;
    const price = parseFloat(document.getElementById('prod-price').value);
    const eurPrice = parseFloat(document.getElementById('prod-eur-price').value) || Math.round(price / 25);
    const category = document.getElementById('prod-category').value;
    const tag = document.getElementById('prod-tag').value;
    const tagEn = document.getElementById('prod-tag-en').value;
    const desc = document.getElementById('prod-desc').value;
    const descEn = document.getElementById('prod-desc-en').value;

    const specs = {};
    document.querySelectorAll('.spec-item-row').forEach(row => {
        const k = row.querySelector('.spec-key').value.trim();
        const v = row.querySelector('.spec-val').value.trim();
        if (k && v) specs[k] = v;
    });

    const catLabels = { cinematic: 'FPV Cinematic', longrange: 'Longrange', freestyle: 'Freestyle' };

    if (editId) {
        const idx = productsData.findIndex(p => String(p.id) === String(editId));
        if (idx !== -1) {
            productsData[idx] = {
                ...productsData[idx],
                title, price, eurPrice, category, tag, tagEn, description: desc, descriptionEn: descEn, specs,
                categoryLabel: catLabels[category]
            };
        }
    } else {
        const newProd = {
            id: String(Date.now()),
            title, price, eurPrice, category, tag, tagEn, description: desc, descriptionEn: descEn, specs,
            categoryLabel: catLabels[category],
            stock: "skladem",
            image: "../img/drone.png"
        };
        productsData.push(newProd);
    }

    renderProductsList();

    fullShopData.products = productsData;

    const itemLang = currentActiveItem ? (currentActiveItem.lang || 'cz') : currentAdminLang;
    const filePath = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';

    await commitFileToGithub(filePath, fullShopData, `CMS: Uložen dron ${title} (${itemLang.toUpperCase()})`);
    resetProductForm();
});

async function deleteProduct(id) {
    const prod = productsData.find(p => String(p.id) === String(id));
    if (!confirm(`Opravdu chcete smazat dron "${prod ? prod.title : id}"?`)) return;

    productsData = productsData.filter(p => String(p.id) !== String(id));
    renderProductsList();

    fullShopData.products = productsData;

    const itemLang = currentActiveItem ? (currentActiveItem.lang || 'cz') : currentAdminLang;
    const filePath = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';

    await commitFileToGithub(filePath, fullShopData, `CMS: Smazán dron ${prod ? prod.title : id} (${itemLang.toUpperCase()})`);
}

loadConfig();
initData();

const cmsFieldLabels = {
    "mainTitle": "Hlavní nadpis e-shopu",
    "mainSubtitle": "Podnadpis e-shopu",
    "filterBtnHideText": "Text tlačítka pro skrytí filtrů",
    "filterBtnShowText": "Text tlačítka pro zobrazení filtrů",
    "sortRecommended": "Text řazení: Doporučené",
    "sortPriceAsc": "Text řazení: Nejnižší > Nejvyšší",
    "sortPriceDesc": "Text řazení: Nejvyšší > Nejnižší",
    "resetAllFiltersText": "Tlačítko: Resetovat všechny filtry",
    "captionCategories": "Nadpis sekce: Kategorie",
    "catCinematicText": "Kategorie: FPV Cinematic",
    "catLongrangeText": "Kategorie: Longrange",
    "catFreestyleText": "Kategorie: Freestyle",
    "captionPriceRange": "Nadpis sekce: Cenové rozpětí",
    "pricePrefixFrom": "Cenová předložka: Od",
    "pricePrefixTo": "Cenová předložka: do",
    "currencyText": "Měna",
    "resetPriceText": "Tlačítko: Resetovat cenu",
    "captionStock": "Nadpis sekce: Dostupnost",
    "stockInStockText": "Stav skladu: Komponenty skladem",
    "modalSpecsHeading": "Detail dronu: Nadpis specifikací",
    "modalButtonText": "Detail dronu: Text tlačítka poptávky",

    "heroTitle": "Úvodní stránka – Hlavní nadpis",
    "heroBtnDrony": "Úvodní stránka – Text tlačítka 'Drony'",
    "heroBtnFpv": "Úvodní stránka – Text tlačítka 'FPV'",
    "divisionsTitle": "Úvodní stránka – Nadpis sekce specializací",
    "trustTitle": "Úvodní stránka – Nadpis partnerů",
    "trustText": "Úvodní stránka – Text u partnerů",
    "bookingTitle": "Úvodní stránka – Nadpis rezervací",
    "bookingHeading": "Úvodní stránka – Podnadpis kalendáře",
    "dateUnselectedText": "Úvodní stránka – Text před vývěrem data",
    "formPlaceholderName": "Formulář – Placeholder pro Jméno/Firmu",
    "formPlaceholderEmail": "Formulář – Placeholder pro Email",
    "formPlaceholderPhone": "Formulář – Placeholder pro Telefon",
    "formPlaceholderProject": "Formulář – Placeholder pro Projekt",
    "formSubmitBtn": "Formulář – Text tlačítka 'Odeslat'",

    "contactPage.teamSectionTitle": "Kontakt – Nadpis týmu",
    "contactPage.faqSectionTitle": "Kontakt – Nadpis Často kladených otázek (FAQ)",
    "contactPage.contactSectionTitle": "Kontakt – Nadpis sekce Kontaktní údaje",
    "contactPage.businessTitle": "Kontakt – Nadpis bloku 'Obchodní jednání'",
    "contactPage.billingTitle": "Kontakt – Nadpis bloku 'Fakturační údaje'",
    "contactPage.labels.email": "Popisek pole – E-mail",
    "contactPage.labels.phone": "Popisek pole – Telefon",
    "contactPage.labels.address": "Popisek pole – Sídlo",
    "contactPage.labels.ico": "Popisek pole – IČO",
    "contactPage.labels.dic": "Popisek pole – DIČ",
    "contactPage.labels.bank": "Popisek pole – Bankovní účet",
    "contact.email": "Kontaktní e-mail společnosti",
    "contact.phone": "Kontaktní telefon společnosti",
    "contact.address": "Sídlo společnosti (adresa)",
    "contact.ico": "IČO společnosti",
    "contact.dic": "DIČ společnosti",
    "contact.bank": "Bankovní účet společnosti"
};

function getFriendlyCmsLabel(key) {
    if (cmsFieldLabels[key]) return cmsFieldLabels[key];

    if (key.startsWith('divisions.')) {
        const index = parseInt(key.split('.')[1], 10) + 1;
        if (key.endsWith('.number')) return `Divize č. ${index} – Číslo položky`;
        if (key.endsWith('.badge')) return `Divize č. ${index} – Štítek / Badge`;
        if (key.endsWith('.title')) return `Divize č. ${index} – Název specializace`;
        if (key.endsWith('.description')) return `Divize č. ${index} – Popis specializace`;
        if (key.endsWith('.btnText')) return `Divize č. ${index} – Text tlačítka`;
        if (key.endsWith('.image')) return `Divize č. ${index} – Cesta k obrázku`;
        if (key.endsWith('.link')) return `Divize č. ${index} – Odkaz na podstránku`;
    }

    if (key.startsWith('team.')) {
        const index = parseInt(key.split('.')[1], 10) + 1;
        if (key.endsWith('.name')) return `Člen týmu č. ${index} – Jméno`;
        if (key.endsWith('.role')) return `Člen týmu č. ${index} – Pozice / Role`;
        if (key.endsWith('.image')) return `Člen týmu č. ${index} – Cesta k fotce`;
        if (key.endsWith('.bio')) return `Člen týmu č. ${index} – Popis / Bio`;
        if (key.includes('.tags.')) return `Člen týmu č. ${index} – Štítek dovednosti`;
    }

    if (key.startsWith('faq.')) {
        const index = parseInt(key.split('.')[1], 10) + 1;
        if (key.endsWith('.question')) return `FAQ otázka č. ${index}`;
        if (key.endsWith('.answer')) return `FAQ odpověď č. ${index}`;
    }

    return key;
}
