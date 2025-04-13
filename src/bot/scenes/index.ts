import { Telegraf, Scenes, Context } from "telegraf";
import { regBitrixWizard } from "./regBitrix.js";
import { cfgNotifyWizard } from "./cfgNotifications.js";

export function setupScenes(bot: Telegraf) {
    const stage = new Scenes.Stage([regBitrixWizard, cfgNotifyWizard]);
    bot.use(stage.middleware() as any);
}