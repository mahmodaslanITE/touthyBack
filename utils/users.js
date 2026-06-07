// functions/users.js

const { Overseer_profile } = require("../models/Overseer_profile");
const Patient_profile = require("../models/Patient_profile");
const Student_profile = require("../models/Student_profile");


/**
 * Get user profile based on role
 * @param {string} userId - User ID
 * @param {string} role - User role (student, patient, overseer)
 * @returns {Promise<Object>} - User profile
 */
async function getUserProfile(userId, role) {
    try {
        switch (role) {
            case 'student':
                return await Student_profile.findOne({ user: userId })
                    .populate('category', 'category');
            case 'patient':
                return await Patient_profile.findOne({ user: userId });
            case 'overseer':
                return await Overseer_profile.findOne({ user: userId });
            default:
                return null;
        }
    } catch (error) {
        console.error('Error in getUserProfile:', error.message);
        return null;
    }
}

module.exports = getUserProfile;