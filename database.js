/**
 * Gestione della connessione e delle principali operazioni sul database MongoDB.
 */
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const { getMD5 } = require("./utils.js");
const Decimal = require('decimal.js');

// Costruzione URI MongoDB dai parametri di ambiente
const uri = `mongodb+srv://${process.env.DB_USERNAME}:${process.env.DB_PASSWORD}@${process.env.DB_CLUSTER}/?${process.env.DB_OPTIONS}`;
let client;
let dbConnection;

/**
 * Connessione centralizzata al database.
 */
async function connectToDatabase() {
  if (dbConnection) return dbConnection;
  try {
    client = new MongoClient(uri, {
      serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
      },
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      maxPoolSize: 10
    });
    await client.connect();
    dbConnection = client.db(process.env.DB_DBNAME);
    return dbConnection;
  } catch (error) {
    console.error('Could not connect to MongoDB', error);
    throw error;
  }
}
// Avvio connessione appena importato
connectToDatabase().catch(console.error);

/**
 * Verifica connessione DB (ping)
 */
async function check_db_connection() {
  try {
    const db = await connectToDatabase();
    await db.command({ ping: 1 });
    return { status: 200, message: 'Database connection successful' };
  } catch (error) {
    console.error('Connection to MongoDB failed:', error);
    return {
      status: 401,
      message: 'Database connection unauthorized or failed',
      error: error.message
    };
  }
}

/**
 * Verifica se username o email esistono già
 */
async function check_username(user) {
  try {
    const db = await connectToDatabase();
    const existingUser = await db.collection("users").findOne({
      $or: [{ email: user.email }, { username: user.username }]
    });
    if (existingUser) {
      return { status: 530, message: 'Username or mail already exists' };
    }
    return { status: 200, message: 'User does not exist' };
  } catch (error) {
    console.error('Connection to MongoDB failed:', error);
    return { status: 500, message: 'Internal server error' };
  }
}

/**
 * Registra un nuovo utente
 */
async function register_user(res, user) {
  try {
    user.credits = new Decimal(user.credits).toString();
    const db = await connectToDatabase();
    await db.collection("users").insertOne(user);
    return { status: 200, message: 'User registered successfully' };
  } catch (error) {
    console.error('Registration of the user into the database failed:', error);
    return {
      status: 401,
      message: 'Database insert unauthorized or failed',
      error: error.message
    };
  }
}

/**
 * Verifica le credenziali dell'utente per il login
 */
async function check_user_credentials(login) {
  if (login._id) login._id = new ObjectId(login._id);
  const filter = {
    $or: [
      { $and: [{ email: login.email }, { password: login.password }] },
      { $and: [{ username: login.username }, { password: login.password }] },
      { $and: [{ _id: login._id }, { username: login.username }] }
    ]
  };
  try {
    const db = await connectToDatabase();
    return await db.collection("users").findOne(filter);
  } catch (error) {
    console.error("Error in check_user_credentials:", error);
    throw error;
  }
}

/**
 * Modifica i crediti di un utente (es. per vendita o acquisto carte)
 */
async function variate_credits(credits) {
  const db = await connectToDatabase();
  const user = await db.collection("users").findOne({ username: credits.username });
  const currentCredits = new Decimal(user.credits);
  const creditChange = new Decimal(credits.credits);
  const newCredits = currentCredits.plus(creditChange);

  if (newCredits.lessThan(0)) {
    return { status: 401, credits: currentCredits.toString() };
  }
  try {
    const result = await db.collection("users").updateOne(
      { username: credits.username },
      { $set: { credits: newCredits.toString() } }
    );
    const updatedUser = await db.collection("users").findOne({ username: credits.username });
    return { status: 200, result, credits: updatedUser.credits };
  } catch (error) {
    console.error('Error updating credits:', error);
    throw error;
  }
}

/**
 * Ottiene il numero di crediti di un utente
 */
async function get_Credits(user_param) {
  try {
    const db = await connectToDatabase();
    const user = await db.collection("users").findOne({ username: user_param });
    if (!user) return { status: 401, message: 'User not found' };
    return { status: 200, credits: new Decimal(user.credits).toString() };
  } catch (error) {
    console.error('Error fetching credits:', error);
    throw error;
  }
}

/**
 * Aggiorna i dati di un utente
 */
async function update_user(login) {
  try {
    const db = await connectToDatabase();
    const updateFields = {
      email: login.email,
      username: login.username,
      name: login.name,
      surname: login.surname,
      date: login.date,
      superhero: login.superhero
    };
    if (login.password) updateFields.password = getMD5(login.password);
    const result = await db.collection("users").updateOne(
      { _id: new ObjectId(login._id) },
      { $set: updateFields }
    );
    if (!result.acknowledged) {
      return { status: 401, message: 'Database update unauthorized or failed' };
    }
    return {
      status: 200,
      message: 'Database update completed!',
      data: JSON.stringify(login)
    };
  } catch (error) {
    console.error('Update of the user failed:', error);
    return {
      status: 401,
      message: 'Database connection unauthorized or failed',
      error: error.message
    };
  }
}

/**
 * Elimina un utente e tutte le sue risorse collegate (scambi, carte, album)
 */
async function delete_user(id) {
  try {
    const db = await connectToDatabase();
    // Elimina l'utente
    const result_users = await db.collection("users").deleteOne({ _id: new ObjectId(id) });
    if (!result_users.acknowledged) {
      return { status: 401, message: 'Database delete unauthorized or failed' };
    }
    // Elimina scambi dell'utente
    const result_exchanges = await db.collection("exchanges").deleteMany({ user_id: new ObjectId(id) });
    if (!result_exchanges.acknowledged) {
      return { status: 401, message: 'Database delete unauthorized or failed' };
    }
    // Elimina carte dell'utente
    const result_cards = await db.collection("cards").deleteMany({ user_id: new ObjectId(id) });
    if (!result_cards.acknowledged) {
      return { status: 401, message: 'Database delete unauthorized or failed' };
    }
    // Elimina album dell'utente
    const result_albums = await db.collection("albums").deleteMany({ user_id: new ObjectId(id) });
    if (!result_albums.acknowledged) {
      return { status: 401, message: 'Database delete unauthorized or failed' };
    }
    // Elimina cards negli scambi associati
    const result_exchange_card = await db.collection("exchanges_cards").deleteMany({ user_id: new ObjectId(id) });
    if (!result_exchange_card.acknowledged) {
      return { status: 401, message: 'Database delete unauthorized or failed' };
    }
    return { status: 200, message: 'Database delete completed! User removed' };
  } catch (error) {
    console.error('Delete user failed:', error);
    return {
      status: 401,
      message: 'Database connection unauthorized or failed',
      error: error.message
    };
  }
}

/**
 * Restituisce tutti gli album di un utente
 */
async function getUserAlbums(id) {
  try {
    const db = await connectToDatabase();
    const albums = await db.collection("albums").find({ user_Id: new ObjectId(id) }).toArray();
    if (!albums) {
      return { status: 404, message: 'Albums not found' };
    }
    return albums;
  } catch (error) {
    console.error('Error fetching albums:', error);
    throw error;
  }
}

/**
 * Crea un nuovo album per un utente
 */
async function createAlbum(userid) {
  try {
    const db = await connectToDatabase();
    const albums = await db.collection("albums").insertOne({
      user_Id: new ObjectId(userid.userId),
      name: userid.name
    });
    if (!albums) {
      return { status: 404, message: 'Cannot create album' };
    }
    return albums;
  } catch (error) {
    console.error('Error creating album:', error);
    throw error;
  }
}

/**
 * Salva una nuova carta nell'album di un utente
 */
async function savecard(params) {
  try {
    const db = await connectToDatabase();
    const card = await db.collection("cards").insertOne({
      user_Id: new ObjectId(params.userID),
      album_Id: params.albumID,
      card_Id: params.cardID
    });
    // Rimuovi eventuali scambi collegati a questa carta
    await remove_exchange_by_card({
      cardId: params.cardID,
      userId: params.userID,
      albumId: params.albumID,
      type: 'Card_found'
    });
    if (!card) {
      return { status: 404, message: 'Cannot create card' };
    }
    return card;
  } catch (error) {
    console.error('Error creating card:', error);
    throw error;
  }
}

/**
 * Controlla se una specifica carta è già presente nell'album dell'utente
 */
async function check_card_album(params) {
  try {
    const db = await connectToDatabase();
    const filter = {
      $and: [
        { user_Id: new ObjectId(params.user_Id) },
        { album_Id: params.album_Id },
        { card_Id: params.card_Id }
      ]
    };
    const cards = await db.collection("cards").find(filter).toArray();
    if (!cards) {
      return { status: 404, message: 'cards not found' };
    }
    return cards;
  } catch (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }
}

/**
 * Restituisce tutte le carte di un album
 */
async function getAlbumsCards(albumid) {
  try {
    const db = await connectToDatabase();
    const cards = await db.collection("cards").find({ album_Id: albumid }).sort({ card_Id: 1 }).toArray();
    if (!cards) {
      return { status: 404, message: 'cards not found' };
    }
    return cards;
  } catch (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }
}

/**
 * Restituisce tutte le carte duplicate (almeno 2) di un album
 */
async function getDuplicatedAlbumsCards(albumid) {
  try {
    const db = await connectToDatabase();
    const filter = [
      { $match: { album_Id: albumid } },
      {
        $group: {
          _id: { user_Id: "$user_Id", album_Id: "$album_Id", card_Id: "$card_Id" },
          count: { $sum: 1 }
        }
      },
      { $match: { count: { $gte: 2 } } }
    ];
    let cards = await db.collection("cards").aggregate(filter).toArray();
    if (!cards) {
      return { status: 404, message: 'cards not found' };
    }
    // Normalizza struttura dati
    return cards.map(card => ({
      user_Id: card._id.user_Id,
      album_Id: card._id.album_Id,
      card_Id: card._id.card_Id
    }));
  } catch (error) {
    console.error('Error fetching cards:', error);
    throw error;
  }
}

/**
 * Rimuove una carta (per vendita o scambio)
 * type: "sell_card" | "exchange_cards"
 */
async function remove_card(param, type) {
  const parameters = param;
  if (type === "sell_card") {
    try {
      parameters.credits = 0.2;
      await variate_credits(parameters);
      const db = await connectToDatabase();
      const result_cards = await db.collection("cards").deleteOne(
        {
          user_Id: new ObjectId(parameters.user_id),
          album_Id: parameters.album_id,
          card_Id: parameters.card_id
        }
      );
      if (!result_cards.acknowledged) {
        return { status: 401, message: 'Database delete unauthorized or failed' };
      }
      // Rimuovi scambi solo se era l'ultima copia
      const userCards = await db.collection("cards").find({
        user_Id: new ObjectId(parameters.user_id),
        album_Id: parameters.album_id,
        card_Id: parameters.card_id
      }).toArray();
      const existingExchanges = await db.collection("exchanges_cards").find({
        user_id: new ObjectId(parameters.user_id),
        album_id: parameters.album_id,
        card_Id: parameters.card_id
      }).count();
      if (userCards.length <= existingExchanges) {
        await remove_exchange_by_card({
          cardId: parameters.card_id,
          userId: parameters.user_id,
          albumId: parameters.album_id,
          type: 'Card_sold'
        });
      }
      return { status: 200, message: 'Sell completed.' };
    } catch (error) {
      console.error('Error removing (selling) cards:', error);
      throw error;
    }
  } else if (type === "exchange_cards") {
    try {
      const db = await connectToDatabase();
      const result_cards = await db.collection("cards").deleteOne(
        {
          user_Id: new ObjectId(parameters.user_id),
          album_Id: parameters.album_id,
          card_Id: parameters.card_id
        }
      );
      if (!result_cards.acknowledged) {
        return { status: 401, message: 'Database delete unauthorized or failed' };
      }
      return { status: 200, message: 'Exchange card removed.' };
    } catch (error) {
      console.error('Error removing (exchange) cards:', error);
      throw error;
    }
  }
}

/**
 * Restituisce tutti gli scambi validi per le carte duplicate che si possono cedere
 */
async function get_valid_exchanges(params) {
  const db = await connectToDatabase();
  const response = await getDuplicatedAlbumsCards(params.albumid);
  const returned_exchanges = [];
  // Scorro le carte duplicate, per ognuna cerco scambi validi
  for (let i = 0; i < response.length; i++) {
    const filter = { requestedCard: response[i].card_Id.toString() };
    const exchanges = await db.collection("exchanges").find(filter).toArray();
    if (!exchanges || exchanges.length === 0) continue;
    for (let j = 0; j < exchanges.length; j++) {
      if (exchanges[j].user_id.toString() === params.userid) continue; // Skippa scambi dello stesso utente
      const exchange_cards = await db.collection("exchanges_cards").find({
        exchange_id: exchanges[j]._id
      }).toArray();
      // Se l'utente ha una delle carte proposte, skippa
      let hasAnyProposedCards = false;
      for (let card of exchange_cards) {
        const cardCheck = await check_card_album({
          album_Id: params.albumid,
          user_Id: params.userid,
          card_Id: card.card_Id
        });
        if (cardCheck && cardCheck.length > 0) {
          hasAnyProposedCards = true;
          break;
        }
      }
      if (hasAnyProposedCards) continue;
      // Aggiungi lo scambio valido
      returned_exchanges.push({
        exchange_ID: exchanges[j]._id,
        requestedCard: exchanges[j].requestedCard,
        proposedCards: exchange_cards.map(card => card.card_Id)
      });
    }
  }
  return { status: 200, exchanges: returned_exchanges };
}

/**
 * Crea un nuovo scambio (exchange)
 */
async function create_exchange(params) {
  try {
    const db = await connectToDatabase();
    // Inserisci exchange principale
    const exchange = await db.collection("exchanges").insertOne({
      user_id: new ObjectId(params.userId),
      album_id: params.albumId,
      requestedCard: params.cardtoGet
    });
    // Verifica che le carte proposte siano ancora disponibili
    for (const cardId of params.cardtosend) {
      const userCards = await db.collection("cards").find({
        user_Id: new ObjectId(params.userId),
        album_Id: params.albumId,
        card_Id: cardId.id
      }).toArray();
      const existingExchanges = await db.collection("exchanges_cards").find({
        user_id: new ObjectId(params.userId),
        album_id: params.albumId,
        card_Id: cardId.id
      }).count();
      if (existingExchanges >= userCards.length) {
        throw new Error(`Card ${cardId.id} is no longer available for exchange`);
      }
    }
    // Inserisci tutte le carte proposte
    const cardPromises = params.cardtosend.map(cardId =>
      db.collection("exchanges_cards").insertOne({
        exchange_id: exchange.insertedId,
        card_Id: cardId.id,
        user_id: new ObjectId(params.userId),
        album_id: params.albumId
      })
    );
    await Promise.all(cardPromises);
    return {
      status: 200,
      exchange_id: exchange.insertedId,
      message: 'Exchange created successfully'
    };
  } catch (error) {
    console.error('Error creating exchange:', error);
    return {
      status: 500,
      message: 'Failed to create exchange',
      error: error.message
    };
  }
}

/**
 * Rimuove tutti gli scambi collegati a una specifica carta
 * card.type: "Card_found" | "Card_sold"
 */
async function remove_exchange_by_card(card) {
  try {
    const db = await connectToDatabase();
    let result;
    if (card.type === 'Card_found') {
      // Elimina exchange dove la carta è richiesta
      const exchanges = await db.collection("exchanges").find({
        requestedCard: card.cardId,
        user_id: new ObjectId(card.userId),
        album_id: card.albumId
      }).toArray();
      const exchangeIds = exchanges.map(exchange => exchange._id);
      if (exchangeIds.length > 0) {
        await db.collection("exchanges_cards").deleteMany({
          exchange_id: { $in: exchangeIds }
        });
      }
      result = await db.collection("exchanges").deleteMany({
        requestedCard: card.cardId,
        user_id: new ObjectId(card.userId),
        album_id: card.albumId
      });
    } else if (card.type === 'Card_sold') {
      // Elimina exchange dove la carta è offerta
      const exchanges = await db.collection("exchanges_cards").find({
        card_Id: card.cardId,
        user_id: new ObjectId(card.userId),
        album_id: card.albumId
      }).toArray();
      const exchangeIds = exchanges.map(exchange => exchange.exchange_id);
      if (exchangeIds.length > 0) {
        await db.collection("exchanges_cards").deleteMany({
          exchange_id: { $in: exchangeIds }
        });
      }
      result = await db.collection("exchanges").deleteMany({
        _id: { $in: exchangeIds },
        user_id: new ObjectId(card.userId),
        album_id: card.albumId
      });
    }
    return {
      status: 200,
      message: 'Exchanges removed successfully',
      deletedCount: result.deletedCount
    };
  } catch (error) {
    console.error('Error removing exchanges:', error);
    return {
      status: 500,
      message: 'Failed to remove exchanges',
      error: error.message
    };
  }
}

/**
 * Accetta uno scambio: scambia effettivamente le carte tra i due utenti
 */
async function accept_exchange(params) {
  try {
    const db = await connectToDatabase();
    // Recupera lo scambio
    const exchange = await db.collection("exchanges").findOne({
      _id: new ObjectId(params.exchange_id)
    });
    if (!exchange) throw new Error('Exchange not found');
    // Recupera le carte proposte
    const proposedCards = await db.collection("exchanges_cards").find({
      exchange_id: new ObjectId(params.exchange_id)
    }).toArray();

    // 1. Rimuovi la carta richiesta dall'accettante, 2. aggiungila al creatore dello scambio
    await remove_card({
      user_id: params.acceptingUserId,
      album_id: params.album_id,
      card_id: Number(exchange.requestedCard)
    }, "exchange_cards");
    await savecard({
      userID: exchange.user_id.toString(),
      albumID: exchange.album_id,
      cardID: Number(exchange.requestedCard)
    });

    // Per ogni carta proposta, rimuovila dal creatore e aggiungila all'accettante
    for (const card of proposedCards) {
      await remove_card({
        user_id: exchange.user_id.toString(),
        album_id: exchange.album_id,
        card_id: Number(card.card_Id)
      }, "exchange_cards");
      await savecard({
        userID: params.acceptingUserId,
        albumID: params.album_id,
        cardID: Number(card.card_Id)
      });
    }
    // Elimina exchange e cards associate
    await delete_exchange(params.exchange_id);
    return { status: 200, message: 'Exchange completed successfully' };
  } catch (error) {
    console.error('Error completing exchange:', error);
    return {
      status: 500,
      message: 'Failed to complete exchange',
      error: error.message
    };
  }
}

/**
 * Elimina uno scambio e tutte le sue carte associate
 */
async function delete_exchange(exchangeId) {
  try {
    const db = await connectToDatabase();
    // Elimina tutti gli exchange_cards associati
    await db.collection("exchanges_cards").deleteMany({
      exchange_id: new ObjectId(exchangeId)
    });
    // Elimina l'exchange principale
    const result = await db.collection("exchanges").deleteOne({
      _id: new ObjectId(exchangeId)
    });
    if (result.deletedCount === 0) {
      return { status: 404, message: 'Exchange not found' };
    }
    return { status: 200, message: 'Exchange deleted successfully' };
  } catch (error) {
    console.error('Error deleting exchange:', error);
    return {
      status: 500,
      message: 'Failed to delete exchange',
      error: error.message
    };
  }
}

/**
 * Restituisce tutti gli scambi creati dall'utente (per album)
 */
async function get_my_exchanges(params) {
  const db = await connectToDatabase();
  const returned_exchanges = [];
  const filter = { user_id: new ObjectId(params.userid) };
  const exchanges = await db.collection("exchanges").find(filter).toArray();
  for (let j = 0; j < exchanges.length; j++) {
    const exchange_cards = await db.collection("exchanges_cards").find({
      exchange_id: exchanges[j]._id
    }).toArray();
    returned_exchanges.push({
      exchange_ID: exchanges[j]._id,
      requestedCard: exchanges[j].requestedCard,
      proposedCards: exchange_cards.map(card => card.card_Id)
    });
  }
  return { status: 200, exchanges: returned_exchanges };
}

module.exports = {
  check_username,
  register_user,
  check_user_credentials,
  variate_credits,
  get_Credits,
  update_user,
  delete_user,
  getUserAlbums,
  createAlbum,
  savecard,
  check_card_album,
  getAlbumsCards,
  getDuplicatedAlbumsCards,
  remove_card,
  get_valid_exchanges,
  create_exchange,
  remove_exchange_by_card,
  accept_exchange,
  delete_exchange,
  get_my_exchanges
};
