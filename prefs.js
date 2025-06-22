/**
 * Carica le variabili d'ambiente dal file .env.
 * Questo permette di mantenere le chiavi e le configurazioni sensibili fuori dal codice sorgente.
 */
const dotenv = require('dotenv');
dotenv.config();

/**
 * Oggetto di configurazione per l'API Marvel.
 * Contiene le variabili per autenticazione e endpoint Marvel.
 * @typedef {Object} MarvelConfig
 * @property {string} base_url - URL base per le API Marvel
 * @property {string} public_key - Chiave pubblica per autenticazione Marvel
 * @property {string} private_key - Chiave privata per autenticazione Marvel
 */
const marvel = {
    base_url: process.env.BASE_URL,
    public_key: process.env.PUBLIC_KEY,
    private_key: process.env.PRIVATE_KEY,
};

/**
 * Oggetto di configurazione principale per il server NodeJS.
 * @type {Object}
 * @property {string} host - Indirizzo host da variabili d'ambiente
 * @property {string} port - Numero di porta da variabili d'ambiente
 */
const config = {
    host: process.env.HOST,
    port: process.env.PORT,
};

// Esporta le configurazioni per l'uso in altri moduli
module.exports = { marvel, config };
