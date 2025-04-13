import { Context } from "telegraf";

export default async function regBitrix(ctx: Context) {
    (ctx as any).scene.enter('REG_BITRIX_WIZARD_SCENE_ID')
}