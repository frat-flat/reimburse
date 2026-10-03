import ResetPasswordForm from './ResetPasswordForm';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <div className="min-h-[70vh] flex items-center justify-center py-6 px-4 sm:px-6 lg:px-8">
      <ResetPasswordForm token={token ?? ''} />
    </div>
  );
}
