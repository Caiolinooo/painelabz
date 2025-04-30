@echo off
echo Configurando banco de dados PostgreSQL...

echo Gerando cliente Prisma...
npx prisma generate

echo Criando tabelas no PostgreSQL...
npx prisma db push

echo Inicializando usuário administrador...
node scripts/init-postgres-admin.js

echo Migrando dados do MongoDB para o PostgreSQL (se necessário)...
node scripts/migrate-mongodb-to-postgres.js

echo Configuração do banco de dados concluída!
pause
