const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const {menu} = require('../lib/helpers');

const USE_REPEATING_PAYMENTS = process.env.USE_REPEATING_PAYMENTS === '1';

module.exports = function ({payment}) {
    const scene = new BaseScene('subscribe');

    scene.enter(async ctx => {
        let text = USE_REPEATING_PAYMENTS
            ? `Выберите один из вариантов подписки. Оплата за следующий период будет сниматься автоматически, пока оформлена подписка`
            : `Выберите один из вариантов подписки`
        let buttons = payment.getTariffs().map(tariff => {
            if (tariff.full) {
                let sum = tariff.full.toFixed(0);
                let strike = sum[0] + sum.slice(1).split('').join('̶') + '̶';
                return {text: `${tariff.duration} — ${strike} ${tariff.price} руб.`, code: `pay_${tariff.days}`};
            }

            return {text: `${tariff.duration} — ${tariff.price} руб.`, code: `pay_${tariff.days}`};
        });
        let extra = menu(buttons, 1);
        extra.parse_mode = 'html';

        return ctx.safeReply(
            ctx => ctx.editMessageText(text, extra),
            ctx => ctx.replyWithHTML(text, extra),
            ctx
        );
    });

    scene.action(/pay_(.*)/, async ctx => {
        try {
            let days = parseInt(ctx.match[1]);
            let userId = ctx.session.userId;
            let needsPayment = await payment.needsPaymentToSubscribe(userId, days);

            if (needsPayment) {
                let price = await payment.getPrice(days);
                let paymentUrl = await payment.addPaymentAndGetPaymentUrl(ctx, price, days);
                let text = `После нажатия на кнопку откроется страница оплаты.

Подписка не продлевается автоматически!

За 2 дня до окончания подписки вы получите уведомление и ссылку для её продления.

Пожалуйста, используйте эту кнопку только один раз`
                let buttons = [{text: `Оплатить ${price} руб`, url: paymentUrl}];
                return ctx.safeReply(
                    ctx => ctx.editMessageText(text, menu(buttons)),
                    ctx => ctx.replyWithHTML(text, menu(buttons)),
                    ctx
                );
            }
            else {
                await payment.subscribeWithoutPayment(userId);
                ctx.reply(`Спасибо за подписку! Дополнительный платеж пока не нужен`);
            }
        }
        catch (e) {
            console.log(e.toString(), e);
            let buttons = [{text: 'Попробовать еще раз', code: 'retry'}];
            return ctx.reply(`При создании платежа возникла ошибка:
${e.toString()}`, menu(buttons));
        }
    });

    scene.action('retry', ctx => ctx.scene.reenter());

    return scene;
}