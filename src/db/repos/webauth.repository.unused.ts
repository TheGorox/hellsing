import log4js from 'log4js';
import { getDB } from "../db.js";

const logger = log4js.getLogger('DB');
logger.level = process.env.LOG_LEVEL || 'info';


export default class WebAuthRepository {
    
    async saveSession(uid: number, session: string, customData: object) {
        
        const db = await getDB();
        await db.run(
            'INSERT OR REPLACE INTO sessions VALUES (?, ?, ?)',
            uid,
            session,
            JSON.stringify(customData)
        );
        
        logger.debug(`Session saved for user ${uid}`);
    }

    async getSession(id: number): Promise<{ uid: number, session: string, customData: object } | null> {
        const db = await getDB();
        const row = await db.get('SELECT * FROM sessions WHERE id = ?', id);
        
        logger.debug(`Session retrieved for user ${id}`);
        return row ? {
            uid: row.uid,
            session: row.session,
            
            
            customData: JSON.parse(row.custom_data)
        } : null;
    }
}