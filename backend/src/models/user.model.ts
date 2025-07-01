import { DataTypes, Model } from 'sequelize';
import sequelize from '../config/database';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

class User extends Model {
  public id!: string;
  public name!: string;
  public email!: string;
  public password!: string;
  public role!: 'recruiter' | 'superadmin';

  public validPassword(password: string): boolean {
    return bcrypt.compareSync(password, this.password);
  }
}

// Utility to generate a random 10-character alphanumeric string
function generateRandomId(length = 10): string {
  return crypto.randomBytes(Math.ceil(length / 2))
               .toString('hex')
               .slice(0, length);
}

User.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    email: {
      type: new DataTypes.STRING(128),
      allowNull: false,
      unique: true,
    },
    password: {
      type: new DataTypes.STRING(128),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('recruiter', 'superadmin'),
      allowNull: false,
      defaultValue: 'recruiter',
    },
  },
  {
    tableName: 'users',
    sequelize,
    hooks: {
      beforeCreate: async (user: User) => {
        // Generate unique random ID
        

        // Hash password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(user.password, salt);
      },
    },
  }
);

export default User;
