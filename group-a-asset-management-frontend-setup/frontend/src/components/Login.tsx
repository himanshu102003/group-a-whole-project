
//NEW AZURE APP:
import { useState } from 'react';
import { Building2, Shield } from 'lucide-react';
import { WorldlineLogo } from './WorldlineLogo';
import { loginRequest, msalInstance } from '../config/authConfig';

type User = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Asset Manager' | 'Technician' | 'Employee';
};

type LoginProps = {
  onLogin: (user: User) => void;
};

export function Login({ onLogin }: LoginProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mock users for demo
  const mockUsers: User[] = [
    { id: '1', name: 'John Admin', email: 'admin@company.com', role: 'Admin' },
    { id: '2', name: 'Sarah Manager', email: 'manager@company.com', role: 'Asset Manager' },
    { id: '3', name: 'Mike Tech', email: 'tech@company.com', role: 'Technician' },
    { id: '4', name: 'Jane Employee', email: 'employee@company.com', role: 'Employee' },
  ];

  const handleAzureLogin = async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (!msalInstance) {
        throw new Error('Azure login is not available. Please use a demo account.');
      }

      const response = await msalInstance.loginPopup(loginRequest);
      console.log('Azure AD Login successful:', response);
      
      if (response.account) {
        const user: User = {
          id: response.account.homeAccountId,
          name: response.account.name || response.account.username,
          email: response.account.username,
          role: determineUserRole(response.account),
        };

        onLogin(user);
      }
    } catch (error: any) {
      console.error('Azure AD Login failed:', error);
      setError(error.message || 'Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const determineUserRole = (account: any): User['role'] => {
    const email = account.username.toLowerCase();
    
    if (email.includes('admin')) return 'Admin';
    if (email.includes('manager')) return 'Asset Manager';
    if (email.includes('tech')) return 'Technician';
    return 'Employee';
  };

  const handleMockLogin = (userIndex: number) => {
    setIsLoading(true);
    setTimeout(() => {
      onLogin(mockUsers[userIndex]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-cyan-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-6">
            <WorldlineLogo className="h-48" />
          </div>
          <h1 className="text-gray-900 mb-2">AssetFlow</h1>
          <p className="text-gray-600">Sign in with your account</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        <button
          onClick={handleAzureLogin}
          disabled={isLoading}
          className="w-full bg-[#00A3A1] text-white py-3 px-4 rounded-lg hover:bg-[#008C8A] transition-colors flex items-center justify-center gap-3 mb-4 disabled:opacity-50"
        >
          <Shield className="w-5 h-5" />
          {isLoading ? 'Signing in...' : 'Sign in with Azure AD'}
        </button>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-gray-700 mb-3">Demo Accounts:</p>
          <div className="space-y-2">
            {mockUsers.map((user, index) => (
              <button
                key={user.id}
                onClick={() => handleMockLogin(index)}
                disabled={isLoading}
                className="w-full text-left px-3 py-2 bg-white border border-gray-200 rounded hover:border-[#00A3A1] hover:bg-teal-50 transition-colors disabled:opacity-50"
              >
                <div className="text-gray-900">{user.name}</div>
                <div className="text-gray-500">{user.role}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 text-center text-gray-500">
          <p>Secured with Azure Active Directory SSO</p>
        </div>
      </div>
    </div>
  );
}



