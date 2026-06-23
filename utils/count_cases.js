const Finished_request = require("../models/Finished_request");
const InProcess_request = require("../models/InProcess_request");
const { Pending_request } = require("../models/Pending_request");

/**
 * Get case counts for user
 * @param {string} userId - User ID
 * @param {string} role - User role
 * @returns {Promise<Object>} Counts object
 */
const getCaseCounts = async (userId, role) => {
    if (role === 'student') {
        return {
            finished: await Finished_request.countDocuments({ student: userId }),
            inProcess: await InProcess_request.countDocuments({ student: userId })
        };
    }
    if (role === 'overseer') {
        return {
            finished: await Finished_request.countDocuments({ overseer: userId }),
            inProcess: await InProcess_request.countDocuments({ overseer: userId })
        };
    }
    if (role === 'patient') {
        return {
            pending: await Pending_request.countDocuments({ user: userId }),
            finished: await Finished_request.countDocuments({ patient: userId }),
            inProcess: await InProcess_request.countDocuments({ patient: userId })
        };
    }
    return { finished: 0, inProcess: 0 };
};
module.exports=getCaseCounts