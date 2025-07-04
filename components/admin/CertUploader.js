import { useState } from 'react';
import axios from 'axios';

export default function CertUploader() {
  const [p12File, setP12File] = useState(null);
  const [provisionFile, setProvisionFile] = useState(null);
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setStatus('Đang upload...');

    const formData = new FormData();
    formData.append('p12', p12File);
    formData.append('provision', provisionFile);
    formData.append('password', password);

    try {
      const response = await axios.post('/api/admin/upload-certs', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setStatus(`✅ ${response.data.message}`);
    } catch (error) {
      setStatus(`❌ ${error.response?.data?.message || error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md mt-6">
      <h3 className="text-lg font-semibold mb-4">Upload Chứng Chỉ Signing</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">File .p12:</label>
          <input
            type="file"
            accept=".p12"
            onChange={(e) => setP12File(e.target.files[0])}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">File .mobileprovision:</label>
          <input
            type="file"
            accept=".mobileprovision"
            onChange={(e) => setProvisionFile(e.target.files[0])}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">Password:</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 border rounded"
            required
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`px-4 py-2 rounded text-white ${
            isLoading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isLoading ? 'Đang upload...' : 'Lưu Chứng Chỉ'}
        </button>

        {status && (
          <div className={`p-2 mt-2 rounded ${
            status.includes('✅') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {status}
          </div>
        )}
      </form>
    </div>
  );
}