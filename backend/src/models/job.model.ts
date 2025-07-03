import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

interface JobAttributes {
  id: string;
  title: string;
  description: string;
  screening_questions_prompt?: string;
  ats_calculation_prompt?: string;
  type: 'Full Time' | 'Freelance';
  location: string;
  is_active: string;
  is_published: boolean;
  status: 'pending' | 'queued' | 'completed' | 'failed';
  user_id: string;
}

type JobCreationAttributes = Optional<JobAttributes, 'id' | 'is_active' | 'is_published' |  'user_id' | 'status'>;

class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
  public id!: string;
  public title!: string;
  public description!: string;
  public screening_questions_prompt?: string;
  public ats_calculation_prompt?: string;
  public type!: 'Full Time' | 'Freelance';
  public location!: string;
  public is_active!: string;
  public is_published!: boolean;
  public user_id!: string;
  public status!: 'pending' | 'queued' | 'completed' | 'failed';


  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;
}

Job.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    screening_questions_prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    ats_calculation_prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('Full Time', 'Freelance'),
      allowNull: false,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    is_published: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'queued', 'completed', 'failed'),
      allowNull: true,
      defaultValue: 'pending',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
  },
  {
    sequelize,
    modelName: 'Job',
    tableName: 'jobs',
    underscored: true, // Important for snake_case
  }
);

// Associations
Job.belongsTo(User, { foreignKey: 'user_id', as: 'recruiter' });
User.hasMany(Job, { foreignKey: 'user_id', as: 'jobs' });

export default Job;
