export const checkPermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        message: `Permission '${requiredPermission}' required`
      });
    }

    next();
  };
};
