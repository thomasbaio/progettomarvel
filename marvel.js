/**
 * Funzioni per la gestione delle operazioni Marvel: recupero personaggi, pacchetti, carte album,
 * duplicati, creazione album, gestione scambi ecc.
 * Tutte le funzioni sono commentate per facilitare manutenzione e debug.
 */

/**
 * Ottiene personaggi Marvel filtrati per query.
 * @param {string} query
 * @returns {Promise<Array|Object>} Risposta JSON dei personaggi Marvel
 */
async function getMarvelCarachters(query) {
    return await fetch(`../characters?query=${query}`, {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .catch(error => console.error(error));
}

/**
 * Richiede un nuovo pacchetto di carte Marvel (5 carte).
 * @returns {Promise<Array|Object>} Risposta JSON con dettagli delle carte del pacchetto.
 */
async function getPackage() {
    return await fetch('../package', {
        method: 'POST',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: localStorage.getItem("username"),
            album_id: localStorage.getItem("album_ID"),
            user_id: localStorage.getItem("_id"),
            cards: 5
        })
    })
    .then(response => response.json())
    .catch(error => console.error(error));
}

/**
 * Ottiene tutte le carte di un album specifico dall'API.
 * @param {string} albumID
 * @returns {Promise<Array|Object>}
 */
async function getAlbumcardsDB(albumID) {
    return await fetch(`/albums_cards/${albumID}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .catch(error => console.error(error));
}

/**
 * Ottiene le carte duplicate di un album (presenti almeno 2 volte).
 * @param {string} albumID
 * @returns {Promise<Array|Object>}
 */
async function getDuplicatedAlbumcardsDB(albumID) {
    return await fetch(`/albums_duplicated_cards/${albumID}`, {
        method: 'GET',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .catch(error => console.error(error));
}

/**
 * Stampa le carte ottenute da un pacchetto, una card ogni colonna, 3 colonne per riga.
 */
async function printPackage() {
    await getPackage()
    .then(response => {
        printCredits();
        let i = 0;
        let Div_Car = `<div class="row"><div class="col-md-12 text-center">`;
        response.forEach(item => {
            if (i % 3 == 0 && i !== 0) {
                Div_Car += `</div></div><div class="row"><div class="col-md-12 text-center">`;
            }
            Div_Car +=
                '<div class="card card-shine-effect-metal" id="char-' + item.data.results[0].id + '">' +
                    '<div class="card-header">' + item.data.results[0].name + '</div>' +
                    '<div class="card-content">' +
                        '<img src="' + item.data.results[0].thumbnail.path.replace(/"/g, "") + '.' + item.data.results[0].thumbnail.extension + '">' +
                    '</div>' +
                    '<div class="card-body">' + item.data.results[0].description + '</div>' +
                    '<div class="card-footer">' + item.attributionText + '</div>' +
                '</div>';
            i++;
        });
        Div_Car += `</div></div>
                <button onclick=window.location.reload(); class="btn btn-block btn-success w-100">OK</button>`;
        document.getElementById("pack_cards").innerHTML = Div_Car;
    })
    .catch(response => console.error("Calculation error!" + response));
}

/**
 * Stampa tutte le carte dell'album corrente, con link per dettagli.
 * @param {string} albumId
 */
async function printAlbumCards(albumId) {
    document.getElementById("pack_cards").innerHTML = '<i class="fas fa-spinner fa-spin fa-3x"></i>';
    await getAlbumcardsDB(albumId)
    .then(response => {
        let i = 0;
        let Div_Car = `<div class="row"><div class="col-md-12 text-center">`;
        response.forEach(item => {
            if (i % 3 == 0 && i !== 0) {
                Div_Car += `</div></div><div class="row"><div class="col-md-12 text-center">`;
            }
            Div_Car +=
                ' <a href="/card" onclick=localStorage.setItem("heroId","' + item.marvel_data.data[0].id + '")>' +
                '<div class="card card-shine-effect-metal" id="char-' + item.marvel_data.data[0].id + '">' +
                    '<div class="card-header">' + item.marvel_data.data[0].name + '</div>' +
                    '<div class="card-content">' +
                        '<img src="' + item.marvel_data.data[0].thumbnail.path.replace(/"/g, "") + '.' + item.marvel_data.data[0].thumbnail.extension + '">' +
                    '</div>' +
                    '<div class="card-body">' + item.marvel_data.data[0].description + '</div>' +
                    '<div class="card-footer">Data provided by ©Marvel</div>' +
                '</div></a>';
            i++;
        });
        Div_Car += `</div></div>`;
        document.getElementById("pack_cards").innerHTML = Div_Car;
        document.getElementById("pack_cards").classList.remove("hidden");
    })
    .catch(response => console.error("Calculation error!" + response));
}

/**
 * Rimuove una carta (vendita): invia richiesta DELETE e ricarica la pagina.
 * @param {number|string} cardId
 */
async function removeCard(cardId) {
    const albumId = localStorage.getItem("album_ID");
    const username = localStorage.getItem("username");
    const user_id = localStorage.getItem("_id");
    if (confirm('Are you sure you want to sell this card?')) {
        fetch('/sell_card', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                card_id: cardId,
                album_id: albumId,
                username: username,
                user_id: user_id
            })
        })
        .then(() => window.location.reload());
    }
}

/**
 * Stampa solo le carte duplicate dell'album.
 * Permette di selezionare/vendere/scambiare le carte in base alla pagina corrente.
 * @param {string} albumId
 */
async function printDuplicatedAlbumCards(albumId) {
    document.getElementById("pack_cards").innerHTML = '<i class="fas fa-spinner fa-spin fa-3x"></i>';
    let action = ``;
    const pathname = window.location.pathname;
    if (['/sell_cards'].includes(pathname)) {
        action = `<a onclick="removeCard(`;
    } else if (['/create_exchange'].includes(pathname)) {
        action = `<a onclick="toggletoExchange(`;
    } else {
        action = `<a onclick="alert(`;
    }
    await getDuplicatedAlbumcardsDB(albumId)
    .then(response => {
        let i = 0;
        if (response.length > 0) {
            let Div_Car = `<div class="row"><div class="col-md-12 text-center">`;
            response.forEach(item => {
                if (i % 3 == 0 && i !== 0) {
                    Div_Car += `</div></div><div class="row"><div class="col-md-12 text-center">`;
                }
                Div_Car += action + item.marvel_data.data[0].id + `)">` +
                    `<div class="card card-shine-effect-metal" id="char-` + item.marvel_data.data[0].id + `">` +
                        `<div class="card-header">` + item.marvel_data.data[0].name + `</div>` +
                        `<div class="card-content">` +
                            `<img src="` + item.marvel_data.data[0].thumbnail.path.replace(/"/g, "") + `.` + item.marvel_data.data[0].thumbnail.extension + `">` +
                        `</div>` +
                        `<div class="card-body">` + item.marvel_data.data[0].description + `</div>` +
                        `<div class="card-footer">Data provided by ©Marvel</div>` +
                    `</div></a>`;
                i++;
            });
            Div_Car += `</div></div>`;
            document.getElementById("pack_cards").innerHTML = Div_Car;
            document.getElementById("pack_cards").classList.remove("hidden");
            if (['/create_exchange'].includes(pathname)) {
                document.getElementById("recieveCard").classList.remove("hidden");
                document.getElementById("card_sell").classList.remove("hidden");
            }
        } else {
            document.getElementById("pack_cards").classList.remove("hidden");
            document.getElementById("pack_cards").innerHTML = "<p>No duplicate cards available to exchange</p>";
            if (['/create_exchange'].includes(pathname)) {
                document.getElementById("card_sell").disabled = true;
            }
        }
    })
    .catch(response => console.error("Calculation error!" + response));
}

/**
 * Ottiene i dettagli di un singolo eroe.
 * @param {number|string} id
 * @returns {Promise<Object>}
 */
async function getSingleHero(id) {
    try {
        const response = await fetch(`../character/${id}`, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching hero:', error);
        throw error;
    }
}

/**
 * Crea un nuovo album per l'utente.
 * @param {string} userid
 * @param {string} name
 */
async function createAlbum(userid, name) {
    try {
        const response = await fetch(`../create_album`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userId: userid, name: name })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        } else {
            let JsonResponse = await response.json();
            localStorage.setItem("album_ID", JsonResponse.insertedId);
            alert("Album created");
            window.location.reload();
        }
    } catch (error) {
        console.error('Error creating album:', error);
        throw error;
    }
}

/**
 * Carica i dettagli di un personaggio (quando si arriva su /card).
 * Mostra dettagli della carta e, se l'utente l'ha nell'album, mostra serie/eventi/comics.
 */
async function loadCharacterpassed() {
    const heroID = localStorage.getItem("heroId");
    if (heroID) {
        try {
            const heroResponse = await getSingleHero(heroID);
            const searchInput = document.getElementById('select_superhero');
            if (!heroResponse) throw new Error('No response from hero fetch');
            if (heroResponse.data && heroResponse.data.length > 0) {
                const hero = heroResponse.data[0];
                searchInput.value = hero.name;
                let Div_Car =
                    '<div class="card card-shine-effect-metal" id="char-' + hero.id + '">' +
                        '<div class="card-header">' + hero.name + '</div>' +
                        '<div class="card-content">' +
                            '<img src="' + hero.thumbnail.path.replace(/"/g, "") + '.' + hero.thumbnail.extension + '">' +
                        '</div>' +
                        '<div class="card-body">' + hero.description + '</div>' +
                        '<div class="card-footer">Data provided by ©Marvel</div>' +
                    '</div>';
                document.getElementById("CardContainer").innerHTML = Div_Car;

                // Se l’utente è loggato e ha album selezionato, mostra info aggiuntive se possiede la carta
                const user_Id = localStorage.getItem("_id");
                const album_ID = localStorage.getItem("album_ID");
                if (!user_Id || !album_ID) return;
                try {
                    const response = await fetch('/check_card_album', {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            user_Id: user_Id,
                            album_Id: album_ID,
                            card_Id: hero.id
                        })
                    });
                    if (!response.ok) throw new Error("Autenticazione non valida");
                    const userData = await response.json();
                    if (userData.length > 0) {
                        const character_details = document.getElementById('character_details');
                        let seriesHtml = "", eventsHtml = "", comicsHtml = "";
                        if (hero.series.available > 0) {
                            seriesHtml = '<hr><h3>Series:</h3>';
                            for (let series of hero.series.items) {
                                seriesHtml += `<p>${series.name}</p>`;
                            }
                        }
                        if (hero.events.available > 0) {
                            eventsHtml = '<hr><h3>Events:</h3>';
                            for (let events of hero.events.items) {
                                eventsHtml += `<p>${events.name}</p>`;
                            }
                        }
                        if (hero.comics.available > 0) {
                            comicsHtml = '<hr><h3>Comics:</h3>';
                            for (let comic of hero.comics.items) {
                                comicsHtml += `<p>${comic.name}</p>`;
                            }
                        }
                        character_details.innerHTML = seriesHtml + eventsHtml + comicsHtml;
                    }
                } catch (error) {
                    console.error("Errore!", error);
                    return "ERR";
                }
            } else {
                console.error("Superhero not found");
                searchInput.value = "Superhero not found";
            }
            localStorage.removeItem("heroId");
        } catch (error) {
            console.error("Error fetching superhero details:", error);
            document.getElementById('select_superhero').value = "Error loading superhero";
        }
    }
}

// Collezione di carte selezionate per lo scambio
let collection = [];

/**
 * Gestisce la selezione/deselezione delle carte da scambiare.
 * Evidenzia la card selezionata.
 * @param {number|string} cardId
 */
function toggletoExchange(cardId) {
    const found = collection.filter(item => item.id === cardId);
    if (found.length > 0) {
        document.getElementById("char-" + cardId).style = "";
        collection = collection.filter(item => item.id !== cardId);
    } else {
        document.getElementById("char-" + cardId).style = "background-color: var(--bs-green);";
        collection.push({ id: cardId });
    }
}

/**
 * Crea uno scambio (exchange) con le carte selezionate.
 */
async function createExchange() {
    const userId = localStorage.getItem('_id');
    const cardToGet = document.getElementById('selected_Superhero').value;
    if (!userId || !cardToGet || !collection || collection.length === 0) {
        alert("Select one or more cards to send and a card that you want.");
        throw new Error('Missing required exchange parameters');
    }
    // Non puoi richiedere una carta che stai offrendo
    if (collection.some(card => card.id === cardToGet)) {
        alert("You cannot request a card that you're offering to send.");
        throw new Error('Card requested is in the send collection');
    }
    try {
        const response = await fetch('/create_exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: userId,
                cardtoGet: cardToGet,
                cardtosend: collection,
                albumId: localStorage.getItem('album_ID')
            })
        });
        if (response.ok) {
            alert("Exchange created successfully");
            window.location.href = '/exchange';
        } else {
            throw new Error('Exchange creation failed');
        }
    } catch (error) {
        console.error('Error creating exchange:', error);
        throw error;
    }
}

/**
 * Accetta uno scambio: invia la richiesta e aggiorna la pagina.
 * @param {string} exchangeId
 */
async function acceptExchange(exchangeId) {
    const userId = localStorage.getItem('_id');
    const albumId = localStorage.getItem('album_ID');
    try {
        const response = await fetch('/accept_exchange', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                exchange_id: exchangeId,
                acceptingUserId: userId,
                album_id: albumId
            })
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        alert('Exchange accepted successfully');
        window.location.reload();
    } catch (error) {
        console.error('Error accepting exchange:', error);
        alert('Failed to accept exchange');
    }
}

/**
 * Elimina uno scambio (exchange).
 * @param {string} exchangeID
 */
async function deleteExchange(exchangeID) {
    try {
        const response = await fetch(`../delete-exchange/${exchangeID}`, {
            method: 'DELETE',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        alert("Exchange successfully deleted");
        window.location.reload();
    } catch (error) {
        console.error("Errore!", error);
        return "ERR";
    }
}
