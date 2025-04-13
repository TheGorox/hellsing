import { Context, Markup, Scenes } from 'telegraf';
import { BotUser, NotifType } from '../botUser.js';
import { createWizardScene } from './createWizardScene.js';
import Log4js from 'log4js';

const logger = Log4js.getLogger('SCENE/NOTIF');
logger.level = process.env.LOG_LEVEL || 'info';

// we need to use separate variable because
// we can't immideately "go" to the next step, 
// we need to manually call the function
const sceneHandlers = [
    (ctx: any) => {
        const user = ctx.getUser() as BotUser;

        let btn1text = 'Включить все';
        let btn2text = 'Включить выбранные';
        let btn3text = 'Отключить выбранные';

        const userNotifMode = user.config.notificationType;
        switch (userNotifMode) {
            case NotifType.ALL:
                btn1text = '✅ ' + btn1text;
                break;
            case NotifType.WHITELIST:
                btn2text = '✅ ' + btn2text;
                break;
            case NotifType.BLACKLIST:
                btn3text = '✅ ' + btn3text;
                break;
        }

        ctx.reply('Какие уведомления включить:', Markup.inlineKeyboard([
            [Markup.button.callback(btn1text, 'ALL')],
            [Markup.button.callback(btn2text, 'WHITELIST')],
            [Markup.button.callback(btn3text, 'BLACKLIST')],
            [Markup.button.callback('Настроить', 'CFG_LIST')]
        ]));
        return ctx.wizard.selectStep(1);
    },
    async (ctx: any) => {
        const user = ctx.getUser() as BotUser;

        if (!ctx.callbackQuery) return;

        await ctx.answerCbQuery();

        if (ctx.callbackQuery.data === 'CFG_LIST') {
            if (user.config.notificationType === NotifType.ALL) {
                ctx.reply('Этот тип уведомлений не настраивается');
                return sceneHandlers[0].call(this, ctx);
            }

            await ctx.reply('Введи id пользователей, которые будут в списке, через запятую (прим.: 251,512515,552552...)');
            await sendListedAndRecentChats(user, ctx);
            return ctx.wizard.selectStep(2);
        } else {
            const selectedType = ctx.callbackQuery.data;
            const newNotifMode = NotifType[selectedType as keyof typeof NotifType];
            if (!newNotifMode) {
                // probably user pressed inline button from the other scene
                ctx.reply('Неизвестный тип уведомлений');
                return ctx.scene.leave();
            }
            user.config.notificationType = newNotifMode;
        }
        return sceneHandlers[0].call(this, ctx);
    },
    async (ctx: any) => {
        const user = ctx.getUser() as BotUser;

        const messageText = ctx.message?.text;
        if (!messageText) {
            ctx.reply('Неверный формат. Папробуй исчо рас 8)');
            return;
        }

        let ids;
        try {
            ids = messageText
                .split(',')
                .map(id => id.trim())
                .filter(id => id.length > 0)
                .map(id => {
                    const parsed = parseInt(id);
                    if (isNaN(parsed) || parsed < 0) {
                        throw new Error(`Invalid ID: ${id}`);
                    }
                    return parsed;
                });

            if (ids.length === 0) {
                ctx.reply('Неверный формат. Папробуй исчо рас 8)');
                return;
            }

            if (ids.length > 30) {
                ctx.reply('Ебанулся?');
                return;
            }


        } catch (error) {
            ctx.reply('Не удалось спарсить id, давай ещё разок (отправь любую команду чтобы отменить)');
            return;
        }

        if(!ids) return;

        if (user.config.notificationType === NotifType.WHITELIST) {
            await addIdsToList('whitelist', ids, user, ctx);
        }
        else if (user.config.notificationType === NotifType.BLACKLIST) {
            await addIdsToList('blacklist', ids, user, ctx);
        }
        user.saveToDb();

        return ctx.scene.leave();
    },
]

async function addIdsToList(list: 'blacklist' | 'whitelist', ids: number[], user: BotUser, ctx: Context) {
    let removed = 0, added = 0;
    for (let id of ids) {
        if (user.config[list].includes(id)) {
            user.config[list] = user.config[list].filter(x => x !== id);
            removed++;
        } else {
            user.config[list].push(id);
            added++;
        }
    }

    await ctx.reply(`Добавлено ${added}, удалено ${removed} пользователей`);
}

async function sendListedAndRecentChats(user: BotUser, ctx: Context){
    let recentChats = await user.bitrixRestClient.getLastChats();

    const notifMode = user.config.notificationType;
    let list: number[];
    if(notifMode === NotifType.ALL){
        list = []        
    }else if(notifMode === NotifType.WHITELIST){
        list = user.config.whitelist;
    }else if(notifMode === NotifType.BLACKLIST){
        list = user.config.blacklist;
    }

    const formattedList = recentChats.map(chat => {
        const chatId = chat.id;
        const chatTitle = chat.title;
        const isListed = list.includes(chatId);
        return `${isListed ? 'X' : ' '} ${chatTitle} (${chatId})`;
    });
    const toSend = formattedList.join('\n');
    await ctx.replyWithHTML(`<pre>${toSend}</pre>`);
}    

export const cfgNotifyWizard = createWizardScene(
    'CFG_NOTIF_WIZARD_SCENE_ID',
    ...sceneHandlers
);
