import { database } from "./defaults";
import * as mariadb from 'mariadb'

export const pool = mariadb.createPool({
    host: database.address,
    user: database.user,
    password: database.pass,
    database: database.name,
    connectionLimit: 5 
})

