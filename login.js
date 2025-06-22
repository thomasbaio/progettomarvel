/**
 * Gestisce il processo di login per l'utente.
 *
 * - Valida i campi di input.
 * - Esegue una richiesta POST al server per autenticare l'utente.
 * - Se il login ha successo, salva le informazioni dell'utente nel localStorage e mostra un messaggio di successo.
 * - In caso di errore mostra un messaggio di errore.
 */
function login() {
    if (!validateForm()) return;

    // Recupera i valori dagli input
    const usernameOrEmail = document.getElementById('usernameOrEmail');
    const password = document.getElementById('password');
    const data = {
        email: usernameOrEmail.value,    // Il backend accetta sia email che username
        username: usernameOrEmail.value,
        password: password.value
    };

    // Contenitore per messaggi di feedback
    let container = document.getElementsByClassName('resultContainer')[0];
    container.innerHTML = "";

    // Invio richiesta POST per autenticazione
    fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    })
    .then(response => {
        if (response.ok) {
            response.json().then(responseData => {
                container.innerHTML += `
                    <div class="alert alert-success" role="alert" aria-hidden="true">
                        <h4 class="alert-heading">Successfully logged in!</h4>
                    </div>`;
                // Salva dati utente in localStorage
                localStorage.setItem("_id", responseData._id);
                localStorage.setItem("email", responseData.email);
                localStorage.setItem("username", responseData.username);
                localStorage.setItem("name", responseData.name);
                localStorage.setItem("credits", responseData.credits);
                // Redirect alla home dopo breve pausa
                setTimeout(() => { window.location.href = '/' }, 1000);
            });
        } else {
            container.innerHTML += `
                <div class="alert alert-danger" role="alert" aria-hidden="true">
                    <h4 class="alert-heading">Failed to log in! Check your credentials</h4>
                </div>`;
        }
    })
    .catch(error => {
        // Gestione errore di rete o imprevisto
        container.innerHTML += `
            <div class="alert alert-danger" role="alert" aria-hidden="true">
                <h4 class="alert-heading">An error occurred! Please try again later.</h4>
            </div>`;
        console.error("Login error:", error);
    });
}

/**
 * Valida l'input dell'utente per il login.
 *
 * - Controlla che username/email e password siano validi.
 * - Evidenzia i campi errati e mostra un messaggio di errore.
 *
 * @returns {boolean} true se valido, false altrimenti.
 */
function validateForm() {
    const usernameOrEmail = document.getElementById('usernameOrEmail');
    const password = document.getElementById('password');
    // Rimuove eventuali errori precedenti
    usernameOrEmail.classList.remove('border', 'border-danger');
    password.classList.remove('border', 'border-danger');

    // RegEx per validare l'email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isValidEmail = emailRegex.test(usernameOrEmail.value);

    // Valida username/email: può essere una email valida OPPURE uno username di 4-16 caratteri
    if (
        (!isValidEmail && (
            !usernameOrEmail.value ||
            usernameOrEmail.value.length < 4 ||
            usernameOrEmail.value.length > 16
        ))
    ) {
        usernameOrEmail.classList.add('border', 'border-danger');
        alert("Username or Email is not valid! (Username: 4-16 chars, Email: correct format)");
        return false;
    }

    // Valida la password: almeno 7 caratteri
    if (!password.value || password.value.length < 7) {
        password.classList.add('border', 'border-danger');
        alert("Password must have at least 7 characters!");
        return false;
    }

    return true;
}
