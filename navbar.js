/**
 * Genera e stampa la barra di navigazione principale.
 * Mostra link diversi se l'utente è loggato o meno.
 */
async function printNavBar() {
    const basePath = '../images/';
    const logoIcon = `${basePath}logo.png`;
    const navbarContainer = document.getElementById('menu');
    let HTML_code;

    // Inizio navbar: logo e menu mobile sempre presenti
    HTML_code = `
        <nav class="navbar navbar-expand-lg">
            <div class="container-fluid px-2" id="NavigationBar">
                <!-- Brand/logo -->
                <a class="navbar-brand" href="/">
                    <img src="${logoIcon}" alt="Logo" class="logo nav-logo">
                </a>
                <!-- Hamburger menu per mobile -->
                <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
                    <span class="navbar-toggler-icon"></span>
                </button>
                <!-- Link di navigazione -->
                <div class="collapse navbar-collapse" id="navbarNav">
                    <ul class="navbar-nav ms-auto">
                        <li class="nav-item">
                            <a class="nav-link border-link" href="/card">Find superhero</a>
                        </li>`;

    // Se loggato, mostra funzionalità utente
    if (checkUserLogged()) {
        HTML_code += `
            <li class="nav-item">
                <a class="nav-link border-link" href="/album">Album</a>
            </li>
            <li class="nav-item">
                <a class="nav-link border-link" href="/exchange">Exchange</a>
            </li>
            <li class="nav-item">
                <a class="nav-link border-link" href="/package">Packages</a>
            </li>
            <li class="nav-item">
                <a class="nav-link border-link" href="/get-credits"> Credits:<span class="current_credits">${await get_credits()}</span></a>
            </li>
            <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle" href="#" id="userdropdown" role="button" data-bs-toggle="dropdown">
                    <i alt="user icon" class="fas fa-user"></i> ${localStorage.getItem("username") || ""}
                </a>
                <ul class="dropdown-menu">
                    <li><a class="dropdown-item" href="/user"><i class="fas fa-address-card"></i> User profile</a></li>
                    <li><a class="dropdown-item" role="button" onclick="logout()"><i class="fas fa-right-from-bracket"></i> Logout</a></li>
                </ul>
            </li>`;
    } else {
        // Se non loggato, mostra link login che apre la modale
        HTML_code += `
            <li class="nav-item">
                <a id="login_Link" data-bs-toggle="modal" data-bs-target="#loginModal" class="nav-link">Login</a>
            </li>`;
        // Inserisce la modale login (caricata da /login)
        try {
            const response = await fetch('/login');
            const text = await response.text();
            HTML_code += text;
        } catch (error) {
            console.error('Error fetching login modal:', error);
        }
    }

    // Chiude i tag della navbar
    HTML_code += `
                    </ul>
                </div>
            </div>
        </nav>`;
    navbarContainer.innerHTML = HTML_code;
    adaptNavbar();
}

/**
 * Adatta la navbar al tema corrente (chiaro/scuro).
 */
function adaptNavbar() {
    const navbar = document.querySelector('.navbar');
    if (document.querySelector("html").getAttribute("data-bs-theme") === "dark") {
        navbar.classList.remove('navbar-light', 'bg-light');
        navbar.classList.add('navbar-dark', 'bg-dark');
    } else {
        navbar.classList.remove('navbar-dark', 'bg-dark');
        navbar.classList.add('navbar-light', 'bg-light');
    }
}

/**
 * Carica HTML per login modal (non usato attivamente).
 */
async function loadHTML() {
    fetch('/login')
        .then(response => response.text())
        .then(data => {
            htmlContent = data;
        });
}

// Stampa la navbar su tutte le pagine tranne quella user
if (!['/user'].includes(window.location.pathname)) {
    window.addEventListener('load', () => {
        printNavBar().catch(error => {
            console.error("Failed to load navbar:", error);
        });
    });
}

/**
 * Verifica se l'utente è loggato tramite localStorage.
 * Se non loggato e richiesto da una pagina protetta, reindirizza alla home.
 * @returns {boolean} true se loggato, false altrimenti.
 */
function checkUserLogged() {
    const id = localStorage.getItem("_id");
    const email = localStorage.getItem("email");
    const username = localStorage.getItem("username");
    if (email && username && id) {
        return true;
    } else {
        // Se non loggato, su pagine protette redirect a home
        if (
            ['/album', '/get-credits', '/package', '/exchange', '/user', '/sell_cards', '/create_exchanges'].includes(window.location.pathname)
        ) {
            window.location.href = '/';
        }
        return false;
    }
}

/**
 * Funzione di logout: cancella dati utente e torna alla home.
 */
function logout() {
    localStorage.clear();
    window.location.href = '/';
}

// Adatta la navbar ai cambi di tema di sistema (chiaro/scuro)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adaptNavbar);

/**
 * Aggiorna tutte le istanze del contatore di crediti nella pagina.
 */
async function printCredits() {
    const elements = document.getElementsByClassName('current_credits');
    const credits = await get_credits();
    Array.from(elements).forEach(element => {
        element.textContent = credits;
    });
}

/**
 * Ottiene il numero di crediti dell'utente loggato via API.
 * @returns {Promise<number|string>}
 */
async function get_credits() {
    return await fetch(`/print-credits/${localStorage.getItem("username")}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        },
    })
        .then(response => response.json())
        .then(response => response.credits);
}
