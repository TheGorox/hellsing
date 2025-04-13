import EventEmitter from 'events';
import Log4js from 'log4js';
import BitrixRestApiClient from '../bitrixClient/BitrixRestApiClient.js';
import BotUserRepository from '../db/repos/botUser.repository.js';

const logger = Log4js.getLogger('BOT');
logger.level = process.env.LOG_LEVEL || 'info';

export enum NotifType {
    ALL = 1,
    WHITELIST = 2,
    BLACKLIST = 3
}

export class UserConfig {
    // i had to make this number instead of Date
    // because i really don't want make unpacker class 
    // (data is stored as JSON in the db)

    lastSync: Date;
    notificationType: NotifType
    whitelist: number[] = [];
    blacklist: number[] = [];


    constructor(params: {
        lastSync?: Date,
        notificationType?: NotifType,
        whitelist?: number[],
        blacklist?: number[]
    } = {}) {
        this.lastSync = params.lastSync || undefined;
        this.notificationType = params.notificationType || NotifType.ALL;
        this.whitelist = params.whitelist || [];
        this.blacklist = params.blacklist || [];
    }

    static serialize(config: UserConfig): string {
        return JSON.stringify({
            lastSync: config?.lastSync?.toISOString(),
            notificationType: config.notificationType,
            whitelist: config.whitelist,
            blacklist: config.blacklist
        })
    }


    static deserialize(encoded: string): UserConfig {
        const json = JSON.parse(encoded);

        return new UserConfig({
            lastSync: json.lastSync ? new Date(json.lastSync) : undefined,
            notificationType: json.notificationType,
            whitelist: json.whitelist,
            blacklist: json.blacklist
        });
    }
}

export type Notification = {
    type: 'MESSAGE', // maybe other types will be added some day

    data: any
}


export class BotUser extends EventEmitter {
    static NOTIF_CHECK_INTERVAL = 30_000;
    static Events = {
        NEW_NOTIFICATIONS: 'newNotifications',
        ERROR: 'error'
    }

    telegramId: number;
    private _bitrixRestClient: BitrixRestApiClient;

    get bitrixRestClient(): BitrixRestApiClient {
        if (!this._bitrixRestClient) {
            this._bitrixRestClient = new BitrixRestApiClient();
        }
        return this._bitrixRestClient;
    }

    webhookUrl: string;

    notificatorIsWorking: boolean = false;
    config: UserConfig = new UserConfig();

    notifIntervalId: NodeJS.Timeout;

    botUserRepo: BotUserRepository;

    seqErrors: number = 0;

    constructor(telegramId: number, repo: BotUserRepository) {
        super();

        this.addConfigProxy();

        this.telegramId = telegramId;
        this.botUserRepo = repo;
    }

    initNotificator() {
        if (this.notificatorIsWorking) {
            return;
        }

        if (!this.config || !this.webhookUrl) {

            logger.info(`Not starting notificatior: config=${!!this.config} webhookUrl=${!!this.webhookUrl}`);
            return;
        }

        this.notificatorIsWorking = true;

        if (!this.config.lastSync) {
            this.updateSyncDate();
        }
        this.notifIntervalId = setInterval(this.checkForNewNotifications.bind(this), BotUser.NOTIF_CHECK_INTERVAL);
    }

    async checkForNewNotifications() {
        if (!this.config || !this.webhookUrl) {

            logger.info('No config or webhook, how the fuck did i started?');
        }

        try {
            const lastSyncDate = new Date(this.config.lastSync);
            const updates = await this.bitrixRestClient.getUnreadChats(lastSyncDate);
            const filteredByList = this.filterNotifications(updates);
            const unreadMessages = (await this.getUnreadMessages(filteredByList, lastSyncDate))
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
            const notifications: Notification[] = unreadMessages.map(update => {
                return {
                    type: 'MESSAGE',
                    data: update
                }
            });

            if(notifications.length)
                this.emit('newNotifications', notifications);
            this.updateSyncDate();
            this.seqErrors = 0;
        } catch (error) {

            this.seqErrors++


            logger.error(error);
            this.emit('error', error);

            if (this.seqErrors > 3) {

                // maybe error caused with some shitty message
                this.updateSyncDate();
            }
        }
    }

    updateSyncDate() {
        this.config.lastSync = new Date();
    }

    // now we should return the message from the chat if unread counter is 1
    // or get last X messages from chat if counter is > 1


    async getUnreadMessages(unreadChats: any, lastSyncDate: Date) {
        const messages = [];
        for (const chat of unreadChats) {
            // this is good. we don't need to use another one method to get several messages

            // "counter" is unread messages counter. yep
            if (chat.counter <= 1) {
                if (chat.counter === 0) {

                    logger.warn(

                        `How the fuck "delivered" chat got the way to here? ` +
                        `(title=${chat.title},chat.message.status=${chat.message.status})`
                    );
                }

                const msg = createMessage(chat, chat.message);
                messages.push(msg);
            } else {
                // this is bad. not because we can get some error,
                // but because bitrix is a piece of shit and has restrictions on their webhooks
                // (even on pricey tariffs). more chats = more chances to hit the restriction ceiling
                // also, most likely these requests will be senselessly done, due to stacking messages
                // - we don't save "last read message id" or something for each chat, that would be too much work for this


                let lastMessages = await this.bitrixRestClient.getLastMessages(chat.id, chat.counter);
                // we could seen one or maybe almost all of these messages - need to check date for each one

                lastMessages.messages = lastMessages.messages.filter(m => {
                    return new Date(m.date) > lastSyncDate;
                });

                for (const msg of lastMessages.messages) {
                    messages.push(createMessage(chat, msg));
                }
            }
        }

        return messages;

        // yeah that can seem a little bit too much
        // but it's better to normalize messages at least like this
        // i'm too lazy to write types for this stupid shit
        function createMessage(relatedChat: any, message: any) {
            return {
                ...message,
                title: relatedChat.title,
            }
        }
    }

    filterNotifications(notifications: any) {

        return notifications.filter((n: any) => {

            switch (this.config.notificationType) {
                case NotifType.ALL:
                    return true;
                case NotifType.WHITELIST:
                    return this.config.whitelist.includes(n.id);
                case NotifType.BLACKLIST:
                    return this.config.blacklist.includes(n.id);
            }
        })
    }


    setWebhookUrl(url: string, init: boolean = false) {
        this.webhookUrl = url;
        this.bitrixRestClient.setWebHookUrl(url);

        if(!init){
            this.saveToDb();
        }
    }

    setConfig(config: UserConfig) {
        this.config = config;
        this.addConfigProxy();
    }

    // proxyfying config access, to save every time we edit config
    // automatically!!!

    addConfigProxy() {
        this.config = new Proxy(this.config, {
            set: (target, prop, newValue, receiver): boolean => {
                const success = Reflect.set(target, prop, newValue, receiver);


                logger.debug(`intercepted config.set: p="${prop.toString()}" v="${newValue}", saving to db`)
                this.saveToDb();


                return success;
            }
        })
    }

    async saveToDb() {
        try {
            await this.botUserRepo.saveUser(
                this.telegramId,
                this.webhookUrl,
                this.config
            );


        } catch (error) {
            logger.error(`Error while trying to save user into db: ${error}`);
            throw error;
        }
    }
}