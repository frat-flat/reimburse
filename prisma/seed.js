const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');
  
  // 管理者（幹事）ユーザーの作成
  const adminEmail = 'admin@example.com';
  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      name: '管理者',
      email: adminEmail,
      password: 'password', // 簡易パスワード
      status: 'active',
    },
  });

  console.log(`Created/found admin user: ${admin.name} (${admin.email})`);
  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
