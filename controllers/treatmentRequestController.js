const { TreatmentRequest, validateTreatmentRequest } = require('../models/Requisition');
/**
 * @desc add new requistion
 * @route api/requestion
 * @method POST
 * @access private
 */
exports.createTreatmentRequest = async (req, res) => {
  const user = req.user
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  const { error } = validateTreatmentRequest(req.body);
  if (error) {
    return res.status(400).json({ errors: error.details.map(d => d.message) });
  }

  try {
    const request = new TreatmentRequest({
      ...req.body,
      user: user.id // ربط الطلب بالمستخدم من التوكن
    });
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// جلب جميع الطلبات الخاصة بالمستخدم
exports.getUserTreatmentRequests = async (req, res) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  try {
    const requests = await TreatmentRequest.find({ user: user.id });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// جلب طلب واحد
exports.getTreatmentRequestById = async (req, res) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  try {
    const request = await TreatmentRequest.findOne({ _id: req.params.id, user: user.id });
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// تحديث طلب
exports.updateTreatmentRequest = async (req, res) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  const { error } = validateTreatmentRequest(req.body);
  if (error) {
    return res.status(400).json({ errors: error.details.map(d => d.message) });
  }

  try {
    const request = await TreatmentRequest.findOneAndUpdate(
      { _id: req.params.id, user: user.id },
      req.body,
      { new: true, runValidators: true }
    );
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    res.json(request);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// حذف طلب
exports.deleteTreatmentRequest = async (req, res) => {
  const user = verifyToken(req);
  if (!user) {
    return res.status(401).json({ error: 'توكن غير صالح أو غير موجود' });
  }

  try {
    const request = await TreatmentRequest.findOneAndDelete({ _id: req.params.id, user: user.id });
    if (!request) {
      return res.status(404).json({ error: 'الطلب غير موجود' });
    }
    res.json({ message: 'تم حذف الطلب بنجاح' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
