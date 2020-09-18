const {Schema, model} = require('mongoose')

const schema = new Schema({
    chatId: {type: Number, required: true, unique: true},
    first_name: String,
    basket: [
        {
            name: String,
            price: Number,
            date: Date,
            id: String
        }
    ]
})

module.exports = model('users', schema)