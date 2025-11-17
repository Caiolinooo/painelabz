import jsPDF from 'jspdf';
import { Evaluation } from '@/types';

interface PDFExportOptions {
  locale: string;
  translations: {
    title: string;
    employee: string;
    evaluator: string;
    period: string;
    status: string;
    date: string;
    selfEvaluation: string;
    managerialEvaluation: string;
    question: string;
    score: string;
    comment: string;
    noComment: string;
    generatedAt: string;
  };
}

export async function exportEvaluationToPDF(
  evaluation: Evaluation,
  options: PDFExportOptions
) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  let yPosition = 20;

  // Header
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text(options.translations.title, pageWidth / 2, yPosition, { align: 'center' });
  
  yPosition += 15;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`${options.translations.generatedAt}: ${new Date().toLocaleString(options.locale)}`, pageWidth / 2, yPosition, { align: 'center' });

  yPosition += 15;

  // Info section
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${options.translations.employee}:`, 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(evaluation.funcionario?.name || 'N/A', 70, yPosition);

  yPosition += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${options.translations.evaluator}:`, 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(evaluation.avaliador?.name || 'N/A', 70, yPosition);

  yPosition += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${options.translations.period}:`, 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(evaluation.periodo?.nome || evaluation.periodo || 'N/A', 70, yPosition);

  yPosition += 8;
  pdf.setFont('helvetica', 'bold');
  pdf.text(`${options.translations.status}:`, 20, yPosition);
  pdf.setFont('helvetica', 'normal');
  pdf.text(evaluation.status || 'N/A', 70, yPosition);

  yPosition += 15;

  // Respostas
  if (evaluation.respostas && Object.keys(evaluation.respostas).length > 0) {
    const respostas = evaluation.respostas as Record<string, any>;
    
    Object.entries(respostas).forEach(([questionId, resposta], index) => {
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        pdf.addPage();
        yPosition = 20;
      }

      // Question number
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`${options.translations.question} ${index + 1}`, 20, yPosition);
      
      yPosition += 7;

      // Score
      if (resposta.nota !== undefined && resposta.nota !== null) {
        pdf.setFont('helvetica', 'normal');
        pdf.text(`${options.translations.score}: ${resposta.nota}/5`, 25, yPosition);
        yPosition += 7;
      }

      // Comment
      if (resposta.comentario) {
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${options.translations.comment}:`, 25, yPosition);
        yPosition += 5;
        
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(10);
        const lines = pdf.splitTextToSize(resposta.comentario, pageWidth - 50);
        lines.forEach((line: string) => {
          if (yPosition > pageHeight - 20) {
            pdf.addPage();
            yPosition = 20;
          }
          pdf.text(line, 25, yPosition);
          yPosition += 5;
        });
      } else {
        pdf.setFont('helvetica', 'italic');
        pdf.setFontSize(10);
        pdf.text(options.translations.noComment, 25, yPosition);
        yPosition += 5;
      }

      yPosition += 5;
    });
  }

  return pdf;
}

export function downloadEvaluationPDF(pdf: jsPDF, fileName: string) {
  pdf.save(fileName);
}
