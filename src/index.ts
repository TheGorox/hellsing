import './core/dotenv.js';

import { HellsingBot } from './bot/bot.js';

import Log4js from 'log4js';
import { initDB } from './db/db.js';
const logger = Log4js.getLogger('INDEX');
logger.level = process.env.LOG_LEVEL || 'info';

async function bootstrap(){
    await initDB();

    const bot = new HellsingBot(process.env.TELEGRAM_BOT_TOKEN);
    await bot.start();
}

bootstrap().then(() => {
    logger.info('Bot started');
}).catch((err: Error) => {
    
    logger.error('Error occured while bootstrapping:');
    
    logger.error(err);
})