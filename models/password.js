var mongoose = require('mongoose')
var mongoosePaginate = require('mongoose-paginate');
var Schema = mongoose.Schema;
var passwordSchema = new Schema({
    project_name: {type: String, required:true},
    category_type: {type: String, required: true},
    password_details: {type: String, require:true}
});
passwordSchema.plugin(mongoosePaginate);
module.exports = mongoose.model('Password',passwordSchema)