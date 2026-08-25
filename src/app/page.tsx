import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const currentUser = await getCurrentUser();
  
  if (currentUser) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
}
