const { createOrder, verifyPayment, getOrderHistory, getOrderDetails } = require('../services/payment-service');
const { HTTP_STATUS } = require('../utils/constants');

const createOrderController = async (req, res) => {
  try {
    const { totalAmount, shippingAddress } = req.body;

    if (!totalAmount || !shippingAddress) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json({
        message: 'Total amount and shipping address are required'
      });
    }

    const result = await createOrder(req.user._id, { totalAmount, shippingAddress });
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    const message = error.message || JSON.stringify(error) || 'Something went wrong';
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message });
  }
};

const verifyPaymentController = async (req, res) => {
  try {
    const result = await verifyPayment(req.body);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.BAD_REQUEST).json({ message: error.message });
  }
};

const getOrderHistoryController = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const result = await getOrderHistory(req.user._id, page, limit);
    res.status(HTTP_STATUS.OK).json(result);
  } catch (error) {
    res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
  }
};

const getOrderDetailsController = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await getOrderDetails(orderId, req.user._id);
    res.status(HTTP_STATUS.OK).json(order);
  } catch (error) {
    res.status(HTTP_STATUS.NOT_FOUND).json({ message: error.message });
  }
};

module.exports = {
  createOrderController,
  verifyPaymentController,
  getOrderHistoryController,
  getOrderDetailsController
};
