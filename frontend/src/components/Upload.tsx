import React, { useState, useEffect } from "react";
import axios from "axios";

const Upload = () => {
  const [file, setFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState([]);

  const handleUpload = async () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("zip", file);

    try {
      await axios.post("http://localhost:5000/api/jobs/upload/", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          setUploadProgress(percent);
        },
      });

      fetchFiles(); // fetch after upload
    } catch (error) {
      console.error("Upload failed", error);
    }
  };

  const fetchFiles = async () => {
    try {
      const res = await axios.get("http://localhost:5000/files");
      setFiles(res.data);
    } catch (err) {
      console.error("Error fetching files", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  return (
    <div style={{ padding: "20px" }}>
      <h1>Upload ZIP Folder to MongoDB</h1>
      <input
        type="file"
        accept=".zip"
        onChange={(e) => setFile(e.target.files[0])}
      />
      <button onClick={handleUpload} style={{ marginLeft: "10px" }}>
        Upload
      </button>
      <div
        style={{
          width: "100%",
          background: "#eee",
          marginTop: "20px",
          height: "25px",
        }}
      >
        <div
          style={{
            width: `${uploadProgress}%`,
            background: "green",
            height: "100%",
            color: "white",
            textAlign: "center",
            lineHeight: "25px",
          }}
        >
          {uploadProgress > 0 && `${uploadProgress}%`}
        </div>
      </div>

      <h2 style={{ marginTop: "30px" }}>📁 Uploaded Files</h2>
      
    </div>
  );
};

export default Upload;
