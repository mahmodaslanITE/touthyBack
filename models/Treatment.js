const mongoose = require('mongoose');

const treatmentSchema = mongoose.Schema({
    treatment_case: {
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
