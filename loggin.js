// Import delle utility per validazione e hashing password
import { getMD5, isValidString, isValidPassword, isValidEmail } from "./utils.js";
// Funzione per controllare le credenziali utente dal database
import { check_user_credentials } from "./database.js";

/**
 * Gestisce la richiesta di login utente.
 *
 * - Controlla la presenza dei parametri necessari.
 * - Valida formato username/email e password.
 * - Effettua hash della password con MD5.
 * - Se le credenziali sono corrette, restituisce i dati utente (senza password).
 *
 * @param {Object} req - Oggetto request di Express (deve contenere body con username/email e password).
 * @param {Object} res - Oggetto response di Express per inviare la risposta.
 */
export async function login(req, res) {
    let login = req.body;

    // Controllo parametri obbligatori
    if (login.email === undefined && login.username === undefined) {
        res.status(400).send("Missing Parameter");
        return;
    }
    if (login.password === undefined) {
        res.status(400).send("Missing Parameter");
        return;
    }

    // Valida email o username
    if (!isValidEmail(login.email) && !isValidString(login.username)) {
        res.status(400).send("Invalid username or Email");
        return;
    }

    // Valida password (formato e contenuto)
    if (!isValidString(login.password) || !isValidPassword(login.password)) {
        res.status(400).send("Password is invalid");
        return;
    }

    // Effettua hash della password per il confronto con il DB
    login.password = getMD5(login.password);

    try {
        // Verifica credenziali nel database
        let loggedUser = await check_user_credentials(login);
        if (loggedUser == null) {
            res.status(401).send("Unauthorized");
            return;
        } else {
            // Login riuscito: restituisce dati essenziali dell'utente
            res.json({
                _id: loggedUser._id,
                username: loggedUser.username,
                email: loggedUser.email,
                name: loggedUser.name,
                credits: loggedUser.credits
            });
            return;
        }
    } catch (e) {
        // Gestione errori generici
        res.status(500).send("An error has occurred. Try again later");
        return;
    }
}
