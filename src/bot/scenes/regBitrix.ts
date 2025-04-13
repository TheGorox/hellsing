import { Scenes } from 'telegraf';
import { createWizardScene } from './createWizardScene.js';

export const regBitrixWizard = createWizardScene(
	'REG_BITRIX_WIZARD_SCENE_ID',
	(ctx: any) => {
		const regHelpText = `
    Чтобы я мог подключиться к твоему битриксу, мне нужна webhook ссылка. Её можно получить, 
    перейдя на эту страницу: https://hwschool.bitrix24.ru/devops/section/standard/
    затем нажми кнопку "Входящий вебхук". Откроется настройка вебхука, в которую заботливые разработчики решили не добавлять возможность импорта превилегий.
    (1) Настрой разрешения, как показано на скриншоте. 
    (2) Сохрани
    (3) Скопируй ссылку и отправь мне её сообщением
    `;

		ctx.replyWithMediaGroup([
			{
				type: 'photo',
				media: 'https://i.imgur.com/KDv0ah6.png',
				caption: regHelpText,
				parse_mode: 'HTML'
			},
			{
				type: 'photo',
				media: 'https://i.imgur.com/3vtHKMo.png'
			}
		]);
		ctx.wizard.state.contactData = {};
		return ctx.wizard.next();
	},
	async (ctx: any) => {
  
		const msg = ctx.message.text
		if (msg === '.') {
			ctx.reply('В другой раз!');
			return ctx.scene.leave();
		}
		if (!msg.match(/^https:\/\/hwschool.bitrix24.ru\/rest\/\d+\/[a-z0-9]+\/$/)) {
			ctx.reply(
				'Ссылка должна быть вида https://hwschool.bitrix24.ru/rest/0000000/ffffffffffffff/\n' +
				'Отправь точку в сообщении, если хочешь отменить регистрацию'
			);
			return;
		}

		try {
			const user = ctx.getUser();
			await user.setWebhookUrl(msg);
			ctx.reply('Вебхук успешно сохранен! Уведомления автоматически включены. Чтобы настроить уведомления, выполни /cfgNotifications');
  
		} catch (error) {
			console.error('Error saving webhook URL:', error);
			ctx.reply('Произошла ошибка при сохранении вебхука. Пожалуйста, попробуй позже или обратиcь к создателю.');
		}
		
		return ctx.scene.leave();
	},
);