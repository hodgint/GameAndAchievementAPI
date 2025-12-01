
export interface platformData {
    id: number;
    create_time: Date;
    name: string;
    description: string;
}

export interface gameData{
    id: number;
    name: string;
    platform_id: number;
    description: string;
    publisher: string;
    developer: string;
    release_date: Date
}

export interface achievementData{
    id: number;
    name: string;
    description: string;
    image: string;
    game_id: number;
    hardcore_points: number;
    softcore_points: number;
    type: string;
}

export interface userGameData{
    id: number;
    user_id: number;
    game_id: number;
    date_owned: Date;
    playtime: number;
}

export interface userAchievementData{
    id: number;
    user_id: number
    achievement_id: number;
    date_earned: Date;
}