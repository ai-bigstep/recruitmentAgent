// models/ResumeFile.ts
import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Job from './job.model';
import User from './user.model'; // adjust the path if necessary

interface FileAttributes {
  id: string;
  job_id: string;
  user_id: string;
  name: string;
  path: string;
  type: string;
  size: number;
  storage: 's3' | 'local';
}

interface ResumeFileCreationAttributes extends Optional<FileAttributes, 'id'> {}

class File extends Model<FileAttributes, ResumeFileCreationAttributes> implements FileAttributes {
  public id!: string;
  public job_id!: string;
  public user_id!: string;
  public name!: string;
  public path!: string;
  public type!: string;
  public size!: number;
  public storage!: 's3' | 'local';
}

File.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    job_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'jobs',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    path: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pdf',
    },
    size: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    storage: {
      type: DataTypes.ENUM('s3', 'local'),
      allowNull: false,
      defaultValue: 's3',
    },
  },
  {
    sequelize,
    modelName: 'ResumeFile',
    tableName: 'resume_files',
    timestamps: false,
  }
);

// Associations
File.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });
Job.hasMany(File, { foreignKey: 'job_id', as: 'resumes' });

File.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
User.hasMany(File, { foreignKey: 'user_id', as: 'files' });

export default File;
