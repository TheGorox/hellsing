import { Context } from "telegraf";

const helpText = 
`
Добро пожаловать в бота Hellsing!
Этот бот сделан для того, чтобы хоть немного компенсировать кривизну рук разработчиков Bitrix24 и платформы HWS.
Доступные команды:
/help (aka /start) - Показать это сообщение
/regBitrix - запусти, если в первый раз зашёл в бота или если вебхук почему-то слетел/поменялся
/cfgNotifications - настройка уведомлений Битрикса (присылаются только непрочитанные <b>личные</b> сообщения)

    <i>by Gorox</i>
`;


export default async function helpCommand(ctx: Context) {
    await ctx.replyWithHTML(helpText);
}