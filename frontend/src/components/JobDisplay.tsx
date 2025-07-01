import React, { useEffect, useState } from 'react';
import { Users, UserPlus, Edit, Trash2, X } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface Job {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const JobDisplay = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchJobs = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:5000/api/jobs/', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setJobs(response.data);
      } catch (error) {
        console.error('Failed to fetch jobs:', error);
      }
    };

    if (user) {
      fetchJobs();
    }
  }, [user]);

  const handleViewApplicants = (jobId: string) => {
    console.log('View Applicants clicked for job', jobId);
  };

  const handleAddApplicants = (jobId: string) => {
    setSelectedJobId(jobId);
    setShowModal(true);
  };

  const handleEdit = (jobId: string) => {
    console.log('Edit clicked for job', jobId);
  };

  const handleDelete = (jobId: string) => {
    console.log('Delete clicked for job', jobId);
  };

  const handleFileUpload = async () => {
    if (!selectedFile || !selectedJobId) return;

    const formData = new FormData();
    formData.append('resume', selectedFile);
    

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/jobs/upload/${selectedJobId}`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });
      alert('Resume uploaded successfully!');
      setShowModal(false);
      setSelectedFile(null);
    } catch (err) {
      console.error('Upload failed:', err);
      alert('Upload failed!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-8">
      <h2 className="text-3xl font-bold text-slate-800 text-center mb-10">Your Jobs</h2>

      {jobs.length === 0 ? (
        <div className="text-center text-gray-600">No jobs posted yet.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="bg-white shadow-md rounded-xl p-6 flex flex-col justify-between border border-gray-100"
            >
              <div className="mb-4">
                <div className="text-xl font-semibold text-slate-800 text-center mb-4">
                  {job.title}
                </div>
                <p className="text-gray-600 text-center text-sm">{job.description}</p>
              </div>

              <div className="space-y-3 mb-4">
                <button
                  onClick={() => handleViewApplicants(job.id)}
                  className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center text-sm"
                >
                  <Users className="mr-2 h-4 w-4" />
                  View Applicants
                </button>

                <button
                  onClick={() => handleAddApplicants(job.id)}
                  className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl flex items-center justify-center text-sm"
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Add Applicants
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleEdit(job.id)}
                  className="flex-1 h-10 bg-white border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg flex items-center justify-center text-sm"
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </button>

                <button
                  onClick={() => handleDelete(job.id)}
                  className="flex-1 h-10 bg-white border-2 border-red-200 hover:border-red-300 hover:bg-red-50 text-red-600 rounded-lg flex items-center justify-center text-sm"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md relative">
            <button
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
              onClick={() => setShowModal(false)}
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold mb-4 text-center">Upload Resume</h3>
            <input
              type="file"
              accept=".zip"
              onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              className="block w-full mb-4"
            />
            <button
              onClick={handleFileUpload}
              className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
            >
              Upload
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobDisplay;
