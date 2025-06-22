/**
 * Funzione per generare il footer della pagina.
 * Popola l'elemento con id "footer" con loghi e una breve descrizione.
 */
async function generateFooter() {
    // Recupera l'elemento con id "footer" dalla pagina
    const footerElement = document.getElementById("footer");

    // Inserisce il codice HTML del footer
    footerElement.innerHTML = `
        <div style="text-align: center; padding: 10px;">
            <p class="footer-p" style="margin-bottom: 8px;">Powered By</p>
            <!-- Logo Marvel -->
            <img src="../images/marvel.png" alt="Marvel Logo" style="width: 100px; height: auto; margin: 10px;">
            <!-- Logo Node.js -->
            <img src="../images/nodejs.png" alt="Node.js Logo" style="width: 50px; height: auto; margin: 10px;">
            <!-- Logo Express -->
            <img src="../images/express.png" alt="Express Logo" style="width: 70px; height: auto; margin: 10px;">
            <!-- Logo MongoDB -->
            <img src="../images/mongo.png" alt="MongoDB Logo" style="width: 70px; height: auto; margin: 10px;">
        </div>
    `;
}

// Avvia la generazione del footer quando il modulo è caricato
generateFooter();
