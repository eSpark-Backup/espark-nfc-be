const requirePassword = (req, res, next) => {
  req.includePassword = true;
  next();
};

export default requirePassword;
