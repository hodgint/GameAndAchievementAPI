
/* DB information */
const database = {
    address: process.env.dbLocal,
    name: process.env.dbName
}

/* Achievement API and info */
const playstation = {
    npsso: process.env.npsso,
    accountID: process.env.psnAccountID
};

const retroAchievements = {
    apiKey: process.env.retroAPIKey,
    username: process.env.retroUsername
};

const steam = {
    username: process.env.steamUsername,
    id: process.env.steamID
};

const xbox = {
    email: process.env.xboxEmail,
    password: process.env.xboxPassword,
    uid: process.env.xboxUID
}