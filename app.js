const TelegramBot = require('node-telegram-bot-api')
const mongoose = require('mongoose')
const shortid = require('shortid')
const config = require('./config')
const { admin } = config
const bot = new TelegramBot(config.token, {polling: true})

mongoose.connect(config.db, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
    useFindAndModify: false
}, err => {
    if (err) console.log(err)
    else console.log('connected')
})

const User = require('./models/User')
const Products = require('./models/Product')


bot.on('message', async msg => {
    const chatId = msg.from.id

    const main_menu = {
        parse_mode: 'HTML',
        reply_markup: {
            resize_keyboard: true,
            keyboard: [
                ['Корзина'],
                ['Служба поддержки']
            ]
        }
    }

    const nUser = await User.findOne({chatId})

    if (!nUser) {
        const user = new User({
            chatId, first_name: msg.from.first_name, basket: [], balance: 0
        })
        await bot.sendMessage(chatId, 'Добро пожваловать')
        await user.save()
    }

    if (msg.text === '/start') {
        return bot.sendMessage(chatId, 'Главное меню', main_menu)
    }

    if (msg.text === 'Служба поддержки') {
        return bot.sendMessage(chatId, `Администратор ..., Чат ...`, main_menu)
    }

    if (msg.text === 'Корзина') {
        const user = await User.findOne({chatId})
        if (user.basket.length === 0) {
            return bot.sendMessage(chatId, 'Ваша корзина пуста')
        }
        const text = user.basket.map(p => {
            return `
Товар: ${p.name}
Цена: ${p.price}p.
            `
        }).join('=================')

        return bot.sendMessage(chatId, `${text}`, {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Оформить', callback_data: `deal`}]
                ]
            }
        })
    }

})

bot.on('callback_query', async query => {
    const chatId = query.from.id

    const prod = await Products.findOne({id: query.data})

    const user = await User.findOne({chatId})

    if (prod) {
        user.basket.push({
            name: prod.name,
            price: prod.price,
            date: Date.now(),
            id: prod.id
        })
        user.save()
        bot.answerCallbackQuery(query.id, {
            text: 'Товар успешно добавлен в корзину'
        })
    }

    if (query.data === 'deal') {
        if (user.basket.length >= 1) {
            const prodsList = user.basket.map(p => {
                return `Товар: ${p.name} 
Цена: ${p.price}p.
ID: ${p.id}
Добавлен: ${p.date}`
            }).join('\n==================\n')
            bot.sendMessage(chatId, `Ваши заказы:
${prodsList}
Оплатите ваш заказ
            `, {
                reply_markup: {
                    inline_keyboard: [
                        [{text: 'Оплатил(а)', callback_data: 'payed'}]
                    ]
                }
            })


        }
    }

    if (query.data === 'payed') {
        const prodsList = user.basket.map(p => {
            return `Товар: ${p.name} 
Цена: ${p.price}p.
ID: ${p.id}
Добавлен: ${p.date}`
        }).join('\n==================\n')
        await bot.sendMessage(chatId, 'Вы успешно купили товар')
        await bot.sendMessage(admin, `Пользователь ${user.first_name} (${user.chatId}) купил товары:
${prodsList}`)
        setTimeout(() => {
            user.basket = []
            user.save()
        }, 300)
    }

})

bot.onText(/\/start (.+)/, async (msg, [any, match]) => {
    const chatId = msg.from.id
    if (match === 'basket') {
        const user = await User.findOne({chatId})
        if (user.basket.length === 0) {
            return bot.sendMessage(chatId, 'Ваша корзина пуста')
        }
        const text = user.basket.map(p => {
            return `
Товар: ${p.name}
Цена: ${p.price}p.
            `
        })

        return bot.sendMessage(chatId, `${text}`, {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Оформить', callback_data: `deal`}]
                ]
            }
        })
    }
})

bot.onText(/\/stats (.+)/, async (msg, [any, match]) => {
    const users = await User.find()
    const oneUser = await User.findOne({chatId: match})
    if (msg.from.id === admin) {
        if (match === 'all') {
            return bot.sendMessage(admin, `
Всего пользователей: ${users.length}
            `)
        }

        if (oneUser) {
            const card = oneUser.basket.map(p => {
                return `
Товар: ${p.name}
Цена: ${p.price}p.
Добавил в корзину: ${p.date}
ID: ${p.id}
                `
            }).join('\n============\n')
            return bot.sendMessage(admin, `
Пользователь: ${oneUser.chatId}
Имя: ${oneUser.first_name}
Корзина: 
${card}
            `)
        }

    }
})

bot.onText(/\/new n\((.+)\) p\((.+)\)/, async (msg, [any, n, p]) => {
    if (msg.from.id === admin) {
        const prod = new Products({
            name: n, price: p, id: shortid.generate()
        })
        await prod.save()
        bot.sendMessage(admin, 'Товар добавлен')
        bot.sendMessage(config.ch, `
Новый товар!
Название: ${prod.name}
Цена: ${prod.price}p.
        `, {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Добавить в корзину', callback_data: `${prod.id}`}],
                    [{text: 'Перейти в корзину', url: 'https://t.me/basket_test_node_bot?start=basket'}]
                ]
            }
        })
    }
})
