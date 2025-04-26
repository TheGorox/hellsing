import path from "path";
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import { Telegraf } from "telegraf";
import FileSession from "telegraf-session-local";
import Log4js from 'log4js';
import { setupCommands } from "./commands/index.js";
import { setupScenes } from "./scenes/index.js";
import BotUserRepository from '../db/repos/botUser.repository.js';
import { BotUser, Notification, UserConfig } from './botUser.js';
import { bbcodeToTelegramHTML } from "./util.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const logger = Log4js.getLogger('BOT');
logger.level = process.env.LOG_LEVEL || 'info';

export class HellsingBot {
    bot: Telegraf;

    botUserRepo: BotUserRepository = new BotUserRepository();
    
    users: Map<number, BotUser> = new Map();

    constructor(token: string) {
        this.bot = new Telegraf(token);
    }

    setupCommands() {
        setupCommands(this.bot);
    }

    setupScenes() {
        setupScenes(this.bot);
    }

    
    setupMiddlewares() {
        // save sessions between restarts
        const sessionsFile = path.join(__dirname, '../../data/sessions.json');
        
        const fileSession = new FileSession({ database: sessionsFile });
        this.bot.use(fileSession.middleware());

        this.bot.use((ctx, next) => {
            (ctx as any).botInstance = this.bot;
            next();
        });

        this.bot.use((ctx, next) => {
            const userId = ctx.from?.id;
            if (!userId) {
                return next();
            }

            // lazy load
            (ctx as any).getUser = (): BotUser => {
                let user = this.users.get(userId);
                if (!user) {
                    user = new BotUser(userId, this.botUserRepo);
                    user.telegramId = userId;
                    this.users.set(userId, user);
                    this.setupBotUserListeners(user);
                }
                return user;
            }

            next();
        });
    }

    
    async loadAllUsers() {
        const allUsers = await this.botUserRepo.getAllUsers();
        allUsers.forEach((dbUser: {
            telegramId: number,
            bitrixWebhookUrl?: string,
            botConfig?: UserConfig
        }) => {
            const bu = new BotUser(dbUser.telegramId, this.botUserRepo);
            if (dbUser.botConfig) {
                bu.setConfig(dbUser.botConfig);
            }
            if (dbUser.bitrixWebhookUrl) {
                bu.setWebhookUrl(dbUser.bitrixWebhookUrl, true);
                bu.initNotificator();
            }
            this.users.set(dbUser.telegramId, bu);
            this.setupBotUserListeners(bu);
        })
        logger.info(`loaded ${allUsers.length} users from the db`);
    }

    
    setupBotUserListeners(botUser: BotUser){
        botUser.on('error', err => {
            this.bot.telegram.sendMessage(botUser.telegramId, `В BotUser возникла критическая ошибка. Если это повторится, сообщи разрабу. А лучше, сообщи сейчас. Ошибка:\n${err.message}`);
            if(botUser.seqErrors >= 3){
                const adminId = parseInt(process.env.ADMIN_ID, 10);
                if(isNaN(adminId)){
                    logger.warn('Admin id is invalid, there is no one to send seErrors message!');
                }else{
                    this.bot.telegram.sendMessage(adminId, `BotUser ${botUser.telegramId} has ${botUser.seqErrors} seqErrors. Check logs`);
                }
            }
        });

        botUser.on('newNotifications', async (notifications: Notification[]) => {
            logger.debug('onNewNotif');
            for(const n of notifications){
                if(n.type === 'MESSAGE'){
                    await this.onMessageNotification(n, botUser);
                }
            }
        });
    }

    async onMessageNotification(notif: Notification, botUser: BotUser){
        const msg = notif.data;
        const telegramId = botUser.telegramId;

        // convert bitrix's bbcode into the telegram's html
        const msgFormatted = bbcodeToTelegramHTML(msg.text);

        try {
            await this.bot.telegram.sendMessage(telegramId, `<b>${msg.title}:</b>\n${msgFormatted}`, {
                parse_mode: 'HTML'
            });
        } catch (error) {
            
            logger.error(`Error occured when tried to notify user: ${error}`);
        }
    }

    async start() {
        this.setupMiddlewares();
        this.setupScenes();
        this.setupCommands();

        await this.loadAllUsers();

        await this.bot.launch();
    }
}