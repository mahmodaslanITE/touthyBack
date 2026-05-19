// utils/requestHelper.js

/**
 * Helper function to get requests by status and role
 * This file contains all shared logic for request queries
 */

/**
 * Format requests to separate case_type from course
 * @param {Array} requests - Array of request documents
 * @param {string} role - User role
 * @returns {Array} - Formatted requests
 */
function formatRequests(requests, role) {
    return requests.map(doc => {
        const item = { ...doc };
        
        // Remove sensitive fields based on role
        if (role === 'patient') {
            delete item.patient;
        }
        if (role === 'student') {
            delete item.student;
        }
        delete item.__v;
        
        // Format case_type and course
        if (item.case_type) {
            if (role !== 'patient') {
                item.course_info = item.case_type.course;
            }
            item.case_type = {
                _id: item.case_type._id,
                case_type: item.case_type.case_type
            };
        }
        
        return item;
    });
}

/**
 * Get message based on status
 * @param {string} status - Request status
 * @returns {string} - Status message
 */
function getStatusMessage(status) {
    const messages = {
        processing: 'this is your processing requests',
        finished: 'this is your finished requests',
        rejected: 'this is your rejected requests'
    };
    return messages[status] || 'this is your requests';
}

/**
 * Generic function to get requests by status and role
 * @param {Object} params - Parameters object
 * @param {Object} params.Model - Mongoose model (InProcess, Finished, Rejected)
 * @param {Object} params.user - User object from req.user
 * @returns {Promise<Array>} - Formatted requests
 */
async function getRequestsByStatus({ Model, user }) {
    const role = user.role;
    const isAdmin = user.isAdmin;
    let query = {};
    
    // Build query based on role
    if (isAdmin) {
        query = {};
    } else if (role === 'student') {
        query.student = user.id;
    } else if (role === 'patient') {
        query.patient = user.id;
    } else {
        return [];
    }
    
    // Define populate fields based on role
    let populateFields = [];
    
    if (isAdmin || role === 'student') {
        populateFields.push({
            path: 'patient',
            model: 'Patient_profil',
            foreignField: 'user',
            localField: 'patient',
            select: '-_id first_name father_name last_name'
        });
    }
    
    if (isAdmin || role === 'patient') {
        populateFields.push({
            path: 'student',
            model: 'Student_profile',
            foreignField: 'user',
            localField: 'student',
            select: '-_id first_name father_name last_name'
        });
    }
    
    // Overseer always populated
    populateFields.push({
        path: 'overseer',
        model: 'OverseerProfile',
        foreignField: 'user',
        localField: 'overseer',
        select: '-_id first_name father_name last_name'
    });
    
    // Case type with course population
    populateFields.push({
        path: 'case_type',
        model: 'Treatment',
        populate: {
            path: 'course',
            model: 'Course',
            select: 'course_name'
        }
    });
    
    // Execute query
    let requests = await Model.find(query)
        .select('-__v')
        .populate(populateFields)
        .lean();
    
    // Format requests
    const formattedRequests = formatRequests(requests, role);
    
    return formattedRequests;
}

// Export all functions
module.exports = {
    getRequestsByStatus,
    formatRequests,
    getStatusMessage
};