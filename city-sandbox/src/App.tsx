import { useCityStore } from './store/useCityStore';
import { Login } from './ui/Login';
import { AppShell } from './ui/AppShell';

export default function App() {
  const step = useCityStore((s) => s.step);
  if (step === 'login') return <Login />;
  return <AppShell />;
}
