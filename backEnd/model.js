const mongoose = require("mongoose");

const schema = new mongoose.Schema(
    {
        "pilotId": {type: String, required: true},
        "firstName": {type: String, required: true},
        "lastName": {type: String, required: true},
        "retrieved": {type: Date, required: true},
        "email": {type: String, required: true},
        "phoneNumber": {type: Number, required: true},
        "distance": {type: Number, required: true}
    },
    {timestamps: true}
);

module.exports = mongoose.model('Model', schema);