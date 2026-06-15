export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error(`[${req.method} ${req.path}]`, err.message);
    res.status(500).json({ error: err.message });
  });
};
