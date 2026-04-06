const mongoose = require('mongoose');

const treatmentSchema = mongoose.Schema({
    case_type: {
        type: String,
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    }
});

const Treatment = mongoose.model('Treatment', treatmentSchema);
module.exports = Treatment;
