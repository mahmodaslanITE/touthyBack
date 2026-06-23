// ============================================================
// 📦 UTILS / REQUEST HELPER (التابع المساعد الموحد) - المُحسّن
// ============================================================

const { request } = require("express");

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
        if (role === 'overseer') {
            delete item.overseer;
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
        processing: 'هذه هي طلباتك قيد المعالجة',
        finished: 'هذه هي طلباتك المنتهية',
        rejected: 'هذه هي طلباتك المرفوضة'
    };
    return messages[status] || 'هذه هي طلباتك';
}
function getStatusRequest(model) {
    const messages = {
        processing: 'processing',
        finished: 'finished',
        rejected: 'rejected'
    };
    return messages[model] || 'هذه هي طلباتك';
}


/**
 * Generic function to get requests by status and role
 * @param {Object} params - Parameters object
 * @param {Object} params.Model - Mongoose model (InProcess, Finished, Rejected, Pending_request)
 * @param {Object} params.user - User object from req.user
 * @param {Object} params.additionalQuery - Additional query conditions
 * @returns {Promise<Array>} - Formatted requests
 */
async function getRequestsByStatus({ Model,status, user, additionalQuery = {} }) {
    const role = user.role;
    const isAdmin = user.isAdmin;
    let query = { ...additionalQuery };
    
    // Build query based on role
    if (isAdmin) {
        query = { ...additionalQuery };
    } else if (role === 'student') {
        query.student = user.id;
    } else if (role === 'patient') {
        query.patient = user.id;
    } else if (role === 'overseer') {
        query.overseer = user.id;
    } else {
        return [];
    }
    
    // Define populate fields based on role
    let populateFields = [];
    
    // ✅ Patient population (لجميع الأدوار ما عدا patient نفسه)
    if (role !== 'patient') {
        populateFields.push({
            path: 'patient',
            model: 'Patient_profile',
            foreignField: 'user',
            localField: 'patient',
            select: '-_id first_name father_name last_name'
        });
    }
    
    // ✅ Student population (لجميع الأدوار ما عدا student نفسه)
    if (role !== 'student') {
        populateFields.push({
            path: 'student',
            model: 'Student_profile',
            foreignField: 'user',
            localField: 'student',
            select: '-_id first_name father_name last_name'
        });
    }
    
    // ✅ Overseer population (لجميع الأدوار ما عدا overseer نفسه)
    if (role !== 'overseer') {
        populateFields.push({
            path: 'overseer',
            model: 'Overseer_profile',
            foreignField: 'user',
            localField: 'overseer',
            select: '-_id first_name father_name last_name'
        });
    }
    
    // ✅ Case type with course population (دائماً مطلوب)
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
    requests.map((request)=>{
        request.status=getStatusRequest(status);
       
    })
    // Format requests
    const formattedRequests = formatRequests(requests, role);
    
    
    return formattedRequests;
}

module.exports = {
    getRequestsByStatus,
    formatRequests,
    getStatusMessage,
};