import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
const CreateEditJobPage: React.FC = () => {
  const [jobTitle, setJobTitle] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [screeningPrompt, setScreeningPrompt] = useState('');
  const [atsPrompt, setATSPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
 const navigate = useNavigate();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const token = localStorage.getItem('token'); // Or get from context

    try {
      const response = await axios.post(
        'http://localhost:5000/api/jobs/',
        {
          title: jobTitle,
          description: jobDescription,
          screening_questions_prompt: screeningPrompt,
          ats_calculation_prompt: atsPrompt,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setMessage({ type: 'success', text: 'Job created successfully!' });
      setJobTitle('');
      setJobDescription('');
      setScreeningPrompt('');
      setATSPrompt('');
    } catch (error: any) {
      const errMsg =
        error.response?.data?.message || error.message || 'Failed to submit job';
      setMessage({ type: 'error', text: errMsg });
    } finally {
      setLoading(false);
      navigate('/'); // Redirect to home or job list after submission
    }
  };

  const handleAIGenerate = () => {
    setJobDescription('Generated job description using AI...');
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl p-8">
        <h1 className="text-2xl font-semibold text-center mb-6 text-gray-800">
          Bigstep HR Assistant - Create/Edit Job Page
        </h1>
        <p className="text-sm text-right text-gray-500 mb-6">
          Logged in as{' '}
          <span className="font-medium text-gray-700">
            recruiter1@bigsteptech.com
          </span>
        </p>

        {message && (
          <div
            className={`mb-4 px-4 py-2 rounded text-sm ${
              message.type === 'success'
                ? 'bg-green-100 text-green-700'
                : 'bg-red-100 text-red-700'
            }`}
          >
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Title
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter job title"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Job Description
            </label>
            <div className="relative">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 pr-28 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                placeholder="Write job description here"
                required
              />
              <button
                type="button"
                onClick={handleAIGenerate}
                className="absolute right-2 top-2 text-sm bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1 rounded-md border border-blue-300 transition"
              >
                Use <i>AI</i> to generate
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Screening Questions Prompt
            </label>
            <textarea
              value={screeningPrompt}
              onChange={(e) => setScreeningPrompt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Enter screening questions prompt"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              ATS Calculation Prompt
            </label>
            <textarea
              value={atsPrompt}
              onChange={(e) => setATSPrompt(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
              placeholder="Enter ATS calculation prompt"
            />
          </div>

          <div className="text-center">
            <button
              type="submit"
              disabled={loading}
              className={`bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-xl transition shadow-md ${
                loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {loading ? 'Submitting...' : 'Submit / Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateEditJobPage;
