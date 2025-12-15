
import jsPDF from 'jspdf';
import 'jspdf-autotable';

// Configuração de formatação
const FORMAT_CURRENCY = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const FORMAT_DATE = new Intl.NumberFormat('pt-BR', {
  minimumIntegerDigits: 2,
});

function formatDate(dateString: string | Date): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR');
}

interface ReimbursementData {
  id: string;
  created_at: string;
  valor: number;
  descricao: string;
  status: string;
  user_email?: string;
  user_name?: string;
  manager_name?: string;
  department?: string;
  category?: string;
  items?: Array<{
    date: string;
    description: string;
    amount: number;
    category?: string;
  }>;
}

export async function generateReimbursementPDF(data: ReimbursementData): Promise<Buffer> {
  // Criar documento PDF A4
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  // Cores da marca (azul escuro e cinza)
  const PRIMARY_COLOR = [0, 51, 102]; // Azul escuro
  const ACCENT_COLOR = [240, 240, 240]; // Cinza claro para cabeçalhos

  // Título
  doc.setFontSize(18);
  doc.setTextColor(PRIMARY_COLOR[0], PRIMARY_COLOR[1], PRIMARY_COLOR[2]);
  doc.text('Relatório de Despesas', 105, 20, { align: 'center' });

  // Informações do Colaborador (Cabeçalho)
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);

  const startY = 35;
  const col1 = 15;
  const col2 = 110;

  // Linha 1
  doc.setFont('helvetica', 'bold');
  doc.text('Nome do Funcionário:', col1, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.user_name || data.user_email || 'N/A', col1 + 40, startY);

  doc.setFont('helvetica', 'bold');
  doc.text('Data do Relatório:', col2, startY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(new Date()), col2 + 35, startY);

  // Linha 2
  doc.setFont('helvetica', 'bold');
  doc.text('Departamento:', col1, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(data.department || 'N/A', col1 + 40, startY + 7);

  doc.setFont('helvetica', 'bold');
  doc.text('ID da Solicitação:', col2, startY + 7);
  doc.setFont('helvetica', 'normal');
  doc.text(data.id.slice(0, 8), col2 + 35, startY + 7);

  // Tabela de Despesas
  // Se houver items detalhados, usa eles. Se não, usa o item único do reembolso.
  const expenses = data.items && data.items.length > 0
    ? data.items
    : [{
      date: data.created_at,
      description: data.descricao,
      category: data.category || 'Geral',
      amount: data.valor
    }];

  const tableBody = expenses.map(item => [
    formatDate(item.date),
    item.description,
    item.category || '',
    FORMAT_CURRENCY.format(item.amount)
  ]);

  // Adicionar totais
  const totalAmount = expenses.reduce((sum, item) => sum + Number(item.amount), 0);

  (doc as any).autoTable({
    startY: startY + 20,
    head: [['Data', 'Descrição', 'Categoria', 'Valor (R$)']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: PRIMARY_COLOR,
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    foot: [['', '', 'TOTAL A REEMBOLSAR', FORMAT_CURRENCY.format(totalAmount)]],
    footStyles: {
      fillColor: ACCENT_COLOR,
      textColor: [0, 0, 0],
      fontStyle: 'bold',
    },
  });

  const finalY = (doc as any).lastAutoTable.finalY + 20;

  // Assinaturas
  doc.setFontSize(10);
  doc.text('_____________________________________', 20, finalY + 20);
  doc.text('Assinatura do Colaborador', 20, finalY + 25);
  doc.text(data.user_name || 'Funcionário', 20, finalY + 30);

  doc.text('_____________________________________', 110, finalY + 20);
  doc.text('Assinatura do Aprovador', 110, finalY + 25);
  doc.text(data.manager_name || 'Gestor Responsável', 110, finalY + 30);

  // Disclaimer
  doc.setFontSize(8);
  doc.setTextColor(150, 150, 150);
  doc.text(
    'Este documento foi gerado automaticamente pelo Sistema Painel ABZ.',
    105,
    280,
    { align: 'center' }
  );

  return Buffer.from(doc.output('arraybuffer'));
}
