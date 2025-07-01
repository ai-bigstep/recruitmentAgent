import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import User from './user.model';

interface JobAttributes {
  id: string;
  title: string;
  description: string;
  screening_questions_prompt?: string;
  ats_calculation_prompt?: string;
  type: 'full_time' | 'freelance';
  location: string;
  is_active: string;
  is_published: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  user_id: string;
}

type JobCreationAttributes = Optional<JobAttributes, 'id' | 'screening_questions_prompt' | 'ats_calculation_prompt' | 'is_active' | 'is_published' | 'type' | 'location' | 'user_id' | 'status'>;

class Job extends Model<JobAttributes, JobCreationAttributes> implements JobAttributes {
  public id!: string;
  public title!: string;
  public description!: string;
  public screening_questions_prompt?: string;
  public ats_calculation_prompt?: string;
  public type!: 'full_time' | 'freelance';
  public location!: string;
  public is_active!: string;
  public is_published!: boolean;
  public user_id!: string;
  public status!: 'pending' | 'processing' | 'completed' | 'failed';


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
      allowNull: true,
    },
    ats_calculation_prompt: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('full_time', 'freelance'),
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
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
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
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
