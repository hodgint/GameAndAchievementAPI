import { AuthObject, buildAuthorization, getUserProfile } from "@retroachievements/api";
import {retroAchievements} from "../config/defaults"

const username = retroAchievements.username;
const webApiKey = retroAchievements.apiKey;

const retroAuth = buildAuthorization({username, webApiKey});

export async function retroProfile(user: any){
    return new Promise((resolve, reject)=>{
        getUserProfile(retroAuth, {username: user})
        .then(profile => {resolve(profile)})
        .catch((error: Error) =>reject(error))
        .finally()
    });
}



console.log("test");