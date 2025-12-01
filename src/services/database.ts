import * as mariadb from 'mariadb'
import { pool } from '../config/db'

async function executeQuery(query: string){
    let conn;
    try{
        conn = await pool.getConnection()
        const rows = await conn.query(query);
        // validations?
        return rows
    }catch(err){
        console.error(err);
    }finally{
        if(conn) conn.release();
    }

}


export async function getAllGames(){
    const query = "SELECT * FROM games"
    const games = await executeQuery(query);
    //validation?
    return games;
}

export async function getGamesByPlatformID(platform: number){
    const query = `SELECT * FROM games WHERE platform_id == ${platform}`
}