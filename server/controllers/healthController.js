/**
 * Health Controller
 * Used to verify server status and detect online/offline state by the frontend
 */
const checkHealth = (req, res, next) => {
  try {
    res.status(200).json({
      status: "ok",
      message: "RoadSOS Server is running smoothly"
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkHealth
};
