// Entry point: mounts global providers before the routed app renders.
// Why it exists: auth and toast state need to be available to every feature page.
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';
import { AuthProvider } from '@/components/auth/AuthContext';
import { ToastProvider } from '@/components/ui-custom/ToastProvider';
const rootElement = document.getElementById('root');
if (!rootElement) {
    throw new Error('Root element #root was not found');
}
createRoot(rootElement).render(<AuthProvider>
    <ToastProvider>
      <App />
    </ToastProvider>
  </AuthProvider>);
