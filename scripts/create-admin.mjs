import prisma from '../lib/prisma.js';
import bcrypt from 'bcryptjs';

async function main() {
  const email = 'admin@local.dev';
  const plainPassword = 'admin123';

  const hashedPassword = await bcrypt.hash(plainPassword, 10);

  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    console.log('❌ Admin user already exists');
    return;
  }

  await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name: 'Local Admin',
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin user created successfully');
  console.log('Email:', email);
  console.log('Password:', plainPassword);
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });