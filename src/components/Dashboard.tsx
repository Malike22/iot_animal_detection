import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase, CapturedImage, LabeledImage } from '../lib/supabase';
import { LogOut, Camera, Tag, RefreshCw, AlertTriangle, Clock, CheckCircle, Upload, Settings as SettingsIcon } from 'lucide-react';

interface DashboardProps {
  onOpenSettings: () => void;
}

export default function Dashboard({ onOpenSettings }: DashboardProps) {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState<'captured' | 'labeled'>('captured');
  const [capturedImages, setCapturedImages] = useState<CapturedImage[]>([]);
  const [labeledImages, setLabeledImages] = useState<LabeledImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [simulationMode, setSimulationMode] = useState(false);

  useEffect(() => {
    loadImages();
  }, [user]);

  const loadImages = async (silent = false) => {
    if (!user) return;

    if (!silent) setLoading(true);

    const [capturedRes, labeledRes] = await Promise.all([
      supabase
        .from('captured_images')
        .select('*')
        .eq('user_id', user.id)
        .order('detection_timestamp', { ascending: false }),
      supabase
        .from('labeled_images')
        .select('*')
        .eq('user_id', user.id)
        .order('processed_at', { ascending: false })
    ]);

    if (capturedRes.data) setCapturedImages(capturedRes.data);
    if (labeledRes.data) setLabeledImages(labeledRes.data);

    if (!silent) setLoading(false);

    return {
      capturedCount: capturedRes.data?.length || 0,
      labeledCount: labeledRes.data?.length || 0
    };
  };

  const handleSimulateUpload = async (file: File) => {
    if (!user) return;

    try {
      // 1. Prepare FormData
      const formData = new FormData();
      formData.append('image', file);
      formData.append('user_id', user.id); // Send user_id for storage

      // 2. Send to Backend
      // Use env var or default to localhost for dev
      const backendUrl = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

      const response = await fetch(`${backendUrl}/predict`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Upload failed with status ${response.status}`);
      }

      const data = await response.json();

      // Expected backend response:
      // {
      //   "status": "success",
      //   "animal": "Tiger",
      //   "confidence": 98.3
      // }

      // 3. Display Result Immediately
      alert(`Success! Detected: ${data.animal} (${data.confidence.toFixed(1)}%)`);

      // 4. Poll for updates
      // Capture current labeled count before polling starts (from state or fresh fetch)
      // Since state might be stale in closure, let's rely on the fresh fetch from loadImages

      let attempts = 0;
      const maxAttempts = 10;
      const initialLabeledCount = labeledImages.length;

      const pollInterval = setInterval(async () => {
        attempts++;
        const counts = await loadImages(true); // Silent load

        if (counts && counts.labeledCount > initialLabeledCount) {
          clearInterval(pollInterval);
          setActiveTab('labeled');
        } else if (attempts >= maxAttempts) {
          clearInterval(pollInterval);
        }
      }, 2000); // Check every 2 seconds

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error uploading image:', error);
      alert(`Error uploading image: ${errorMessage}`);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const getStatusBadge = (status: string) => {
    const styles = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      failed: 'bg-red-100 text-red-800'
    };

    const icons = {
      pending: <Clock className="w-4 h-4" />,
      processing: <RefreshCw className="w-4 h-4 animate-spin" />,
      completed: <CheckCircle className="w-4 h-4" />,
      failed: <AlertTriangle className="w-4 h-4" />
    };

    return (
      <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${styles[status as keyof typeof styles]}`}>
        {icons[status as keyof typeof icons]}
        {status.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Camera className="w-8 h-8 text-green-600 mr-3" />
              <h1 className="text-xl font-bold text-gray-800">Animal Detection System</h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-600">{user?.email}</span>
              <button
                onClick={onOpenSettings}
                className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                <SettingsIcon className="w-4 h-4" />
                Settings
              </button>
              <button
                onClick={() => signOut()}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-gradient-to-r from-green-600 to-blue-600 rounded-xl p-6 text-white mb-8">
          <h2 className="text-2xl font-bold mb-2">Welcome to Your Dashboard</h2>
          <p className="text-green-100">Monitor and analyze animal detections from your IoT device in real-time</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Simulate Hardware Upload</h3>
            <button
              onClick={() => setSimulationMode(!simulationMode)}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
            >
              {simulationMode ? 'Hide' : 'Show'} Upload
            </button>
          </div>
          {simulationMode && (
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleSimulateUpload(file);
                }}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="flex flex-col items-center cursor-pointer"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <span className="text-gray-600 font-medium">Click to upload an image</span>
                <span className="text-sm text-gray-500 mt-1">Simulates Raspberry Pi capture</span>
              </label>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <div className="flex">
              <button
                onClick={() => setActiveTab('captured')}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${activeTab === 'captured'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Camera className="w-5 h-5" />
                Captured Images ({capturedImages.length})
              </button>
              <button
                onClick={() => setActiveTab('labeled')}
                className={`flex-1 px-6 py-4 font-semibold flex items-center justify-center gap-2 transition ${activeTab === 'labeled'
                  ? 'border-b-2 border-green-600 text-green-600'
                  : 'text-gray-500 hover:text-gray-700'
                  }`}
              >
                <Tag className="w-5 h-5" />
                Labeled Images ({labeledImages.length})
              </button>
            </div>
          </div>

          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
              </div>
            ) : (
              <>
                {activeTab === 'captured' && (
                  <div>
                    {capturedImages.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No captured images yet</p>
                        <p className="text-sm mt-2">Images will appear here when motion is detected</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {capturedImages.map((img) => (
                          <div key={img.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition">
                            <img
                              src={img.image_url}
                              alt="Captured"
                              className="w-full h-48 object-cover bg-gray-100"
                            />
                            <div className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-xs text-gray-500">{formatDate(img.detection_timestamp)}</span>
                                {getStatusBadge(img.status)}
                              </div>
                              {img.thingspeak_url && (
                                <a
                                  href={img.thingspeak_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View on ThingSpeak
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'labeled' && (
                  <div>
                    {labeledImages.length === 0 ? (
                      <div className="text-center py-12 text-gray-500">
                        <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p>No labeled images yet</p>
                        <p className="text-sm mt-2">Processed images with AI detection will appear here</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {labeledImages.map((img) => (
                          <div key={img.id} className="border rounded-lg overflow-hidden hover:shadow-lg transition">
                            <img
                              src={img.labeled_image_url}
                              alt={`Detected ${img.animal_detected}`}
                              className="w-full h-48 object-cover bg-gray-100"
                            />
                            <div className="p-4">
                              <div className="flex justify-between items-start mb-2">
                                <div>
                                  <h3 className="font-bold text-lg text-gray-800">{img.animal_detected}</h3>
                                  {img.confidence_score && (
                                    <p className="text-sm text-gray-600">
                                      Confidence: {img.confidence_score.toFixed(1)}%
                                    </p>
                                  )}
                                </div>
                                {img.sms_sent && (
                                  <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded">
                                    SMS Sent
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-gray-500 mb-2">{formatDate(img.processed_at)}</p>
                              {img.thingspeak_url && (
                                <a
                                  href={img.thingspeak_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-blue-600 hover:underline"
                                >
                                  View on ThingSpeak
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={() => loadImages()}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
