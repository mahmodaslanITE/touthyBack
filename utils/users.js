// functions/users.js

const Admin_profile = require("../models/Admin_profile");
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
    let  profile=null
    try {
        switch (role) {
            case 'student':{
                profile= await Student_profile.findOne({ user: userId })
                    .populate('category', 'category');
                    break}
            case 'patient':{
                profile= await Patient_profile.findOne({ user: userId });
                break}
            case 'overseer':{
                profile= await Overseer_profile.findOne({ user: userId });
            break}
            case 'admin':{
                profile=await Admin_profile.findOne({user:userId})
            }
            default:
                
        }
        
    } catch (error) {
        console.error('Error in getUserProfile:', error.message);
        return null;
    }
    return profile
}

module.exports = getUserProfile;