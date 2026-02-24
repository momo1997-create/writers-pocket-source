// User Registration API
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import prisma from '@/lib/prisma';
import { generateAuthorUid } from '@/lib/identity';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, name, phone } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Generate Author UID
    const authorUid = await generateAuthorUid();

    // Generate public URL from name
    const baseUrl = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    let publicUrl = baseUrl;
    let counter = 1;
    while (await prisma.user.findUnique({ where: { publicUrl } })) {
      publicUrl = `${baseUrl}-${counter}`;
      counter++;
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        name,
        phone,
        role: 'AUTHOR',
        publicUrl,
        authorUid,
        importSource: 'manual',
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        publicUrl: true,
        authorUid: true,
      },
    });

    return NextResponse.json({ user, message: 'Registration successful' });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
