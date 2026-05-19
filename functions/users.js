// utils/getUserProfile.js
const OverseerProfile = require("../models/Overseer_profile");
const PatientProfile = require("../models/Patient_profile");
const StudentProfile = require("../models/Student_profile");

/**
 * Get user profile based on role
 * @param {string} userId - The user ID
 * @param {string} role - The user role (student, patient, overseer)
 * @returns {Promise<Object>} - The user profile
 */
async function getUserProfile(userId, role) {
    let profile = null;
    
    try {
        if (role === 'student') {
            profile = await StudentProfile.findOne({ user: userId })
                .populate({ path: 'category', select: 'category' });
        } 
        else if (role === 'patient') {
            profile = await PatientProfile.findOne({ user: userId });
        } 
        else if (role === 'overseer') {
            profile = await OverseerProfile.findOne({ user: userId });
        } 
        else {
            throw new Error('Invalid user role');
        }
        
        return profile;
    } catch (error) {
        console.error('Error getting user profile:', error);
        return null;
    }
}

module.exports = getUserProfile;