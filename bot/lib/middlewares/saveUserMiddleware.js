const {getDb} = require('../database');
const {isStartCommand} = require('../helpers');
const moment = require('moment');

module.exports = function () {
    return async (ctx, next) => {
        if (ctx.chat.type !== 'private') {
            return next();
        }

        if (!isStartCommand(ctx)) {
            return next();
        }

        let message = ctx.update.message;
        let {from, chat} = message;
        let id = from.id || chat.id || false;

        if (!id) {
            return next();
        }

        const db = await getDb();
        const users = db.collection('users');

        try {
            let user = await users.findOne({id});
            if (user) {
                user.user = from;
                user.chat = chat;
                user.updated = moment().unix();
                if (user.blocked) {
                    user.blocked = false;
                    user.lastBlockCheck = moment().unix();
                }

            } else {
                user = {id, user: from, chat, registered: moment().unix(), updated: moment().unix()};
            }

            await users.findOneAndReplace({id}, user, {upsert: true, returnOriginal: false});
        }
        finally {
        }

        return next();
    }
}