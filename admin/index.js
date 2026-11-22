// ==========================================================================
// KONFIGURACE GITHUBU & SPRÁVA PŘÍSTUPŮ (AES-GCM + PBKDF2)
// ==========================================================================
const GITHUB_CONFIG = {
    owner: 'JakubSimoncic',
    repo: 'sik-group',
    branch: 'main'
};

const OWNER_LOGIN_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // "admin"
const USERS_DATA_FILE = 'public/data/cms-users.json';

let currentAdminLang = 'cz';
let productsData = [];
let categoriesData = [];
let fullShopData = {};
let pagesData = [];
let currentLoadedPageData = {};
let currentActiveItem = null;
let cmsAccessStore = { owner: null, users: [] };
let isCurrentUserOwner = false;
let cmsInitialized = false;

// ==========================================================================
// KRYPTOGRAFIE (PBKDF2 + AES-GCM PRO ŠIFROVÁNÍ TOKENU A RESETOVACÍCH PINŮ)
// ==========================================================================
async function sha256Hex(text) {
    const data = new TextEncoder().encode(text);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function deriveAesKey(secret, saltBytes) {
    const baseKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(secret),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );
    return crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: 100000,
            hash: 'SHA-256'
        },
        baseKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

async function encryptSecret(plainText, secret) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const key = await deriveAesKey(secret, salt);
    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        new TextEncoder().encode(plainText)
    );
    const combined = new Uint8Array(salt.length + iv.length + cipherBuffer.byteLength);
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(cipherBuffer), salt.length + iv.length);
    return btoa(String.fromCharCode(...combined));
}

async function decryptSecret(base64Payload, secret) {
    if (!base64Payload) return null;
    try {
        const binary = atob(base64Payload);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        const salt = bytes.slice(0, 16);
        const iv = bytes.slice(16, 28);
        const data = bytes.slice(28);
        const key = await deriveAesKey(secret, salt);
        const decryptedBuffer = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
        return new TextDecoder().decode(decryptedBuffer);
    } catch {
        return null;
    }
}

function generateResetPin() {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const num = String(array[0] % 1000000).padStart(6, '0');
    return `${num.slice(0, 3)}-${num.slice(3)}`;
}

// ==========================================================================
// NAČTENÍ ÚLOŽIŠTĚ PŘÍSTUPŮ Z REPOZITÁŘE
// ==========================================================================
async function fetchAccessStore() {
    try {
        const res = await fetch(`../${USERS_DATA_FILE}?t=${Date.now()}`);
        if (!res.ok) return { owner: null, users: [] };
        const data = await res.json();
        return {
            owner: data.owner || null,
            users: Array.isArray(data.users) ? data.users : []
        };
    } catch {
        return { owner: null, users: [] };
    }
}

async function verifyGithubToken(token) {
    if (!token) return false;
    try {
        const res = await fetch(`https://api.github.com/repos/${GITHUB_CONFIG.owner}/${GITHUB_CONFIG.repo}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Accept': 'application/vnd.github+json'
            }
        });
        if (!res.ok) return false;
        const repoInfo = await res.json();
        return Boolean(repoInfo.permissions && repoInfo.permissions.push);
    } catch {
        return false;
    }
}

// ==========================================================================
// OBRAZOVKY: SETUP / LOGIN / RESET HESLA
// ==========================================================================
const setupScreen = document.getElementById('setup-screen');
const loginScreen = document.getElementById('login-screen');
const adminWrapper = document.getElementById('admin-wrapper');

function showScreen(screenName) {
    setupScreen.style.display = screenName === 'setup' ? 'flex' : 'none';
    loginScreen.style.display = screenName === 'login' ? 'flex' : 'none';
    adminWrapper.style.display = screenName === 'cms' ? 'block' : 'none';
}

function unlockCms(displayName, isOwner, token) {
    isCurrentUserOwner = isOwner;
    sessionStorage.setItem('sik_cms_token', token);
    sessionStorage.setItem('sik_cms_display', displayName);
    sessionStorage.setItem('sik_cms_is_owner', isOwner ? '1' : '0');

    const badge = document.getElementById('logged-user-badge');
    if (badge) {
        badge.textContent = isOwner ? `● ${displayName} [MAJITEL]` : `● ${displayName}`;
    }

    const ownerCard = document.getElementById('owner-access-card-container');
    if (ownerCard) {
        ownerCard.style.display = isOwner ? 'block' : 'none';
    }

    showScreen('cms');

    if (!cmsInitialized) {
        cmsInitialized = true;
        initData();
    }
    log(`Přihlášen uživatel: ${displayName}${isOwner ? ' (Majitel)' : ''}`, 'success');
}

document.getElementById('open-reset-mode-btn').addEventListener('click', () => {
    document.getElementById('cms-login-form').style.display = 'none';
    document.getElementById('cms-reset-form').style.display = 'block';
    document.getElementById('auth-card-subtitle').textContent = 'Nastavení nového hesla pomocí PINu';
    document.getElementById('login-error').textContent = '';
    document.getElementById('reset-error').textContent = '';
});

document.getElementById('back-to-login-btn').addEventListener('click', () => {
    document.getElementById('cms-reset-form').style.display = 'none';
    document.getElementById('cms-login-form').style.display = 'block';
    document.getElementById('auth-card-subtitle').textContent = 'Přihlášení do správy obsahu';
    document.getElementById('login-error').textContent = '';
    document.getElementById('reset-error').textContent = '';
});

// 1. PRVNÍ NASTAVENÍ MAJITELE ("admin")
document.getElementById('cms-setup-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('setup-error');
    const btn = document.getElementById('setup-submit-btn');
    errorEl.textContent = '';

    const pass = document.getElementById('setup-password').value;
    const passConfirm = document.getElementById('setup-password-confirm').value;
    const token = document.getElementById('setup-token').value.trim();

    if (pass !== passConfirm) {
        errorEl.textContent = 'Hesla se neshodují.';
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Ověřuji klíč a šifruji...';

    const validToken = await verifyGithubToken(token);
    if (!validToken) {
        errorEl.textContent = 'Neplatný GitHub API klíč nebo chybí právo zápisu do repozitáře.';
        btn.disabled = false;
        btn.textContent = 'Uložit a aktivovat CMS';
        return;
    }

    const recoveryPin = generateResetPin();
    const encryptedTokenByPassword = await encryptSecret(token, pass);
    const encryptedTokenByRecovery = await encryptSecret(token, recoveryPin);
    const encryptedRecoveryPinForOwner = await encryptSecret(recoveryPin, token);

    cmsAccessStore = {
        owner: {
            loginHash: OWNER_LOGIN_HASH,
            encryptedTokenByPassword,
            encryptedTokenByRecovery,
            encryptedRecoveryPin: encryptedRecoveryPinForOwner
        },
        users: []
    };

    sessionStorage.setItem('sik_cms_token', token);
    sessionStorage.setItem('sik_cms_display', 'admin');

    await commitFileToGithub(
        USERS_DATA_FILE,
        cmsAccessStore,
        'CMS: Inicializace účtu majitele (admin)'
    );

    btn.disabled = false;
    btn.textContent = 'Uložit a aktivovat CMS';
    unlockCms('admin', true, token);
});

// 2. BĚŽNÉ PŘIHLÁŠENÍ
document.getElementById('cms-login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('login-error');
    const btn = document.getElementById('login-submit-btn');
    errorEl.textContent = '';

    const loginInput = document.getElementById('login-username').value.trim().toLowerCase();
    const passwordInput = document.getElementById('login-password').value;

    btn.disabled = true;
    btn.textContent = 'Ověřuji...';

    cmsAccessStore = await fetchAccessStore();
    const loginHash = await sha256Hex(loginInput);

    if (loginHash === OWNER_LOGIN_HASH && cmsAccessStore.owner) {
        const decryptedToken = await decryptSecret(cmsAccessStore.owner.encryptedTokenByPassword, passwordInput);
        if (decryptedToken && await verifyGithubToken(decryptedToken)) {
            btn.disabled = false;
            btn.textContent = 'Přihlásit se';
            document.getElementById('cms-login-form').reset();
            unlockCms('admin', true, decryptedToken);
            return;
        }
        errorEl.textContent = 'Nesprávné heslo pro účet admin.';
        btn.disabled = false;
        btn.textContent = 'Přihlásit se';
        return;
    }

    const userRecord = cmsAccessStore.users.find(u => u.loginHash === loginHash);
    if (!userRecord) {
        errorEl.textContent = 'Uživatel s tímto přihlašovacím jménem neexistuje.';
        btn.disabled = false;
        btn.textContent = 'Přihlásit se';
        return;
    }

    if (!userRecord.encryptedTokenByPassword) {
        errorEl.textContent = 'Účet ještě nemá nastavené heslo. Klikněte níže na „První přihlášení / Zapomenuté heslo“ a zadejte PIN od majitele.';
        btn.disabled = false;
        btn.textContent = 'Přihlásit se';
        return;
    }

    const decryptedToken = await decryptSecret(userRecord.encryptedTokenByPassword, passwordInput);
    if (!decryptedToken || !(await verifyGithubToken(decryptedToken))) {
        errorEl.textContent = 'Nesprávné heslo.';
        btn.disabled = false;
        btn.textContent = 'Přihlásit se';
        return;
    }

    const displayName = (await decryptSecret(userRecord.encryptedLabel, decryptedToken)) || loginInput;
    btn.disabled = false;
    btn.textContent = 'Přihlásit se';
    document.getElementById('cms-login-form').reset();
    unlockCms(displayName, false, decryptedToken);
});

// 3. NASTAVENÍ / RESET HESLA POMOCÍ RESETOVACÍHO PINU
document.getElementById('cms-reset-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById('reset-error');
    const btn = document.getElementById('reset-submit-btn');
    errorEl.textContent = '';

    const loginInput = document.getElementById('reset-username').value.trim().toLowerCase();
    const pinInput = document.getElementById('reset-pin').value.trim();
    const newPassword = document.getElementById('reset-new-password').value;

    btn.disabled = true;
    btn.textContent = 'Nastavuji nové heslo...';

    cmsAccessStore = await fetchAccessStore();
    const loginHash = await sha256Hex(loginInput);

    if (loginHash === OWNER_LOGIN_HASH && cmsAccessStore.owner) {
        const decryptedToken = await decryptSecret(cmsAccessStore.owner.encryptedTokenByRecovery, pinInput);
        if (!decryptedToken || !(await verifyGithubToken(decryptedToken))) {
            errorEl.textContent = 'Neplatný Recovery PIN pro účet admin.';
            btn.disabled = false;
            btn.textContent = 'Nastavit nové heslo a přihlásit';
            return;
        }

        const newRecoveryPin = generateResetPin();
        cmsAccessStore.owner.encryptedTokenByPassword = await encryptSecret(decryptedToken, newPassword);
        cmsAccessStore.owner.encryptedTokenByRecovery = await encryptSecret(decryptedToken, newRecoveryPin);
        cmsAccessStore.owner.encryptedRecoveryPin = await encryptSecret(newRecoveryPin, decryptedToken);

        sessionStorage.setItem('sik_cms_token', decryptedToken);
        sessionStorage.setItem('sik_cms_display', 'admin');

        await commitFileToGithub(
            USERS_DATA_FILE,
            cmsAccessStore,
            'CMS: Obnoveno heslo majitele (admin)'
        );

        btn.disabled = false;
        btn.textContent = 'Nastavit nové heslo a přihlásit';
        document.getElementById('cms-reset-form').reset();
        unlockCms('admin', true, decryptedToken);
        return;
    }

    const userIdx = cmsAccessStore.users.findIndex(u => u.loginHash === loginHash);
    if (userIdx === -1) {
        errorEl.textContent = 'Uživatel nenalezen.';
        btn.disabled = false;
        btn.textContent = 'Nastavit nové heslo a přihlásit';
        return;
    }

    const userRecord = cmsAccessStore.users[userIdx];
    const decryptedToken = await decryptSecret(userRecord.encryptedTokenByResetPin, pinInput);
    if (!decryptedToken || !(await verifyGithubToken(decryptedToken))) {
        errorEl.textContent = 'Neplatný resetovací PIN.';
        btn.disabled = false;
        btn.textContent = 'Nastavit nové heslo a přihlásit';
        return;
    }

    cmsAccessStore.users[userIdx].encryptedTokenByPassword = await encryptSecret(decryptedToken, newPassword);

    const displayName = (await decryptSecret(userRecord.encryptedLabel, decryptedToken)) || loginInput;
    sessionStorage.setItem('sik_cms_token', decryptedToken);
    sessionStorage.setItem('sik_cms_display', displayName);

    await commitFileToGithub(
        USERS_DATA_FILE,
        cmsAccessStore,
        `CMS: Uživatel (${displayName}) si nastavil nové heslo`
    );

    btn.disabled = false;
    btn.textContent = 'Nastavit nové heslo a přihlásit';
    document.getElementById('cms-reset-form').reset();
    unlockCms(displayName, false, decryptedToken);
});

async function bootCmsAuth() {
    localStorage.removeItem('sik_gh_token');
    cmsAccessStore = await fetchAccessStore();

    if (!cmsAccessStore.owner) {
        showScreen('setup');
        return;
    }

    const savedToken = sessionStorage.getItem('sik_cms_token');
    const savedDisplay = sessionStorage.getItem('sik_cms_display');
    const savedIsOwner = sessionStorage.getItem('sik_cms_is_owner') === '1';

    if (savedToken && savedDisplay && (await verifyGithubToken(savedToken))) {
        unlockCms(savedDisplay, savedIsOwner, savedToken);
    } else {
        sessionStorage.removeItem('sik_cms_token');
        sessionStorage.removeItem('sik_cms_display');
        sessionStorage.removeItem('sik_cms_is_owner');
        showScreen('login');
    }
}

document.getElementById('logout-btn').addEventListener('click', () => {
    sessionStorage.removeItem('sik_cms_token');
    sessionStorage.removeItem('sik_cms_display');
    sessionStorage.removeItem('sik_cms_is_owner');
    isCurrentUserOwner = false;
    document.getElementById('cms-reset-form').style.display = 'none';
    document.getElementById('cms-login-form').style.display = 'block';
    document.getElementById('auth-card-subtitle').textContent = 'Přihlášení do správy obsahu';
    showScreen('login');
});

// ==========================================================================
// SPRÁVA PŘÍSTUPŮ & RESETOVACÍCH KÓDŮ (POUZE PRO MAJITELE)
// ==========================================================================
async function openUsersManager() {
    if (!isCurrentUserOwner) return;
    switchView('view-users');
    await loadAndRenderUsers();
}

async function loadAndRenderUsers() {
    const container = document.getElementById('users-list');
    container.innerHTML = '<p style="color: var(--text-muted);">Načítám přístupy a resetovací PINy...</p>';

    cmsAccessStore = await fetchAccessStore();
    const token = sessionStorage.getItem('sik_cms_token');

    const ownerPinDisplay = document.getElementById('owner-recovery-pin-display');
    if (ownerPinDisplay && cmsAccessStore.owner && cmsAccessStore.owner.encryptedRecoveryPin && token) {
        const decryptedOwnerPin = await decryptSecret(cmsAccessStore.owner.encryptedRecoveryPin, token);
        ownerPinDisplay.textContent = decryptedOwnerPin || '—';
    }

    container.innerHTML = '';
    if (cmsAccessStore.users.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Zatím nejsou vytvořeny žádné účty pro zaměstnance.</p>';
        return;
    }

    for (const user of cmsAccessStore.users) {
        const label = (await decryptSecret(user.encryptedLabel, token)) || 'Zaměstnanec';
        const loginName = (await decryptSecret(user.encryptedLoginName, token)) || '—';
        const resetPin = (await decryptSecret(user.encryptedResetPin, token)) || '—';
        const hasPasswordSet = Boolean(user.encryptedTokenByPassword);

        const card = document.createElement('div');
        card.className = 'item-card';
        card.innerHTML = `
            <div class="item-info">
                <div class="item-thumb">👤</div>
                <div class="item-details">
                    <h4>${escapeHtml(label)} <span style="color: var(--text-muted); font-weight: 500; font-size: 0.85rem;">(login: ${escapeHtml(loginName)})</span></h4>
                    <p>${hasPasswordSet ? '✓ Vlastní heslo nastaveno' : '⏳ Čeká na první nastavení hesla pomocí PINu'}</p>
                </div>
            </div>
            <div class="item-actions">
                <span style="font-size: 0.72rem; color: var(--text-muted); text-transform: uppercase; font-weight: 700;">Reset PIN:</span>
                <span class="pin-badge">${escapeHtml(resetPin)}</span>
                <button class="btn-secondary" onclick="copyResetPin('${escapeHtml(resetPin)}')" type="button">Kopírovat</button>
                <button class="btn-secondary" onclick="regenerateUserResetPin('${user.id}')" type="button">Nový PIN</button>
                <button class="btn-delete" onclick="removeCmsUser('${user.id}')" type="button">Smazat účet</button>
            </div>
        `;
        container.appendChild(card);
    }
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function copyResetPin(pin) {
    navigator.clipboard.writeText(pin);
    log(`Resetovací PIN (${pin}) zkopírován do schránky.`, 'success');
}

document.getElementById('add-user-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!isCurrentUserOwner) return;

    const labelInput = document.getElementById('new-user-label').value.trim();
    const loginInput = document.getElementById('new-user-login').value.trim().toLowerCase();
    const token = sessionStorage.getItem('sik_cms_token');

    if (!labelInput || !loginInput || !token) return;

    const loginHash = await sha256Hex(loginInput);
    if (loginHash === OWNER_LOGIN_HASH || cmsAccessStore.users.some(u => u.loginHash === loginHash)) {
        log('Chyba: Toto přihlašovací jméno již existuje.', 'error');
        return;
    }

    const addBtn = document.getElementById('add-user-submit-btn');
    addBtn.disabled = true;
    addBtn.textContent = 'Vytvářím účet...';

    const resetPin = generateResetPin();

    cmsAccessStore.users.push({
        id: String(Date.now()),
        loginHash,
        encryptedLabel: await encryptSecret(labelInput, token),
        encryptedLoginName: await encryptSecret(loginInput, token),
        encryptedResetPin: await encryptSecret(resetPin, token),
        encryptedTokenByResetPin: await encryptSecret(token, resetPin),
        encryptedTokenByPassword: null
    });

    await commitFileToGithub(
        USERS_DATA_FILE,
        cmsAccessStore,
        `CMS: Vytvořen přístup pro ${labelInput}`
    );

    document.getElementById('add-user-form').reset();
    addBtn.disabled = false;
    addBtn.textContent = 'Vytvořit účet a vygenerovat PIN';
    await loadAndRenderUsers();
});

async function regenerateUserResetPin(userId) {
    if (!isCurrentUserOwner) return;
    const token = sessionStorage.getItem('sik_cms_token');
    const idx = cmsAccessStore.users.findIndex(u => String(u.id) === String(userId));
    if (idx === -1 || !token) return;

    const newPin = generateResetPin();
    cmsAccessStore.users[idx].encryptedResetPin = await encryptSecret(newPin, token);
    cmsAccessStore.users[idx].encryptedTokenByResetPin = await encryptSecret(token, newPin);

    await commitFileToGithub(
        USERS_DATA_FILE,
        cmsAccessStore,
        'CMS: Vygenerován nový resetovací PIN pro zaměstnance'
    );

    await loadAndRenderUsers();
}

async function regenerateOwnerRecoveryPin() {
    if (!isCurrentUserOwner) return;
    const token = sessionStorage.getItem('sik_cms_token');
    if (!cmsAccessStore.owner || !token) return;

    const newPin = generateResetPin();
    cmsAccessStore.owner.encryptedTokenByRecovery = await encryptSecret(token, newPin);
    cmsAccessStore.owner.encryptedRecoveryPin = await encryptSecret(newPin, token);

    await commitFileToGithub(
        USERS_DATA_FILE,
        cmsAccessStore,
        'CMS: Obnoven Recovery PIN majitele'
    );

    await loadAndRenderUsers();
}

async function removeCmsUser(userId) {
    if (!isCurrentUserOwner) return;
    if (!confirm('Opravdu chcete tento účet trvale smazat?')) return;

    cmsAccessStore.users = cmsAccessStore.users.filter(u => String(u.id) !== String(userId));

    await commitFileToGithub(
        USERS_DATA_FILE,
        cmsAccessStore,
        'CMS: Odebrán uživatelský účet'
    );

    await loadAndRenderUsers();
}

// ==========================================================================
// PŘEPÍNÁNÍ JAZYKA A NAVIGACE V CMS
// ==========================================================================
function setAdminLanguage(lang) {
    currentAdminLang = lang;
    document.getElementById('lang-cz-btn').classList.toggle('active', lang === 'cz');
    document.getElementById('lang-en-btn').classList.toggle('active', lang === 'en');
    log(`Přepnuto CMS na jazyk: ${lang.toUpperCase()}`, 'success');
    renderDashboard();
    adjustProductFormLanguage();

    if (document.getElementById('view-products').classList.contains('active')) {
        resetProductForm();
        const targetEshopSection = pagesData.find(p => p.type === 'products' && (p.lang || (p.id.endsWith('-en') ? 'en' : 'cz')) === lang);
        openSection(targetEshopSection ? targetEshopSection.id : (lang === 'en' ? 'eshop-products-en' : 'eshop-products-cz'));
    } else if (document.getElementById('view-page-editor').classList.contains('active') && currentActiveItem) {
        const targetId = lang === 'en'
            ? currentActiveItem.id.replace('-cz', '-en')
            : currentActiveItem.id.replace('-en', '-cz');
        if (pagesData.some(p => p.id === targetId)) {
            openSection(targetId);
        }
    }
}

function log(msg, type = '') {
    const terminal = document.getElementById('terminal-log');
    if (!terminal) return;
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
            { "id": "eshop-products-cz", "title": "E-shop Produkty [CZ]", "description": "Správa aktivních produktů, kategorií a cen", "icon": "🛒", "type": "products", "dataFile": "public/data/e-shop.json", "lang": "cz" },
            { "id": "eshop-products-en", "title": "E-shop Products [EN]", "description": "Active products, categories and pricing management", "icon": "🛒", "type": "products", "dataFile": "public/data/e-shop_en.json", "lang": "en" },
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
            const lowerKey = fullKey.toLowerCase();
            const isMediaField = lowerKey.includes('image') || lowerKey.includes('video') || lowerKey.endsWith('img');

            let input;
            if (typeof val === 'string' && val.length > 60 && !isMediaField) {
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

            if (isMediaField) {
                const fileHint = document.createElement('div');
                fileHint.style.fontSize = '12px';
                fileHint.style.color = 'var(--text-muted, #aaa)';
                fileHint.style.marginTop = '4px';
                fileHint.innerHTML = `Nebo nahrát nový soubor: <input type="file" class="page-file-input" data-key-path="${fullKey}" accept="image/*,video/*" style="margin-top: 4px; color: inherit;">`;
                fieldGroup.appendChild(fileHint);
            }

            container.appendChild(fieldGroup);
        }
    });
}

// ==========================================================================
// SPRÁVA KATEGORIÍ E-SHOPU (DYNAMICKÉ KATEGORIE + INLINE EDITACE + SYNCHRONIZACE)
// ==========================================================================
function slugifyCategory(name) {
    return String(name)
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || ('cat-' + Date.now());
}

function getNormalizedCategories(shopJson) {
    if (Array.isArray(shopJson.categories) && shopJson.categories.length > 0) {
        return shopJson.categories;
    }
    return [
        { id: 'cinematic', label: shopJson.catCinematicText || 'Cinematic' },
        { id: 'longrange', label: shopJson.catLongrangeText || 'SPECIAL' },
        { id: 'freestyle', label: shopJson.catFreestyleText || 'Freestyle' }
    ];
}

function renderCategoriesManager() {
    const container = document.getElementById('categories-list');
    const selectEl = document.getElementById('prod-category');

    if (selectEl) {
        const previousVal = selectEl.value;
        selectEl.innerHTML = '';
        categoriesData.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat.id;
            opt.textContent = cat.label;
            selectEl.appendChild(opt);
        });
        if (previousVal && categoriesData.some(c => c.id === previousVal)) {
            selectEl.value = previousVal;
        }
    }

    if (!container) return;
    container.innerHTML = '';

    if (categoriesData.length === 0) {
        container.innerHTML = '<p style="color: var(--text-muted);">Zatím nejsou nastaveny žádné kategorie.</p>';
        return;
    }

    categoriesData.forEach(cat => {
        const usedCount = productsData.filter(p => String(p.category).toLowerCase() === String(cat.id).toLowerCase()).length;
        const card = document.createElement('div');
        card.className = 'item-card';
        card.id = `cat-card-${cat.id}`;
        card.style.padding = '12px 16px';
        card.innerHTML = `
            <div class="item-info" style="flex: 1;">
                <div class="item-thumb" style="width: 38px; height: 38px; font-size: 1rem;">🏷️</div>
                <div class="item-details" style="flex: 1;">
                    <h4 id="cat-title-${escapeHtml(cat.id)}">${escapeHtml(cat.label)}</h4>
                    <div id="cat-edit-box-${escapeHtml(cat.id)}" style="display: none; align-items: center; gap: 10px; margin-bottom: 4px;">
                        <input type="text" id="cat-input-${escapeHtml(cat.id)}" value="${escapeHtml(cat.label)}" style="max-width: 280px; padding: 7px 12px; font-size: 0.9rem;">
                    </div>
                    <p>ID: ${escapeHtml(cat.id)} // Počet produktů: ${usedCount}</p>
                </div>
            </div>
            <div class="item-actions" id="cat-actions-${escapeHtml(cat.id)}">
                <button class="btn-secondary" onclick="startCategoryEdit('${escapeHtml(cat.id)}')" type="button">Přejmenovat</button>
                <button class="btn-delete" onclick="deleteCategory('${escapeHtml(cat.id)}')" type="button">Smazat</button>
            </div>
        `;
        container.appendChild(card);

        const inputEl = card.querySelector(`#cat-input-${CSS.escape(cat.id)}`);
        if (inputEl) {
            inputEl.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    saveCategoryEdit(cat.id);
                } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelCategoryEdit(cat.id);
                }
            });
        }
    });
}

function startCategoryEdit(catId) {
    const titleEl = document.getElementById(`cat-title-${catId}`);
    const editBox = document.getElementById(`cat-edit-box-${catId}`);
    const actionsEl = document.getElementById(`cat-actions-${catId}`);
    const inputEl = document.getElementById(`cat-input-${catId}`);

    if (!titleEl || !editBox || !actionsEl || !inputEl) return;

    titleEl.style.display = 'none';
    editBox.style.display = 'flex';
    actionsEl.innerHTML = `
        <button class="btn-primary" id="cat-save-btn-${escapeHtml(catId)}" onclick="saveCategoryEdit('${escapeHtml(catId)}')" type="button">Uložit</button>
        <button class="btn-secondary" onclick="cancelCategoryEdit('${escapeHtml(catId)}')" type="button">Zrušit</button>
    `;

    inputEl.focus();
    inputEl.select();
}

function cancelCategoryEdit(catId) {
    renderCategoriesManager();
}

async function saveCategoryEdit(catId) {
    const cat = categoriesData.find(c => c.id === catId);
    const inputEl = document.getElementById(`cat-input-${catId}`);
    if (!cat || !inputEl) return;

    const newLabel = inputEl.value.trim();
    if (!newLabel || newLabel === cat.label) {
        renderCategoriesManager();
        return;
    }

    const saveBtn = document.getElementById(`cat-save-btn-${catId}`);
    if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Ukládám...';
    }
    inputEl.disabled = true;

    cat.label = newLabel;

    // Aktualizace popisku u existujících produktů v této kategorii
    productsData.forEach(p => {
        if (String(p.category).toLowerCase() === String(catId).toLowerCase()) {
            p.categoryLabel = cat.label;
        }
    });

    fullShopData.categories = categoriesData;
    fullShopData.products = productsData;

    const itemLang = currentAdminLang;
    const filePath = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';

    await commitFileToGithub(filePath, fullShopData, `CMS: Přejmenována kategorie na "${cat.label}" (${itemLang.toUpperCase()})`);
    renderCategoriesManager();
    renderProductsList();
}

document.getElementById('add-category-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('new-category-name');
    const label = input.value.trim();
    if (!label) return;

    let id = slugifyCategory(label);
    if (categoriesData.some(c => c.id === id)) {
        id = `${id}-${Date.now().toString().slice(-4)}`;
    }

    const btn = document.getElementById('add-category-btn');
    btn.disabled = true;
    btn.textContent = 'Ukládám...';

    const newCat = { id, label };
    categoriesData.push(newCat);
    fullShopData.categories = categoriesData;
    fullShopData.products = productsData;

    const itemLang = currentAdminLang;
    const primaryFile = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';
    const secondaryFile = itemLang === 'en' ? 'public/data/e-shop.json' : 'public/data/e-shop_en.json';

    await commitFileToGithub(primaryFile, fullShopData, `CMS: Přidána kategorie "${label}" (${itemLang.toUpperCase()})`);

    // Automatická synchronizace nové kategorie i do druhého jazykového souboru e-shopu
    try {
        const secRes = await fetch(`../${secondaryFile}?t=${Date.now()}`);
        if (secRes.ok) {
            const secData = await secRes.json();
            const secCats = getNormalizedCategories(secData);
            if (!secCats.some(c => c.id === id)) {
                secCats.push({ id, label });
                secData.categories = secCats;
                await commitFileToGithub(secondaryFile, secData, `CMS: Synchronizována kategorie "${label}"`);
            }
        }
    } catch {
        // Ignorujeme pokud druhý soubor neexistuje
    }

    input.value = '';
    btn.disabled = false;
    btn.textContent = '+ Přidat kategorii';
    renderCategoriesManager();
});

async function deleteCategory(catId) {
    const cat = categoriesData.find(c => c.id === catId);
    if (!cat) return;

    if (categoriesData.length <= 1) {
        log('Chyba: V e-shopu musí zůstat alespoň jedna kategorie.', 'error');
        return;
    }

    if (!confirm(`Opravdu chcete smazat kategorii "${cat.label}"?`)) return;

    categoriesData = categoriesData.filter(c => c.id !== catId);
    fullShopData.categories = categoriesData;
    fullShopData.products = productsData;

    const itemLang = currentAdminLang;
    const primaryFile = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';
    const secondaryFile = itemLang === 'en' ? 'public/data/e-shop.json' : 'public/data/e-shop_en.json';

    await commitFileToGithub(primaryFile, fullShopData, `CMS: Smazána kategorie "${cat.label}" (${itemLang.toUpperCase()})`);

    try {
        const secRes = await fetch(`../${secondaryFile}?t=${Date.now()}`);
        if (secRes.ok) {
            const secData = await secRes.json();
            const secCats = getNormalizedCategories(secData).filter(c => c.id !== catId);
            secData.categories = secCats;
            await commitFileToGithub(secondaryFile, secData, `CMS: Odstraněna kategorie "${cat.label}"`);
        }
    } catch {
        // Ignorujeme pokud druhý soubor neexistuje
    }

    renderCategoriesManager();
}

// ==========================================================================
// OTEVŘENÍ SEKCE V CMS
// ==========================================================================
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

            categoriesData = getNormalizedCategories(fullShopData);
            fullShopData.categories = categoriesData;

            const textsContainer = document.getElementById('shop-texts-dynamic-fields');
            textsContainer.innerHTML = '';

            Object.keys(fullShopData).forEach(key => {
                if (key !== 'products' && key !== 'categories' && typeof fullShopData[key] !== 'object') {
                    const fieldGroup = document.createElement('div');
                    fieldGroup.className = 'field-group';

                    const input = document.createElement('input');
                    input.type = 'text';
                    input.className = 'shop-text-input';
                    input.dataset.key = key;
                    input.value = fullShopData[key] || '';
                    input.placeholder = getFriendlyCmsLabel(key);

                    fieldGroup.appendChild(input);
                    textsContainer.appendChild(fieldGroup);
                }
            });

            renderCategoriesManager();
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

        let rawImg = p.image || 'img/drone.png';
        rawImg = rawImg.replace(/^\.\//, '').replace(/^public\//, '');
        const imgPath = '../public/' + rawImg;

        const formattedPrice = p.price ? p.price.toLocaleString('cs-CZ') : 0;
        const eurPrice = p.eurPrice ? p.eurPrice.toLocaleString('cs-CZ') : Math.round((p.price || 0) / 25);

        const matchedCat = categoriesData.find(c => c.id === p.category);
        const catDisplay = matchedCat ? matchedCat.label : (p.categoryLabel || p.category);

        card.innerHTML = `
            <div class="item-info">
                <img src="${imgPath}" alt="${p.title}" class="item-thumb" style="object-fit: cover;">
                <div class="item-details">
                    <h4>${p.title}</h4>
                    <p>${escapeHtml(catDisplay)} // ${formattedPrice} Kč / ${eurPrice} EUR</p>
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

    const catSelect = document.getElementById('prod-category');
    if (catSelect) {
        if (!categoriesData.some(c => c.id === prod.category) && prod.category) {
            const opt = document.createElement('option');
            opt.value = prod.category;
            opt.textContent = prod.categoryLabel || prod.category;
            catSelect.appendChild(opt);
        }
        catSelect.value = prod.category;
    }

    document.getElementById('prod-tag').value = prod.tag || '';
    document.getElementById('prod-tag-en').value = prod.tagEn || prod.tag || '';
    document.getElementById('prod-desc').value = prod.description || '';
    document.getElementById('prod-desc-en').value = prod.descriptionEn || prod.description || '';

    document.getElementById('prod-image-path').value = prod.image || 'img/drone.png';
    const imgFileInput = document.getElementById('prod-image-file');
    if (imgFileInput) imgFileInput.value = '';

    specsContainer.innerHTML = '';
    if (prod.specs) {
        Object.entries(prod.specs).forEach(([k, v]) => addSpecRow(k, v));
    }

    document.getElementById('product-form-title').textContent = `Upravit produkt: ${prod.title}`;
    document.getElementById('cancel-edit-btn').style.display = 'inline-block';

    const formContainer = document.getElementById('product-form-container');
    formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    log(`Načten k úpravě produkt: ${prod.title}`, 'success');
}

function resetProductForm() {
    document.getElementById('product-form').reset();
    document.getElementById('edit-prod-id').value = '';
    document.getElementById('product-form-title').textContent = 'Přidat nový produkt';
    document.getElementById('cancel-edit-btn').style.display = 'none';
    const imgInput = document.getElementById('prod-image-path');
    if (imgInput) imgInput.value = '';
    const imgFile = document.getElementById('prod-image-file');
    if (imgFile) imgFile.value = '';
    specsContainer.innerHTML = '';
}

document.getElementById('cancel-edit-btn').addEventListener('click', resetProductForm);

async function commitFileToGithub(filePath, contentObject, commitMessage) {
    const { owner, repo, branch } = GITHUB_CONFIG;
    const token = sessionStorage.getItem('sik_cms_token');
    const author = sessionStorage.getItem('sik_cms_display') || 'CMS';

    if (!token || !owner || !repo) {
        log('Upozornění: Relace vypršela. Přihlaste se prosím znovu.', 'error');
        showScreen('login');
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
                message: `[${author}] ${commitMessage}`,
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

async function uploadBinaryFileToGithub(filePath, base64Data, commitMessage) {
    const { owner, repo, branch } = GITHUB_CONFIG;
    const token = sessionStorage.getItem('sik_cms_token');
    const author = sessionStorage.getItem('sik_cms_display') || 'CMS';

    if (!token || !owner || !repo) {
        log('Upozornění: Relace vypršela. Přihlaste se prosím znovu.', 'error');
        showScreen('login');
        return;
    }

    try {
        log(`Získávám SHA pro binární soubor ${filePath}...`);
        const getRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        let sha = '';
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        log(`Nahrávám soubor ${filePath} na GitHub...`);
        const putRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `[${author}] ${commitMessage}`,
                content: base64Data,
                sha: sha || undefined,
                branch: branch
            })
        });

        if (!putRes.ok) throw new Error('Chyba při nahrávání souboru.');
        log(`✓ Soubor ${filePath} úspěšně nahrán na GitHub!`, 'success');
    } catch (err) {
        log(`Chyba při nahrávání souboru: ${err.message}`, 'error');
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

    fullShopData.categories = categoriesData;
    fullShopData.products = productsData;

    const itemLang = currentAdminLang;
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

    for (const fileInput of document.querySelectorAll('.page-file-input')) {
        if (fileInput.files && fileInput.files[0]) {
            const file = fileInput.files[0];
            const keyPath = fileInput.dataset.keyPath;

            let folder = 'public/img/';
            if (file.type.startsWith('video/') || file.name.endsWith('.mp4')) {
                folder = 'public/video/';
            }
            const targetFilePath = folder + file.name;

            const base64Data = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
                reader.readAsDataURL(file);
            });

            log(`Nahrávám soubor ${file.name}...`);
            await uploadBinaryFileToGithub(targetFilePath, base64Data, `CMS: Nahrán soubor ${file.name}`);
            setNestedValue(updatedData, keyPath, 'img/' + file.name);
        }
    }

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
    
    const editProductObj = productsData.find(p => String(p.id) === String(editId));
    let imagePath = editProductObj ? (editProductObj.image || 'img/drone.png') : 'img/drone.png';
    
    const imgFile = document.getElementById('prod-image-file');
    if (imgFile && imgFile.files && imgFile.files[0]) {
        const file = imgFile.files[0];
        let folder = 'public/img/';
        let subFolder = 'img/';
        if (file.type.startsWith('video/') || file.name.endsWith('.mp4')) {
            folder = 'public/video/';
            subFolder = 'video/';
        }
        
        const fullUploadPath = folder + file.name;
        imagePath = subFolder + file.name;

        const base64Data = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
            reader.readAsDataURL(file);
        });

        log(`Nahrávám nový soubor produktu ${file.name}...`);
        await uploadBinaryFileToGithub(fullUploadPath, base64Data, `CMS: Nahrán soubor produktu ${file.name}`);
    }

    const specs = {};
    document.querySelectorAll('.spec-item-row').forEach(row => {
        const k = row.querySelector('.spec-key').value.trim();
        const v = row.querySelector('.spec-val').value.trim();
        if (k && v) specs[k] = v;
    });

    const selectedCat = categoriesData.find(c => c.id === category);
    const categoryLabel = selectedCat ? selectedCat.label : category;

    if (editId) {
        const idx = productsData.findIndex(p => String(p.id) === String(editId));
        if (idx !== -1) {
            productsData[idx] = {
                ...productsData[idx],
                title, price, eurPrice, category, tag, tagEn, description: desc, descriptionEn: descEn, specs,
                categoryLabel,
                image: imagePath
            };
        }
    } else {
        const newProd = {
            id: String(Date.now()),
            title, price, eurPrice, category, tag, tagEn, description: desc, descriptionEn: descEn, specs,
            categoryLabel,
            stock: "skladem",
            image: imagePath
        };
        productsData.push(newProd);
    }

    renderProductsList();

    fullShopData.categories = categoriesData;
    fullShopData.products = productsData;

    const itemLang = currentAdminLang;
    const filePath = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';

    await commitFileToGithub(filePath, fullShopData, `CMS: Uložen produkt ${title} (${itemLang.toUpperCase()})`);
    resetProductForm();
});

async function deleteProduct(id) {
    const prod = productsData.find(p => String(p.id) === String(id));
    if (!confirm(`Opravdu chcete smazat produkt "${prod ? prod.title : id}"?`)) return;

    productsData = productsData.filter(p => String(p.id) !== String(id));
    renderProductsList();

    fullShopData.categories = categoriesData;
    fullShopData.products = productsData;

    const itemLang = currentAdminLang;
    const filePath = itemLang === 'en' ? 'public/data/e-shop_en.json' : 'public/data/e-shop.json';

    await commitFileToGithub(filePath, fullShopData, `CMS: Smazán produkt ${prod ? prod.title : id} (${itemLang.toUpperCase()})`);
}

bootCmsAuth();

const cmsFieldLabels = {
    "mainTitle": "Hlavní nadpis e-shopu",
    "mainSubtitle": "Podnadpis e-shopu",
    "filterBtnHideText": "Text tlačítka pro skrytí filtrů",
    "filterBtnShowText": "Text tlačítka pro zobrazení filtrů",
    "sortRecommended": "Text řazení: Doporučené",
    "sortPriceAsc": "Text řazení: Nejnižší > Nejvyšší",
    "sortPriceDesc": "Text řazení: Nejvyšší > Nejvyšší",
    "resetAllFiltersText": "Tlačítko: Resetovat všechny filtry",
    "captionCategories": "Nadpis sekce: Kategorie",
    "catAllText": "Kategorie: Všechny",
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
    "modalSpecsHeading": "Detail produktu: Nadpis specifikací",
    "modalButtonText": "Detail produktu: Text tlačítka poptávky",

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
