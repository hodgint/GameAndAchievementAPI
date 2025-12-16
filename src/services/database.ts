import * as mariadb from 'mariadb'
import { pool } from '../config/db'
import { exec } from 'child_process';

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

async function checkDBForDuplicate(table:string, col:string, value:string){
    const query = `SELECT ${col} FROM ${table} WHERE ${col} == ${value}`
    const res = await executeQuery(query);
    if(res.body){
        return true;
    }else{
        return false;
    }
}



/* Gets */
export async function getAllGames(){
    const query = "SELECT * FROM games"
    const games = await executeQuery(query);
    //validation?
    return games;
}

export async function getGamesByPlatformID(platform: number){
    const conn = await pool.getConnection();
    const query = `SELECT * FROM games WHERE platform_id == ?`
    try{
        const response = await conn.query(query, [platform]);
        if(response.length > 0){
            return response.json(response[0]);
        }else{
            return response.status();
        }
    }catch(err){
        console.error(err);
    }finally {
        if(conn){
            conn.release();
        }
    }

}


/* Inserts */
export async function insertNewPlatform(name:string, description:string){
    const date = Date
    const query = `INSERT INTO platforms (create_time, name, description) VALUES (${date}, ${name}, ${description})`
    const res = executeQuery(query);
    //Validation
    return res;
}


/* Deletes */