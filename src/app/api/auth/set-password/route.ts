import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import dbConnect from '@/lib/mongodb';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

// Definir o esquema de usuário para o Mongoose (como fallback)
const UserSchema = new mongoose.Schema({
  phoneNumber: { type: String, unique: true },
  email: { type: String, unique: true, sparse: true },
  password: String,
  name: String,
  firstName: String,
  lastName: String,
  role: { type: String, default: 'USER' },
  position: String,
  department: String,
  inviteCode: String,
  inviteAccepted: Boolean,
  inviteAcceptedAt: Date,
  passwordLastChanged: Date,
  active: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Obter o modelo de usuário (ou criar se não existir)
const User = mongoose.models.User || mongoose.model('User', UserSchema);

export async function POST(request: NextRequest) {
  try {
    // Conectar ao MongoDB primeiro para garantir que a conexão esteja estabelecida
    console.log('Conectando ao MongoDB...');
    await dbConnect();

    const { inviteCode, password } = await request.json();

    if (!inviteCode || !password) {
      return NextResponse.json(
        { error: 'Código de convite e senha são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar se a senha atende aos requisitos mínimos
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'A senha deve ter pelo menos 8 caracteres' },
        { status: 400 }
      );
    }

    let user;
    let usedPrisma = true;

    try {
      // Tentar buscar usuário pelo código de convite usando Prisma
      console.log('Buscando usuário com Prisma...');
      user = await prisma.user.findFirst({
        where: {
          inviteCode,
          inviteAccepted: { not: true },
        },
      });
    } catch (prismaError) {
      console.error('Erro ao buscar usuário com Prisma:', prismaError);
      usedPrisma = false;

      // Tentar buscar usuário pelo código de convite usando Mongoose como fallback
      console.log('Tentando buscar usuário com Mongoose como fallback...');
      const mongoUser = await User.findOne({ inviteCode, inviteAccepted: { $ne: true } }).exec();

      if (mongoUser) {
        user = {
          id: mongoUser._id.toString(),
          inviteCode: mongoUser.inviteCode,
          inviteAccepted: mongoUser.inviteAccepted
        };
      }
    }

    if (!user) {
      return NextResponse.json(
        { error: 'Código de convite inválido ou já utilizado' },
        { status: 400 }
      );
    }

    // Gerar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    try {
      if (usedPrisma) {
        // Atualizar usuário usando Prisma
        console.log('Atualizando usuário com Prisma...');
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            inviteAccepted: true,
            inviteAcceptedAt: new Date(),
            passwordLastChanged: new Date(),
          },
        });
      } else {
        // Atualizar usuário usando Mongoose
        console.log('Atualizando usuário com Mongoose...');
        await User.findByIdAndUpdate(user.id, {
          password: hashedPassword,
          inviteAccepted: true,
          inviteAcceptedAt: new Date(),
          passwordLastChanged: new Date(),
          updatedAt: new Date()
        }).exec();
      }
    } catch (updateError) {
      console.error('Erro ao atualizar usuário:', updateError);

      // Tentar atualizar com o método alternativo se o primeiro falhar
      if (usedPrisma) {
        console.log('Tentando atualizar com Mongoose como fallback...');
        await User.findByIdAndUpdate(user.id, {
          password: hashedPassword,
          inviteAccepted: true,
          inviteAcceptedAt: new Date(),
          passwordLastChanged: new Date(),
          updatedAt: new Date()
        }).exec();
      } else {
        console.log('Tentando atualizar com Prisma como fallback...');
        await prisma.user.update({
          where: { id: user.id },
          data: {
            password: hashedPassword,
            inviteAccepted: true,
            inviteAcceptedAt: new Date(),
            passwordLastChanged: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Senha definida com sucesso',
    });
  } catch (error) {
    console.error('Erro ao definir senha:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
