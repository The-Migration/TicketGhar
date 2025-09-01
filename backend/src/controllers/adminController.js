const { User, Event, Order, Ticket, QueueEntry } = require('../models');
const { Op } = require('sequelize');

// Get all users with pagination and filtering
exports.getAllUsers = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = req.query;

    const offset = (page - 1) * limit;
    const where = {};

    // Apply filters
    if (search) {
      where[Op.or] = [
        { email: { [Op.iLike]: `%${search}%` } },
        { firstName: { [Op.iLike]: `%${search}%` } },
        { lastName: { [Op.iLike]: `%${search}%` } }
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    const users = await User.findAndCountAll({
      where,
      attributes: [
        'id', 'email', 'firstName', 'lastName', 'role', 'status', 
        'lastLogin', 'createdAt', 'updatedAt'
      ],
      order: [[sortBy, sortOrder]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

    res.json({
      users: users.rows,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(users.count / limit),
        totalItems: users.count,
        itemsPerPage: parseInt(limit)
      }
    });

  } catch (error) {
    console.error('Get all users error:', error);
    res.status(500).json({
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// Get user statistics
exports.getUserStats = async (req, res) => {
  try {
    const totalUsers = await User.count();
    const activeUsers = await User.count({ where: { status: 'active' } });
    const adminUsers = await User.count({ where: { role: 'admin' } });
    const customerUsers = await User.count({ where: { role: 'customer' } });
    
    // Users who logged in today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayUsers = await User.count({
      where: {
        lastLogin: {
          [Op.gte]: today
        }
      }
    });

    // Users who never logged in
    const neverLoggedIn = await User.count({
      where: {
        lastLogin: null
      }
    });

    // Recent users (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentUsers = await User.count({
      where: {
        createdAt: {
          [Op.gte]: sevenDaysAgo
        }
      }
    });

    res.json({
      totalUsers,
      activeUsers,
      adminUsers,
      customerUsers,
      todayUsers,
      neverLoggedIn,
      recentUsers
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

// Get user details with related data
exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findByPk(userId, {
      attributes: [
        'id', 'email', 'firstName', 'lastName', 'role', 'status', 
        'phone', 'lastLogin', 'createdAt', 'updatedAt'
      ],
      include: [
        {
          model: Order,
          as: 'orders',
          attributes: ['id', 'status', 'totalAmount', 'createdAt'],
          include: [
            {
              model: Event,
              as: 'event',
              attributes: ['id', 'name']
            }
          ],
          limit: 10,
          order: [['createdAt', 'DESC']]
        },
        {
          model: QueueEntry,
          as: 'queueEntries',
          attributes: ['id', 'status', 'position', 'createdAt'],
          include: [
            {
              model: Event,
              as: 'event',
              attributes: ['id', 'name']
            }
          ],
          limit: 10,
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ user });

  } catch (error) {
    console.error('Get user details error:', error);
    res.status(500).json({
      message: 'Failed to fetch user details',
      error: error.message
    });
  }
};

// Update user status
exports.updateUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { status } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.status = status;
    await user.save();

    res.json({
      message: 'User status updated successfully',
      user: {
        id: user.id,
        email: user.email,
        status: user.status
      }
    });

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      message: 'Failed to update user status',
      error: error.message
    });
  }
};

// Export users to CSV
exports.exportUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: [
        'email', 'firstName', 'lastName', 'role', 'status', 
        'lastLogin', 'createdAt'
      ],
      order: [['createdAt', 'DESC']]
    });

    // Convert to CSV format
    const csvHeader = 'Email,First Name,Last Name,Role,Status,Last Login,Created At\n';
    const csvData = users.map(user => {
      return [
        user.email,
        user.firstName || '',
        user.lastName || '',
        user.role,
        user.status,
        user.lastLogin ? new Date(user.lastLogin).toISOString() : '',
        new Date(user.createdAt).toISOString()
      ].join(',');
    }).join('\n');

    const csv = csvHeader + csvData;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=users_${new Date().toISOString().split('T')[0]}.csv`);
    res.send(csv);

  } catch (error) {
    console.error('Export users error:', error);
    res.status(500).json({
      message: 'Failed to export users',
      error: error.message
    });
  }
};
