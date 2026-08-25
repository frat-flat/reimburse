import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import LoginForm from './LoginForm';

export default async function LoginPage() {
  const currentUser = await getCurrentUser();
  if (currentUser) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
      <LoginForm />
    </div>
  );
}

