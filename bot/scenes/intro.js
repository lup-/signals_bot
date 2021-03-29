const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const {menu} = require('../lib/helpers');
const moment = require('moment');

const DISCLAIMER_TEXT = `Ребята, привет. Это бот Игоря Кочергина, автора канала @igvestor

Здесь вы узнаете, какие акции я беру в свои и клиентские портфели.

<b>Этот бот идеально подойдёт тем, кто:</b> 

— хочет зарабатывать на инвестициях с 0 опытом;

— слишком занят, чтобы изучать теорию и практиковаться;

— интересуется стабильной доходностью от 10% в месяц.

Чтобы получать информацию о том, какие позиции покупать/продавать, нужно оформить подписку.`;

module.exports = function ({payment}) {
    const scene = new BaseScene('intro');

    scene.enter(async ctx => {
        let messageShown = ctx.session.introShown || false;

        if (messageShown) {
            let buttons = [];
            let text = 'Куда дальше?';
            let isSubscribed = await payment.isSubscribed(ctx.session.userId);

            if (isSubscribed) {
                let profile = ctx.session.profile;
                let subscribedTo = moment.unix(profile.subscribedTill).format('DD.MM.YYYY HH:mm')
                text = `Ваша подписка действует до ${subscribedTo}`;
                buttons.push({code: 'unsubscribe', text: 'Отказаться от подписки'});
            }
            else {
                buttons.push({code: 'subscribe', text: 'ОФОРМИТЬ ПОДПИСКУ'});
            }

            let extra = menu(buttons);
            extra.parse_mode = 'html';

            return ctx.safeReply(
                ctx => ctx.editMessageText(text, extra),
                ctx => ctx.replyWithHTML(text, extra),
                ctx
            );
        }

        try {
            ctx.session.introShown = true;
            let extra = menu([{code: 'accept', text: 'Понятно'}]);
            return ctx.replyWithHTML(DISCLAIMER_TEXT, extra);
        }
        catch (e) {
        }
    });

    scene.action('accept', ctx => ctx.scene.reenter());
    scene.action('subscribe', ctx => ctx.scene.enter('subscribe'));
    scene.action('unsubscribe', ctx => ctx.scene.enter('unsubscribe'));

    return scene;
}