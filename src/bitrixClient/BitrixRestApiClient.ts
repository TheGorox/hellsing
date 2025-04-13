
import log4js from "log4js";
import { EventEmitter } from "events";
import got from "got";

const logger = log4js.getLogger('BitrixRestApi');
logger.level = process.env.LOG_LEVEL || 'info';

export default class BitrixRestApiClient extends EventEmitter {
    private bitrixWebHookUrl: string;
    private userId: number;

    constructor() {
        super();
    }

    // it should be validated outside... or not?
    
    setWebHookUrl(url: string) {
        this.bitrixWebHookUrl = url;
        this.parseUserIdFromWebHook(url);
    }

    parseUserIdFromWebHook(webhookUrl: string) {
        const match = webhookUrl.match(/\/rest\/(\d+)\//);
        if (match) {
            this.userId = parseInt(match[1]);

            logger.debug(`Bitrix ID updated: ${this.userId}`);
        } else {
            logger.warn('No bitrix ID detected in WebHook URL. This means that web hook url either forged or broken');
        }
    }

    
    async apiRequest(method: string, props: any) {
        if (!this.bitrixWebHookUrl) {
            throw new Error('Webhook url is not set');
        }

        try {
            const resp = await got.post(`${method}.json`, {
                responseType: 'json',
                prefixUrl: this.bitrixWebHookUrl,
                json: props,
            });
            const body = resp.body as any;
            if (body.error) {
                throw new Error(body.error_description);
            }

            return body;
        
        } catch (error) {
            
            logger.error(`Error while requesting ${this.bitrixWebHookUrl}: ${error.message}`);
            throw error;
        }
    }

    async getLastChats(loadFrom?: Date|undefined) {
        const method = 'im.recent.get';
        
        const resp = await this.apiRequest(method, {
            'SKIP_OPENLINES': 'Y',
            'SKIP_CHAT': 'Y',
            'LAST_SYNC_DATE': loadFrom?.toISOString()
        });

        // chats aren't filtered for some reason
        // even with SKIP_CHAT set
        resp.result = resp.result.filter((chat: any) => {
            return chat.type === 'user'
        });

        return resp.result;
    }

    
    
    
    async getUnreadChats(lastSyncDate: Date) {
        const lastChats = await this.getLastChats(lastSyncDate);
        const filteredChats = lastChats.filter((chat: any) => {
            if (this.checkIsChatWithMyself(chat)) return false;

            const lastMsg = chat.message;
            const msgDate = new Date(lastMsg.date);
            // it would be 'delivered' otherwise

            return lastMsg.status === 'received' && lastMsg.author_id === chat.id && msgDate > lastSyncDate;
        });

        return filteredChats;
    }

    
    checkIsChatWithMyself(chat: any) {
        if (chat.id === this.userId) return true;
        return false;
    }

    // chatId can be a user id or "chatXXX" string
    async getLastMessages(chatId: number | string, count: number = 20) {
        const method = 'im.dialog.messages.get';
        
        
        const resp = await this.apiRequest(method, {
            'DIALOG_ID': chatId,
            'LIMIT': count
        });

        return resp.result;
    }
}

