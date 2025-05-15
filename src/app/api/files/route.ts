import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAdminFromRequest } from '@/lib/auth';

// GET - Listar arquivos e pastas
export async function GET(request: NextRequest) {
  try {
    // Verificar se o usuário é administrador
    const adminCheck = await isAdminFromRequest(request);
    if (!adminCheck.isAdmin) {
      return NextResponse.json(
        { success: false, error: 'Acesso não autorizado' },
        { status: 403 }
      );
    }

    // Obter o caminho da consulta
    const { searchParams } = new URL(request.url);
    let requestedPath = searchParams.get('path') || '';

    console.log('Caminho solicitado:', requestedPath);

    // Normalizar o caminho para evitar ataques de path traversal
    const normalizedPath = path.normalize(requestedPath).replace(/^(\.\.(\/|\\|$))+/, '');

    // Verificar se o caminho é relativo à pasta public
    if (!normalizedPath.startsWith('public/') && !normalizedPath.startsWith('public\\')) {
      // Se não começar com public/, assumir que é relativo à pasta public
      requestedPath = path.join('public', normalizedPath);
    } else {
      requestedPath = normalizedPath;
    }

    console.log('Caminho normalizado:', requestedPath);

    // Verificar se o diretório existe
    if (!fs.existsSync(requestedPath)) {
      return NextResponse.json(
        { success: false, error: 'Diretório não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se é um diretório
    const stats = fs.statSync(requestedPath);
    if (!stats.isDirectory()) {
      return NextResponse.json(
        { success: false, error: 'O caminho não é um diretório' },
        { status: 400 }
      );
    }

    // Ler o conteúdo do diretório
    const files = fs.readdirSync(requestedPath);

    // Mapear os arquivos e pastas
    const fileList = files.map(file => {
      const filePath = path.join(requestedPath, file);
      const fileStats = fs.statSync(filePath);

      // Calcular o caminho relativo à pasta public
      let relativePath = filePath;
      if (filePath.startsWith('public/') || filePath.startsWith('public\\')) {
        relativePath = filePath.substring(7); // Remover 'public/'
      }

      // Substituir barras invertidas por barras normais para URLs
      relativePath = relativePath.replace(/\\/g, '/');

      return {
        name: file,
        path: relativePath,
        isDirectory: fileStats.isDirectory(),
        size: fileStats.size,
        lastModified: fileStats.mtime.toISOString()
      };
    });

    return NextResponse.json({ success: true, files: fileList });
  } catch (error) {
    console.error('Erro ao listar arquivos:', error);
    return NextResponse.json(
      { success: false, error: String(error) },
      { status: 500 }
    );
  }
}
