// controllers/requestController.js
const asyncHandler = require('express-async-handler');
const InProcess = require('../models/InProcess');
const Finished = require('../models/Finished');
const Rejected = require('../models/Rejected');
const { getRequestsByStatus, getStatusMessage } = require('../utils/requestHelper');

/**
 * @desc get user processing requests
 * @route GET /api/request/myProcessing
 */
exports.get_processing_requests = asyncHandler(async (req, res) => {
    const requests = await getRequestsByStatus({
        Model: InProcess,
        user: req.user
    });

    res.status(200).json({
        status: 'success',
        message: getStatusMessage('processing'),
        count: requests.length,
        data: requests
    });
});

/**
 * @desc get finished requests
 */
exports.get_finished_requests = asyncHandler(async (req, res) => {
    const requests = await getRequestsByStatus({
        Model: Finished,
        user: req.user
    });

    res.status(200).json({
        status: 'success',
        message: getStatusMessage('finished'),
        count: requests.length,     // ✅ فقط أضف هذه السطر
        data: requests
    });
});

/**
 * @desc get rejected requests
 */
exports.get_rejected_requests = asyncHandler(async (req, res) => {
    const requests = await getRequestsByStatus({
        Model: Rejected,
        user: req.user
    });

    res.status(200).json({
        status: 'success',
        message: getStatusMessage('rejected'),
        count: requests.length,     // ✅ فقط أضف هذه السطر
        data: requests
    });
});