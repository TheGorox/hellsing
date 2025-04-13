import { Context } from "telegraf";
import helpCommand from "./help.js";

export default async function startCommand(ctx: Context){
    await ctx.sendPhoto('https://i.imgur.com/Bnu41Y9.png');
    await helpCommand(ctx);
}