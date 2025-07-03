// models/Application.ts


import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { GetObjectCommand } from '@aws-sdk/client-s3';
import s3 from '../config/s3'; // your initialized s3 client


import { DataTypes, Model, Optional } from 'sequelize';
import sequelize from '../config/database';
import Job from './job.model';

interface CandidateAttributes {
  id: string;
  name: string;
  phone: string;
  email: string;
  ats_score: number;
  resume_url: string;
  rating?: number;
  call_scheduled?: Date;
  call_status?: string;
  call_analysis?: string;
  is_accepted?: boolean;
  job_id: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

type CandidateCreationAttributes = Optional<
  CandidateAttributes,
  | 'id'
  | 'rating'
  | 'call_scheduled'
  | 'call_status'
  | 'call_analysis'
  | 'is_accepted'
  | 'status'
>;

class Application
  extends Model<CandidateAttributes, CandidateCreationAttributes>
  implements CandidateAttributes
{
  public id!: string;
  public name!: string;
  public phone!: string;
  public email!: string;
  public ats_score!: number;
  public resume_url!: string;
  public rating?: number;
  public call_scheduled?: Date;
  public call_status?: string;
  public call_analysis?: string;
  public is_accepted?: boolean;
  public job_id!: string;
  public status!: 'pending' | 'processing' | 'completed' | 'failed';

  public readonly createdAt!: Date;
  public readonly updatedAt!: Date;

  // ✅ JSON: Basic Contact Info
  public toContactJSON() {
    return {
      name: this.name,
      email: this.email,
      phone: this.phone,
    };
  }

  // ✅ JSON: Interview Info
  public toInterviewJSON() {
    return {
      call_scheduled: this.call_scheduled,
      call_status: this.call_status,
      call_analysis: this.call_analysis,
      is_accepted: this.is_accepted,
    };
  }
}

Application.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    phone: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    email: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    ats_score: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    resume_url: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    rating: {
      type: DataTypes.FLOAT,
      allowNull: true,
    },
    call_scheduled: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    call_status: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    call_analysis: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    is_accepted: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
      allowNull: false,
      defaultValue: 'pending',
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
  },
  {
    sequelize,
    modelName: 'Candidate',
    tableName: 'applications',
    underscored: true,
  }
);




Application.addHook('afterFind', async (result: any) => {
  const generateSignedUrl = async (key: string) => {
    const command = new GetObjectCommand({
      Bucket: process.env.AWS_BUCKET_NAME!,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3, command, { expiresIn: 60 * 5 }); // 5 minutes
    return signedUrl;
  };

  const assignSignedUrl = async (instance: Application) => {
    if (instance.resume_url) {
      instance.resume_url = await generateSignedUrl(instance.resume_url);
    }
  };

  if (Array.isArray(result)) {
    await Promise.all(result.map(assignSignedUrl));
  } else if (result) {
    await assignSignedUrl(result);
  }
});



// Associations
Application.belongsTo(Job, { foreignKey: 'job_id', as: 'job' });
Job.hasMany(Application, { foreignKey: 'job_id', as: 'candidates' });

export default Application;
