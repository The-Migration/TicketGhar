const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    passwordHash: {
      type: DataTypes.STRING(255),
      field: 'password_hash',
      allowNull: false
    },
    firstName: {
      type: DataTypes.STRING(100),
      field: 'first_name',
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING(100),
      field: 'last_name',
      allowNull: true
    },
    phone: {
      type: DataTypes.STRING(20),
      allowNull: true
    },
    role: {
      type: DataTypes.STRING(20),
      defaultValue: 'customer',
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'active',
      allowNull: false
    },
    lastLogin: {
      type: DataTypes.DATE,
      field: 'last_login',
      allowNull: true
    },
    otpCode: {
      type: DataTypes.STRING(10),
      allowNull: true
    },
    otpExpiresAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isEmailVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    resetPasswordToken: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: 'reset_password_token'
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'reset_password_expires'
    }
  }, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: async (user) => {
        if (user.changed('passwordHash')) {
          user.passwordHash = await bcrypt.hash(user.passwordHash, 12);
        }
      }
    }
  });

  // Virtual field for full name
  User.prototype.getFullName = function() {
    return `${this.firstName || ''} ${this.lastName || ''}`.trim();
  };

  // Instance methods
  User.prototype.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.passwordHash);
  };

  User.prototype.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
  };

  User.prototype.isActive = function() {
    return this.status === 'active';
  };

  User.prototype.can = function(permission) {
    const permissions = {
      admin: ['create_event', 'manage_users', 'view_analytics', 'manage_system'],
      organizer: ['create_event', 'manage_own_events'],
      customer: ['purchase_tickets', 'view_own_orders']
    };
    
    return permissions[this.role]?.includes(permission) || false;
  };

  User.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());
    delete values.passwordHash;
    // Add virtual name field for frontend compatibility
    values.name = this.getFullName();
    return values;
  };

  // Static methods
  User.findByEmail = function(email) {
    return this.findOne({ where: { email } });
  };

  User.findActive = function() {
    return this.findAll({ where: { status: 'active' } });
  };

  User.getByRole = function(role) {
    return this.findAll({ where: { role } });
  };

  return User;
}; 