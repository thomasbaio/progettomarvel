/**
 * Componente per la selezione e ricerca di un supereroe tramite API Marvel.
 * Gestisce dropdown dinamico, validazione, selezione e popolamento automatico dei dati.
 */
class SearchableSelect {
    constructor(config) {
        this.apiUrl = config.apiUrl;
        this.resultsDropdown = document.getElementById('resultsDropdown');
        this.searchResults = document.getElementById('searchResults');
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.selectedValue = document.getElementById('selected_Superhero');
        this.searchInput = document.getElementById('select_superhero');
        this.debounceTimeout = null;
        this.minChars = config.minChars || 4;
        this.init();
    }

    init() {
        // Listener su input per ricerca (debounced)
        this.searchInput.addEventListener('input', () => {
            clearTimeout(this.debounceTimeout);
            this.debounceTimeout = setTimeout(() => {
                const query = this.searchInput.value.trim();
                if (query.length >= this.minChars) {
                    this.performSearch(query);
                } else {
                    this.hideResults();
                }
            }, 300);
        });

        // Chiudi dropdown su click fuori
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) &&
                !this.resultsDropdown.contains(e.target)) {
                this.hideResults();
            }
        });

        // Mostra dropdown su focus se ci sono risultati
        this.searchInput.addEventListener('focus', () => {
            if (this.searchResults.children.length > 0) {
                this.showResults();
            }
        });
    }

    async performSearch(query) {
        try {
            this.showLoading();
            // Prepara query per Marvel API
            query = "nameStartsWith=" + query + "&orderBy=name&";
            await getMarvelCarachters(query).then(async response => {
                // Filtra risultati se sei nella pagina di scambio e la carta è già posseduta
                if (window.location.pathname === '/create_exchange') {
                    const user_Id = localStorage.getItem("_id");
                    const album_ID = localStorage.getItem("album_ID");
                    if (user_Id && album_ID) {
                        const filteredData = [];
                        for (const character of response.data) {
                            try {
                                const checkResponse = await fetch('/check_card_album', {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        user_Id: user_Id,
                                        album_Id: album_ID,
                                        card_Id: character.id
                                    })
                                });
                                const result = await checkResponse.json();
                                if (result.length < 1) {
                                    filteredData.push(character);
                                }
                            } catch (err) {
                                console.error('Error checking card:', err);
                            }
                        }
                        response.data = filteredData;
                    }
                }
                this.displayResults(response.data);
                if (response.code != 200) {
                    throw new Error('Network response was not ok' + response.code);
                }
            })
            .catch(error => {
                console.error('Error fetching data:', error);
                this.displayError('Error fetching results');
            });
        } catch (error) {
            console.error('Error fetching data:', error);
            this.displayError('Error fetching results');
        } finally {
            this.hideLoading();
        }
    }

    displayResults(data) {
        this.searchResults.innerHTML = '';
        if (!data || data.length === 0) {
            const noResults = document.createElement('li');
            noResults.className = 'search-item text-muted';
            noResults.textContent = 'No valid results found';
            this.searchResults.appendChild(noResults);
        } else {
            data.forEach(item => {
                const li = document.createElement('li');
                li.className = 'search-item';
                li.textContent = item.name;
                li.dataset.value = item.id;
                li.addEventListener('click', () => {
                    this.selectItem(item);
                });
                this.searchResults.appendChild(li);
            });
        }
        this.showResults();
    }

    async selectItem(item) {
        this.selectedValue.value = item.id;
        this.searchInput.value = item.name;
        this.hideResults();

        // Trigger custom event
        const event = new CustomEvent('item-selected', { detail: item });
        this.searchInput.dispatchEvent(event);

        // Se sei su /card mostra dettagli del supereroe
        if (['/card'].includes(window.location.pathname)) {
            document.getElementById('character_details').innerHTML = ``;
            var Div_Car =
                '<div class="card card-shine-effect-metal" id="char-' + item.id + '">' +
                    '<div class="card-header">' + item.name + '</div>' +
                    '<div class="card-content">' +
                        '<img src="' + item.thumbnail.path.replace(/"/g, "") + '.' + item.thumbnail.extension + '">' +
                    '</div>' +
                    '<div class="card-body">' + item.description + '</div>' +
                    '<div class="card-footer">Data provided by ©Marvel</div>' +
                '</div>';
            document.getElementById("CardContainer").innerHTML = Div_Car;
            // Se l'utente è loggato e ha l'album, mostra dettagli extra se possiede la carta
            var user_Id = localStorage.getItem("_id");
            var album_ID = localStorage.getItem("album_ID");
            if (!user_Id || !album_ID) return;
            try {
                const response = await fetch('/check_card_album', {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        user_Id: user_Id,
                        album_Id: album_ID,
                        card_Id: item.id
                    })
                });
                if (!response.ok) throw new Error("Autenticazione non valida");
                const userData = await response.json();
                if (userData.length > 0) {
                    const character_details = document.getElementById('character_details');
                    let seriesHtml = "", eventsHtml = "", comicsHtml = "";
                    if (item.series.available > 0) {
                        seriesHtml = '<hr><h3>Series:</h3><br>';
                        for (let series of item.series.items) {
                            seriesHtml += `<p>${series.name}</p>`;
                        }
                    }
                    if (item.events.available > 0) {
                        eventsHtml = '<hr><h3>Events:</h3>';
                        for (let events of item.events.items) {
                            eventsHtml += `<p>${events.name}</p>`;
                        }
                    }
                    if (item.comics.available > 0) {
                        comicsHtml = '<hr><h3>Comics:</h3>';
                        for (let comic of item.comics.items) {
                            comicsHtml += `<p>${comic.name}</p>`;
                        }
                    }
                    character_details.innerHTML = seriesHtml + eventsHtml + comicsHtml;
                }
            } catch (error) {
                console.error("Errore!", error);
                return "ERR";
            }
        }
    }

    displayError(message) {
        this.searchResults.innerHTML = `
            <li class="search-item text-danger">${message}</li>
        `;
        this.showResults();
    }

    showResults() {
        this.resultsDropdown.classList.add('show');
    }

    hideResults() {
        this.resultsDropdown.classList.remove('show');
    }

    showLoading() {
        this.loadingIndicator.classList.remove('d-none');
    }

    hideLoading() {
        this.loadingIndicator.classList.add('d-none');
    }

    /**
     * Imposta il supereroe selezionato dato l'id (es. per popolamento profilo).
     * @param {string|number} id
     */
    async setSuperheroById(id) {
        try {
            this.showLoading();
            const response = await getSingleHero(id);
            if (response.data && response.data.length > 0) {
                const hero = response.data[0];
                this.selectItem(hero);
            } else {
                this.displayError('Superhero not found');
            }
        } catch (error) {
            console.error('Error fetching superhero:', error);
            this.displayError('Error loading superhero');
        } finally {
            this.hideLoading();
        }
    }
}

// Inizializza il SearchableSelect
const searchSelect = new SearchableSelect({
    minChars: 4 // Caratteri minimi per la ricerca
});

// Listener per la selezione (puoi gestire eventuale logica extra qui)
document.getElementById('select_superhero').addEventListener('item-selected', (e) => {
    // Custom logic se serve
});

/**
 * Gestisce la registrazione utente dopo la validazione client-side.
 */
async function register() {
    var email = document.getElementById('email');
    var username = document.getElementById('username');
    var password1 = document.getElementById('password1');
    var password2 = document.getElementById('password2');
    var name = document.getElementById('name');
    var surname = document.getElementById('surname');
    var date_of_birth = document.getElementById('date_of_birth');
    var selected_Superhero = document.getElementById("selected_Superhero");
    var superhero_selection = document.getElementById("select_superhero");

    // Validazione passowrd
    if (password1.value != password2.value || password1.value.length < 7) {
        password1.classList.add('border', 'border-danger');
        password2.classList.add('border', 'border-danger');
        alert("The password must be at least 7 characters long and match the confirmation!");
        return;
    } else {
        password1.classList.remove('border', 'border-danger');
        password2.classList.remove('border', 'border-danger');
    }

    // Validazione data di nascita
    var dataPattern = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!dataPattern.test(date_of_birth.value)) {
        date_of_birth.classList.add('border', 'border-danger');
        alert("The date of birth must be in the format YYYY-MM-DD!");
        return;
    } else {
        date_of_birth.classList.remove('border', 'border-danger');
    }

    // Validazione email
    var emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    if (!emailPattern.test(email.value)) {
        email.classList.add('border', 'border-danger');
        alert("Insert a valid email address!");
        return;
    } else {
        email.classList.remove('border', 'border-danger');
    }

    // Validazione username
    var usermanePattern = /^[a-zA-Z0-9_]{4,16}$/;
    if (!usermanePattern.test(username.value)) {
        username.classList.add('border', 'border-danger');
        alert("The username must be between 4 and 16 characters long and contain only letters, numbers and underscores!");
        return;
    } else {
        username.classList.remove('border', 'border-danger');
    }

    // Nome
    if (!name.value) {
        name.classList.add('border', 'border-danger');
        alert("Insert your name!");
        return;
    } else {
        name.classList.remove('border', 'border-danger');
    }

    // Cognome
    if (!surname.value) {
        surname.classList.add('border', 'border-danger');
        alert("Insert your surname!");
        return;
    } else {
        surname.classList.remove('border', 'border-danger');
    }

    // Supereroe selezionato
    if (!selected_Superhero.value) {
        superhero_selection.classList.add('border', 'border-danger');
        alert("Select a superhero!");
        return;
    } else {
        superhero_selection.classList.remove('border', 'border-danger');
    }

    var data = {
        name: name.value,
        username: username.value,
        surname: surname.value,
        email: email.value,
        password: password1.value,
        date: date_of_birth.value,
        superhero: selected_Superhero.value,
        credits: 0.0
    };

    const button = document.querySelector('button');
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Registrazione...';

    try {
        const response = await fetch('/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        if (!response.ok) {
            const result = await response.json();
            if (response.status == 530) {
                throw new Error(result.message || "Username or email already in use");
            } else {
                throw new Error(result.message);
            }
        }

        // Pulisce il localStorage per sicurezza
        localStorage.clear();

        // Mostra la modal login e reindirizza a home dopo chiusura
        var loginModal = document.getElementById('loginModal');
        loginModal.addEventListener('hidden.bs.modal', function () {
            window.location.href = '/';
        });
        alert("User registered successfully! You can now log in.");
        loginModal = new bootstrap.Modal(document.getElementById('loginModal'));
        loginModal.show();

    } catch (error) {
        button.disabled = false;
        button.innerHTML = 'Register';
        alert('Registration failed. Please try again. ' + error.message);
        console.error('Registration failed:', error);
        document.getElementById('error-message').textContent =
            'Registration failed. Please try again.';
    }
}

/**
 * Popola i dati profilo utente su pagina profilo.
 */
async function populateUserProfile() {
    var email = localStorage.getItem("email");
    var username = localStorage.getItem("username");
    var _id = localStorage.getItem("_id");
    if (!email || !username || !_id) {
        console.error("Missing required user data in localStorage");
        return;
    }
    try {
        const response = await fetch('/get_user_data', {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: email, username: username, _id: _id })
        });
        if (!response.ok) throw new Error("Autenticazione non valida");
        const userData = await response.json();
        document.getElementById("username").value = userData.username;
        document.getElementById("email").value = userData.email;
        document.getElementById("name").value = userData.name;
        document.getElementById("surname").value = userData.surname;
        const selectElement = document.getElementById('selected_Superhero');
        if (selectElement) {
            selectElement.value = userData.superhero;
            try {
                const heroResponse = await getSingleHero(userData.superhero);
                const searchInput = document.getElementById('select_superhero');
                if (!heroResponse) throw new Error('No response from hero fetch');
                if (heroResponse.data && heroResponse.data.length > 0) {
                    const hero = heroResponse.data[0];
                    searchInput.value = hero.name;
                } else {
                    searchInput.value = "Superhero not found";
                }
            } catch (error) {
                searchInput.value = "Error loading superhero";
            }
        }
        document.getElementById("date_of_birth").value = userData.date;
    } catch (error) {
        console.error("Errore!", error);
        return "ERR";
    }
}

/**
 * Aggiorna dati utente sul profilo.
 */
async function updateUser() {
    var email = document.getElementById('email');
    var username = document.getElementById('username');
    var password1 = document.getElementById('password1');
    var password2 = document.getElementById('password2');
    var name = document.getElementById('name');
    var surname = document.getElementById('surname');
    var date_of_birth = document.getElementById('date_of_birth');
    var selected_Superhero = document.getElementById("selected_Superhero");
    var superhero_selection = document.getElementById("select_superhero");

    // Validazione password solo se inserita
    if ((password1.value != password2.value || password1.value.length < 7) && password1.value) {
        password1.classList.add('border', 'border-danger');
        password2.classList.add('border', 'border-danger');
        alert("The password must be at least 7 characters long and match the confirmation!");
        return;
    } else {
        password1.classList.remove('border', 'border-danger');
        password2.classList.remove('border', 'border-danger');
    }

    // Validazione data di nascita
    var dataPattern = /^\d{4}-(0[1-9]|1[012])-(0[1-9]|[12][0-9]|3[01])$/;
    if (!dataPattern.test(date_of_birth.value)) {
        date_of_birth.classList.add('border', 'border-danger');
        alert("The date of birth must be in the format YYYY-MM-DD!");
        return;
    } else {
        date_of_birth.classList.remove('border', 'border-danger');
    }

    // Validazione email
    var emailPattern = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    if (!emailPattern.test(email.value)) {
        email.classList.add('border', 'border-danger');
        alert("Insert a valid email address!");
        return;
    } else {
        email.classList.remove('border', 'border-danger');
    }

    // Validazione username
    var usermanePattern = /^[a-zA-Z0-9_]{4,16}$/;
    if (!usermanePattern.test(username.value)) {
        username.classList.add('border', 'border-danger');
        alert("The username must be between 4 and 16 characters long and contain only letters, numbers and underscores!");
        return;
    } else {
        username.classList.remove('border', 'border-danger');
    }

    // Nome
    if (!name.value) {
        name.classList.add('border', 'border-danger');
        alert("Insert your name!");
        return;
    } else {
        name.classList.remove('border', 'border-danger');
    }

    // Cognome
    if (!surname.value) {
        surname.classList.add('border', 'border-danger');
        alert("Insert your surname!");
        return;
    } else {
        surname.classList.remove('border', 'border-danger');
    }

    // Supereroe selezionato
    if (!selected_Superhero.value) {
        superhero_selection.classList.add('border', 'border-danger');
        alert("Select a superhero!");
        return;
    } else {
        superhero_selection.classList.remove('border', 'border-danger');
    }

    var data = {
        name: name.value,
        _id: localStorage.getItem("_id"),
        username: username.value,
        password: password1.value,
        surname: surname.value,
        email: email.value,
        date: date_of_birth.value,
        superhero: selected_Superhero.value
    };

    const button = document.querySelector('button');
    button.disabled = true;
    button.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Registrazione...';

    try {
        const response = await fetch('/update-user', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify(data),
            credentials: 'include'
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message);
        }

        // Aggiorna localStorage
        localStorage.setItem("email", data.email);
        localStorage.setItem("username", data.username);
        localStorage.setItem("name", data.name);
        alert("User update successfully! ");
        window.location.reload();
        return;
    } catch (error) {
        button.disabled = false;
        button.innerHTML = 'Register';
        alert('Update failed. Please try again. ' + error.message);
        console.error('Update failed:', error);
        document.getElementById('error-message').textContent =
            'Update failed. Please try again.';
    }
}

/**
 * Cancella l'utente loggato.
 */
async function deleteUser() {
    var _id = localStorage.getItem("_id");
    try {
        const response = await fetch(`../delete-user/${_id}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        alert("User successfully deleted. Now you will return to homepage");
        localStorage.clear();
        window.location.href = '/';
    } catch (error) {
        console.error("Errore!", error);
        return "ERR";
    }
}
