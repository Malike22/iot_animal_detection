import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { Save, Key, ArrowLeft } from 'lucide-react';

interface SettingsProps {
  onBack: () => void;
}

interface UserSettings {
  thingspeak_api_key?: string;
  thingspeak_channel_id?: string;
  colab_webhook_url?: string;
  sms_service?: 'twilio' | 'fast2sms';
  sms_api_key?: string;
  sms_phone?: string;
  twilio_account_sid?: string;
  twilio_phone?: string;
}

export default function Settings({ onBack }: SettingsProps) {
  const { user } = useAuth();
  const [settings, setSettings] = useState<UserSettings>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, [user]);

  const loadSettings = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      setSettings(data);
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          ...settings
        });

      if (error) throw error;

      setMessage('Settings saved successfully!');
    } catch (error) {
      setMessage('Error saving settings. Please try again.');
      console.error('Error:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (field: keyof UserSettings, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md mb-6">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <button
              onClick={onBack}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <div className="flex items-center gap-3 mb-6">
            <Key className="w-8 h-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-800">Integration Settings</h1>
          </div>

          {message && (
            <div className={`mb-6 p-4 rounded-lg ${message.includes('success') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
              {message}
            </div>
          )}

          <div className="space-y-8">
            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">ThingSpeak Configuration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Store your captured and labeled images on ThingSpeak cloud platform.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ThingSpeak API Key
                  </label>
                  <input
                    type="text"
                    value={settings.thingspeak_api_key || ''}
                    onChange={(e) => handleChange('thingspeak_api_key', e.target.value)}
                    placeholder="Enter your ThingSpeak Write API Key"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    ThingSpeak Channel ID
                  </label>
                  <input
                    type="text"
                    value={settings.thingspeak_channel_id || ''}
                    onChange={(e) => handleChange('thingspeak_channel_id', e.target.value)}
                    placeholder="Enter your ThingSpeak Channel ID"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Google Colab Integration</h2>
              <p className="text-sm text-gray-600 mb-4">
                Connect your Google Colab notebook for AI-powered animal detection.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Colab Webhook URL
                </label>
                <input
                  type="url"
                  value={settings.colab_webhook_url || ''}
                  onChange={(e) => handleChange('colab_webhook_url', e.target.value)}
                  placeholder="https://your-colab-webhook-url.com/process"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">
                  This URL will receive image data for processing by your trained model.
                </p>
              </div>
            </div>

            <div className="border-b pb-6">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">SMS Notification Settings</h2>
              <p className="text-sm text-gray-600 mb-4">
                Receive instant SMS alerts when animals are detected.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SMS Service Provider
                  </label>
                  <select
                    value={settings.sms_service || ''}
                    onChange={(e) => handleChange('sms_service', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="">Select a provider</option>
                    <option value="twilio">Twilio</option>
                    <option value="fast2sms">Fast2SMS</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Phone Number
                  </label>
                  <input
                    type="tel"
                    value={settings.sms_phone || ''}
                    onChange={(e) => handleChange('sms_phone', e.target.value)}
                    placeholder="+1234567890"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>

                {settings.sms_service === 'twilio' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twilio Account SID
                      </label>
                      <input
                        type="text"
                        value={settings.twilio_account_sid || ''}
                        onChange={(e) => handleChange('twilio_account_sid', e.target.value)}
                        placeholder="AC..."
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twilio Auth Token
                      </label>
                      <input
                        type="password"
                        value={settings.sms_api_key || ''}
                        onChange={(e) => handleChange('sms_api_key', e.target.value)}
                        placeholder="Your Twilio Auth Token"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Twilio Phone Number
                      </label>
                      <input
                        type="tel"
                        value={settings.twilio_phone || ''}
                        onChange={(e) => handleChange('twilio_phone', e.target.value)}
                        placeholder="+1234567890"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}

                {settings.sms_service === 'fast2sms' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Fast2SMS API Key
                    </label>
                    <input
                      type="password"
                      value={settings.sms_api_key || ''}
                      onChange={(e) => handleChange('sms_api_key', e.target.value)}
                      placeholder="Your Fast2SMS API Key"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-8 w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-green-600 to-blue-600 text-white rounded-lg font-semibold hover:from-green-700 hover:to-blue-700 transition disabled:opacity-50"
          >
            <Save className="w-5 h-5" />
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
}
