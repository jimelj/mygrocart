const jwt = require('jsonwebtoken');
const User = require('../models/User');

const getUser = async (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return null;
  }

  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Try to get user from database
    const user = await User.findByPk(decoded.userId);

    if (user) {
      // Return user object with isAdmin field
      return {
        userId: user.userId,
        email: user.email,
        isAdmin: user.isAdmin || false
      };
    }

    return null;
  } catch (error) {
    return null;
  }
};

module.exports = { getUser };

