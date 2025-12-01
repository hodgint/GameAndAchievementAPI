/* DB information */
export const database = {
    address: process.env.dbLocal,
    user: process.env.dbUsername,
    pass: process.env.dbPassword,
    name: process.env.dbName
}

/* Achievement API and info */
export const playstation = {
    npsso: process.env.npsso,
    accountID: process.env.psnAccountID
};


export const retroAchievements = {
    apiKey: process.env.retroAPIKey as string,
    username: process.env.retroUsername as string
};

export const steam = {
    username: process.env.steamUsername,
    id: process.env.steamID
};

export const xbox = {
    email: process.env.xboxEmail,
    password: process.env.xboxPassword,
    uid: process.env.xboxUID
};

