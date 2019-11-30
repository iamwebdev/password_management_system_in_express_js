var mongoose = require('mongoose')
var Schema = mongoose.Schema

var categorySchema = new Schema ({
    category_name: {type: String, required: true}
})

module.exports = mongoose.model('PasswordCategory',categorySchema)