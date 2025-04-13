import log4js from 'log4js';
import { getDB } from "../db.js";
import { UserConfig } from '../../bot/botUser.js';

const logger = log4js.getLogger('DB');
logger.level = process.env.LOG_LEVEL || 'info';

export default class BotUserRepository {
    
    async saveUser(telegramUid: number, bitrixWebhookUrl: string, botConfig: UserConfig) {
        const db = await getDB();
        await db.run(
            'INSERT OR REPLACE INTO botUsers (telegram_id, bitrix_wh_url, bot_config) VALUES (?, ?, ?)',
            telegramUid,
            bitrixWebhookUrl,
            UserConfig.serialize(botConfig)
        );
        
        logger.debug(`TGUser saved: ${telegramUid}`);
    }

    async getUser(telegramId: number): Promise<{ telegramId: number, bitrixWebhookUrl?: string, botConfig?: object } | null> {
        const db = await getDB();
        const row = await db.get('SELECT * FROM botUsers WHERE telegram_id = ?', telegramId);
        
        logger.debug(`TGUser retrieved for user ${telegramId}`);
        return row ? {
            telegramId: row.telegram_id,
            bitrixWebhookUrl: row.bitrix_wh_url,
            botConfig: UserConfig.deserialize(row.bot_config)
        } : null;
    }

    
    async getAllUsers(){
        const db = await getDB();
        
        
        const rows = await db.all('SELECT * FROM botUsers');
        logger.debug(`ALL TGUsers retrieved`);
        return rows.map(row => ({
            telegramId: row.telegram_id,
            bitrixWebhookUrl: row.bitrix_wh_url,
            botConfig: UserConfig.deserialize(row.bot_config)
        }));
    }
}