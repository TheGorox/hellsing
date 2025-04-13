import { Scenes, Telegraf } from "telegraf";


function wrapStep(step: any, isFirstStep: boolean, te: number) {
    return async (ctx: any, next: any) => {
        if (!isFirstStep && leaveSceneIfCommand(ctx)) {
            return;
        }
        return step(ctx, next);
    };
}

// this whole factory thing is currently needed to
// just exit from the dialogue, if we send some command
// who would think it would be so hard to do?
export function createWizardScene(id: string, ...steps: Array<any>) {
    const wrappedSteps = steps.map((step, index) =>
        wrapStep(step, index === 0, index)
    );
    return new Scenes.WizardScene(id, ...wrappedSteps);
}


function leaveSceneIfCommand(ctx: any) {
    const bot: Telegraf = ctx.botInstance;
    if (!bot) {
        return false;
    }

    
    if (ctx?.message?.text.startsWith('/')) {
        
        // заебал typescript, честно говоря
        ctx.scene.leave();

        setImmediate(() => {
            bot.handleUpdate(ctx.update);
        });
        return true;
    }

    return false
}