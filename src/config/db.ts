import { database } from "./defaults";
import * as mariadb from 'mariadb'

export const pool = mariadb.createPool({
    host: database.address,
    user: database.user,
    password: database.pass,
    database: database.name,
    connectionLimit: 5 
})


export async function getAllGames(){
    let conn;
    try{
        conn = await pool.getConnection()
        const rows = await conn.query("Select * from games")
    }catch(err){
        console.error(err);
    }finally{
        if(conn) conn.release();
    }
}