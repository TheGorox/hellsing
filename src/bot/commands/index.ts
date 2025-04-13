import { Telegraf } from "telegraf";
import helpCommand from "./help.js";
import startCommand from "./start.js";
import regBitrix from "./regBitrix.js";
import cfgNotify from "./cfgNotifications.js";


export async function setupCommands(bot: Telegraf){
    bot.command('start', startCommand);
    bot.command('help', helpCommand);
    bot.command('regBitrix', regBitrix);
    bot.command('cfgNotifications', cfgNotify);
}