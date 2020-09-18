const {Schema, model} = require('mongoose')

const schema = new Schema({
    name: String,
    price: Number,
    date: Date,
    id: String,
    owner: {type: Number, required: true}
})

module.exports = model('archive', schema)