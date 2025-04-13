import './core/dotenv.js';

import { HellsingBot } from './bot/bot.js';

import Log4js from 'log4js';
import { initDB } from './db/db.js';
import path from 'path';
import fs from 'fs';

import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const logger = Log4js.getLogger('INDEX');
logger.level = process.env.LOG_LEVEL || 'info';

async function bootstrap(){
    initFolders();
    await initDB();

    const bot = new HellsingBot(process.env.TELEGRAM_BOT_TOKEN);
    await bot.start();
}

function initFolders(){
    const dataPath = path.join(__dirname, '../data');
    if(!fs.existsSync(dataPath)){
        fs.mkdirSync(dataPath);
    }
}

bootstrap().then(() => {
    logger.info('Bot started');
}).catch((err: Error) => {
    
    logger.error('Error occured while bootstrapping:');
    
    logger.error(err);
})