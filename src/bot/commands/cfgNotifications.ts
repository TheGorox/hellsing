import { Context } from "telegraf";

export default async function cfgNotify(ctx: Context) {
    (ctx as any).scene.enter('CFG_NOTIF_WIZARD_SCENE_ID')
}