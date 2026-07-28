/**
 * Format request response with consistent structure
 * @param {Object} req - Express request object
 * @param {Object} request - Request document
 * @returns {Object} Formatted request
 */
const formatRequestResponse = (req, request) => {
    // بناء رابط الصورة الكامل
    let photoUrl = null;
    if (request.photo?.url) {
        photoUrl =`${process.env.BASE_URL}/${request.photo.url}`;
    }

    return {
        _id: request._id,
        status:"pending",
        Requestion: {
            pain_severity: request.pain_severity,
            pain_time: request.pain_time,
            tooth_location: request.tooth_location,
            gender: request.gender,
            age: request.age,
            photo: {url: photoUrl},
            notes: request.notes || null,
            is_pregnant: request.is_pregnant || null,
            previous_treatment:request.previous_treatment,
        medicines:request.medicines,
        chronic_diseases:request.chronic_diseases,
        notes:request.notes,
        },
        case_type: request.case_type,
        
        created_at: request.createdAt,
        updated_at: request.updatedAt
    };
};
module.exports={formatRequestResponse}