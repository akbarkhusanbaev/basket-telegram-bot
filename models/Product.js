const {Schema, model} = require('mongoose')

const schema = new Schema({
    id: {type: String, required: true, unique: true},
    name: String,
    price: Number
})

module.exports = model('products', schema)