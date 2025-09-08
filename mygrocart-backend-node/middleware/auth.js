const jwt = require('jsonwebtoken');
const sampleData = require('../utils/sampleData');

const getUser = async (req) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret');
    const user = sampleData.users.find(u => u.userId === decoded.userId);
    return user;
  } catch (error) {
    return null;
  }
};

module.exports = { getUser };

