// controllers/requestController.js
const asyncHandler = require('express-async-handler');
const { getRequestsByStatus, getStatusMessage } = require('../utils/requestHelper');
const InProcess_request = require('../models/InProcess_request');
const Finished_request = require('../models/Finished_request');
const Rejected_request = require('../models/Rejected_request');

// ============================================================
// 📋 REQUEST CONTROLLER
// ============================================================

/**
 * @desc Get user processing requests
 * @route GET /api/request/myProcessing
 * @access Private (Student, Patient, Admin)
 */
exports.getProcessingRequests = asyncHandler(async (req, res) => {
    const requests = await getRequestsByStatus({
        Model: InProcess_request,
        user: req.user,
        status:'processing'
    });
    res.status(200).json({
        status: 'success',
        message: getStatusMessage('processing'),
        count: requests.length,
        data: requests,
        
    });
});

/**
 * @desc Get user finished requests
 * @route GET /api/request/finished
 * @access Private (Student, Patient, Admin)
 */
exports.getFinishedRequests = asyncHandler(async (req, res) => {
    const requests = await getRequestsByStatus({
        Model: Finished_request,
        user: req.user,
        status:'finished'
    });

    res.status(200).json({
        status: 'success',
        message: getStatusMessage('finished'),
        count: requests.length,
        data: requests
    });
});

/**
 * @desc Get user rejected requests
 * @route GET /api/request/rejected
 * @access Private (Student, Patient, Admin)
 */
exports.getRejectedRequests = asyncHandler(async (req, res) => {
    const requests = await getRequestsByStatus({
        Model: Rejected_request,
        user: req.user,
        status:'rejected',
    });

    res.status(200).json({
        status: 'success',
        message: getStatusMessage('rejected'),
        count: requests.length,
        data: requests
    });
});