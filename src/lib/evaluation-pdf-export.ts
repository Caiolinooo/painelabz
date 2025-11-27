import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Evaluation } from '@/types';
import { QUESTIONARIO_PADRAO } from './schemas/evaluation-schemas';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
    finalGrade: string;
    // New keys
    employeeLabel: string;
    periodLabel: string;
    employeeEmail: string;
    evaluationPeriod: string;
    approvalDate: string;
    selfEvaluationTitle: string;
    noAnswer: string;
    managerEvaluationTitle: string;
    commentsTitle: string;
    employeeObservations: string;
    managerComments: string;
    finalEmployeeComment: string;
    chartsTitle: string;
    developmentPlanTitle: string;
    developmentPlanIntro: string;
    currentGrade: string;
    recommendation: string;
    recommendationText: string;
    page: string;
    of: string;
    confidential: string;
    // Existing keys
    executiveSummary: string;
    generalScore: string;
    evaluationStats: string;
    competenciesEvaluated: string;
    progress: string;
    strongPoints: string;
    improvementAreas: string;
    highlights: string;
    highestScore: string;
    attentionRequired: string;
    detailedAnalysis: string;
    id: string;
    competency: string;
    grade: string;
    level: string;
    evaluationInfo: string;
    competencyQuestion: string;
    response: string;
    observation: string;
    managerQuestionsAnswered?: string; // New translation key
    collaboratorAnswersIntro?: string; // New translation key
  };
  statusTranslations?: Record<string, string>;
  chartsImage?: string; // Base64 encoded image from html2canvas
  logoImage?: string; // Base64 encoded logo
}

interface PerformanceInsights {
  highestScore: { question: string; score: number; } | null;
  lowestScore: { question: string; score: number; } | null;
  strongAreas: Array<{ question: string; score: number; }>;
  areasForImprovement: Array<{ question: string; score: number; }>;
  averageScore: number;
  totalQuestions: number;
  answeredQuestions: number;
}

// Helper function to get performance level based on score
function getPerformanceLevel(score: number): { text: string; color: [number, number, number] } {
  if (score >= 4.5) return { text: 'Excepcional', color: [34, 197, 94] }; // green-600
  if (score >= 3.5) return { text: 'Excelente', color: [132, 204, 22] }; // lime-600
  if (score >= 2.5) return { text: 'Bom', color: [234, 179, 8] }; // yellow-500
  if (score >= 1.5) return { text: 'Regular', color: [249, 115, 22] }; // orange-500
  return { text: 'Insuficiente', color: [239, 68, 68] }; // red-500
}

// Helper function to get color for score
function getScoreColor(score: number): [number, number, number] {
  if (score >= 4.5) return [34, 197, 94]; // green-600
  if (score >= 3.5) return [132, 204, 22]; // lime-600
  if (score >= 2.5) return [234, 179, 8]; // yellow-500
  if (score >= 1.5) return [249, 115, 22]; // orange-500
  return [239, 68, 68]; // red-500
}

// Helper function to generate stars representation - REMOVED
// function getStars(score: number): string { ... }

// Generate insights from evaluation data
function generateInsights(evaluation: Evaluation): PerformanceInsights {
  const managerQuestions = QUESTIONARIO_PADRAO.filter(q => q.tipo === 'manager');
  // We ONLY count manager questions for statistics and scoring

  const scores: Array<{ question: string; score: number; id: string }> = [];

  // Collect manager question scores
  managerQuestions.forEach(q => {
    const resposta = evaluation.respostas?.[q.id];
    if (resposta?.nota) {
      scores.push({
        id: q.id,
        question: q.titulo || q.pergunta,
        score: resposta.nota
      });
    }
  });

  // Calculate statistics
  const allScores = scores.map(s => s.score);
  const averageScore = allScores.length > 0
    ? allScores.reduce((sum, s) => sum + s, 0) / allScores.length
    : 0;

  // Find highest and lowest
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const highestScore = sorted.length > 0 ? sorted[0] : null;
  const lowestScore = sorted.length > 0 ? sorted[sorted.length - 1] : null;

  // Strong areas (score >= 4)
  const strongAreas = scores.filter(s => s.score >= 4);

  // Areas for improvement (score < 3)
  const areasForImprovement = scores.filter(s => s.score < 3);

  return {
    highestScore,
    lowestScore,
    strongAreas,
    areasForImprovement,
    averageScore,
    totalQuestions: managerQuestions.length, // Only manager questions
    answeredQuestions: scores.length
  };
}

// Add cover page
function addCoverPage(pdf: jsPDF, evaluation: Evaluation, options: PDFExportOptions) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  // Background gradient effect (using rectangles)
  pdf.setFillColor(41, 128, 185); // Blue
  pdf.rect(0, 0, pageWidth, pageHeight / 2, 'F');

  pdf.setFillColor(52, 152, 219); // Lighter blue
  pdf.rect(0, pageHeight / 2, pageWidth, pageHeight / 2, 'F');

  // Logo
  if (options.logoImage) {
    try {
      // Center logo at the top
      const imgWidth = 50;
      const imgHeight = 20; // Assuming landscape logo, adjust as needed
      pdf.addImage(options.logoImage, 'PNG', (pageWidth - imgWidth) / 2, 20, imgWidth, imgHeight);
    } catch (e) {
      console.error('Error adding logo to cover', e);
    }
  }

  // Title Box
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(30, 60, pageWidth - 60, 60, 3, 3, 'F');

  // Title
  pdf.setTextColor(41, 128, 185);
  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  // Split title if too long or just use the translation
  const titleLines = pdf.splitTextToSize(options.translations.title, pageWidth - 80);
  pdf.text(titleLines, pageWidth / 2, 95, { align: 'center' });

  // Employee info box
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(30, 140, pageWidth - 60, 50, 3, 3, 'F');

  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.text(options.translations.employeeLabel, 40, 155);

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(16);
  pdf.text(evaluation.funcionario?.name || 'N/A', 40, 170);

  pdf.setFontSize(12);
  pdf.setTextColor(100, 100, 100);
  pdf.text(evaluation.funcionario?.email || '', 40, 182);

  // Period
  pdf.setFillColor(255, 255, 255);
  pdf.roundedRect(30, 210, pageWidth - 60, 30, 3, 3, 'F');

  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text(options.translations.periodLabel, 40, 225);

  pdf.setFont('helvetica', 'normal');
  const periodoNome = typeof evaluation.periodo === 'string' ? evaluation.periodo : (evaluation.periodo?.nome || 'N/A');
  pdf.text(periodoNome, 40, 235);

  // Footer with date
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text(
    `${options.translations.generatedAt}: ${new Date().toLocaleDateString(options.locale === 'pt' ? 'pt-BR' : 'en-US')}`,
    pageWidth / 2,
    pageHeight - 20,
    { align: 'center' }
  );

  pdf.addPage();
}

// Add executive summary
function addExecutiveSummary(pdf: jsPDF, insights: PerformanceInsights, evaluation: Evaluation, options: PDFExportOptions) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 30; // Increased top margin

  // Title
  pdf.setFontSize(22); // Increased size
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(41, 128, 185);
  pdf.text(options.translations.executiveSummary, 14, yPosition);
  yPosition += 25; // Increased spacing

  // Performance level card
  const performanceLevel = getPerformanceLevel(insights.averageScore);

  pdf.setFillColor(performanceLevel.color[0], performanceLevel.color[1], performanceLevel.color[2]);
  pdf.roundedRect(14, yPosition, pageWidth - 28, 45, 3, 3, 'F'); // Increased height

  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  pdf.text(options.translations.generalScore, pageWidth / 2, yPosition + 12, { align: 'center' });

  pdf.setFontSize(36); // Increased size
  pdf.setFont('helvetica', 'bold');
  pdf.text(insights.averageScore.toFixed(1), pageWidth / 2, yPosition + 28, { align: 'center' });

  pdf.setFontSize(16); // Increased size
  pdf.setFont('helvetica', 'bold');
  pdf.text(performanceLevel.text, pageWidth / 2, yPosition + 38, { align: 'center' });

  yPosition += 65; // Increased spacing

  // Statistics cards
  pdf.setTextColor(60, 60, 60);
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text(options.translations.evaluationStats, 14, yPosition);
  yPosition += 15;

  const statsData = [
    [options.translations.managerQuestionsAnswered || 'Questões do Gerente Respondidas', `${insights.answeredQuestions} / ${insights.totalQuestions}`],
    // Removed Progress, Strong Points, Improvement Areas as requested
  ];

  autoTable(pdf, {
    startY: yPosition,
    body: statsData,
    theme: 'plain',
    styles: {
      fontSize: 11,
      cellPadding: 6, // Reduced padding
      lineColor: [220, 220, 220],
      lineWidth: 0.5
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 120, fillColor: [245, 247, 250] },
      1: { cellWidth: 'auto', halign: 'right', fontStyle: 'bold', textColor: [41, 128, 185] }
    },
    margin: { top: 35 } // Added top margin
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 20; // Reduced spacing

  // Insights section removed as requested
  /*
  if (insights.highestScore || insights.lowestScore) {
    // ... removed code ...
  }
  */
}

// Add competency analysis table with colors
function addCompetencyAnalysis(pdf: jsPDF, evaluation: Evaluation, options: PDFExportOptions) {
  let yPosition = (pdf as any).lastAutoTable?.finalY + 20 || 30; // Reduced spacing

  // Check if we need a new page
  if (yPosition > pdf.internal.pageSize.getHeight() - 100) {
    pdf.addPage();
    yPosition = 40; // Adjusted for header
  }

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(41, 128, 185);
  pdf.text(options.translations.detailedAnalysis, 14, yPosition);
  yPosition += 15; // Increased spacing

  const managerQuestions = QUESTIONARIO_PADRAO.filter(q => q.tipo === 'manager');

  const competencyData = managerQuestions.map(q => {
    const resposta = evaluation.respostas?.[q.id];
    const nota = resposta?.nota || 0;
    const nivel = getPerformanceLevel(nota);

    return {
      id: q.id,
      competencia: q.titulo || q.pergunta,
      nota: nota.toFixed(1),
      // stars: getStars(nota), // Removed
      nivel: nivel.text,
      color: nivel.color
    };
  });

  if (competencyData.length > 0) {
    autoTable(pdf, {
      startY: yPosition,
      head: [[options.translations.id, options.translations.competency, options.translations.grade, options.translations.level]], // Removed score (stars) column
      body: competencyData.map(c => [
        c.id,
        c.competencia,
        c.nota,
        // c.stars, // Removed
        c.nivel
      ]),
      theme: 'grid',
      headStyles: {
        fillColor: [41, 128, 185],
        fontSize: 10,
        fontStyle: 'bold',
        cellPadding: 6 // Reduced padding
      },
      styles: {
        fontSize: 9,
        cellPadding: 6, // Reduced padding
        overflow: 'linebreak',
        halign: 'left'
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 95 }, // Increased width
        2: { cellWidth: 20, halign: 'center', fontStyle: 'bold' },
        // 3: { cellWidth: 25, halign: 'center' }, // Removed
        3: { cellWidth: 40, halign: 'center', fontStyle: 'bold' } // Adjusted index
      },
      didParseCell: function (data) {
        // Color code the nivel column based on performance
        if (data.column.index === 3 && data.section === 'body') { // Index changed from 4 to 3
          const rowData = competencyData[data.row.index];
          if (rowData) {
            data.cell.styles.fillColor = rowData.color;
            data.cell.styles.textColor = [255, 255, 255];
          }
        }
        // Color the nota column
        if (data.column.index === 2 && data.section === 'body') {
          const rowData = competencyData[data.row.index];
          if (rowData) {
            const color = getScoreColor(parseFloat(rowData.nota));
            data.cell.styles.textColor = color;
          }
        }
      },
      margin: { top: 35 } // Added top margin
    });
  }
}

export async function exportEvaluationToPDF(
  evaluation: Evaluation,
  options: PDFExportOptions
) {
  const pdf = new jsPDF();
  const pageWidth = pdf.internal.pageSize.getWidth();

  // Generate insights
  const insights = generateInsights(evaluation);

  // 1. Add cover page
  addCoverPage(pdf, evaluation, options);

  // 2. Add executive summary
  addExecutiveSummary(pdf, insights, evaluation, options);

  pdf.addPage();
  let yPosition = 30;

  // 3. Detailed Information Section
  const statusKey = evaluation.status || 'pendente';
  const translatedStatus = options.statusTranslations?.[statusKey] || statusKey;

  const infoData: string[][] = [
    [options.translations.employeeLabel, evaluation.funcionario?.name || 'N/A'],
    [options.translations.employeeEmail, evaluation.funcionario?.email || 'N/A'],
    [options.translations.evaluator, evaluation.avaliador?.name || 'N/A'],
    [options.translations.periodLabel, typeof evaluation.periodo === 'string' ? evaluation.periodo : (evaluation.periodo?.nome || 'N/A')],
  ];

  if (evaluation.data_inicio && evaluation.data_fim) {
    try {
      const dataInicio = format(new Date(evaluation.data_inicio), 'dd/MM/yyyy', { locale: options.locale === 'pt' ? ptBR : undefined });
      const dataFim = format(new Date(evaluation.data_fim), 'dd/MM/yyyy', { locale: options.locale === 'pt' ? ptBR : undefined });
      infoData.push([options.translations.evaluationPeriod, `${dataInicio} - ${dataFim}`]);
    } catch (e) {
      console.error('Error formatting dates', e);
    }
  }

  infoData.push(
    [options.translations.status, translatedStatus],
    [options.translations.finalGrade, evaluation.nota_final ? evaluation.nota_final.toFixed(2) : insights.averageScore.toFixed(2)]
  );

  if (evaluation.data_aprovacao) {
    try {
      const dataAprovacao = format(new Date(evaluation.data_aprovacao), 'dd/MM/yyyy HH:mm', { locale: options.locale === 'pt' ? ptBR : undefined });
      infoData.push([options.translations.approvalDate, dataAprovacao]);
    } catch (e) {
      console.error('Error formatting approval date', e);
    }
  }

  pdf.setFontSize(18);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(41, 128, 185);
  pdf.text(options.translations.evaluationInfo, 14, yPosition);
  yPosition += 15;

  autoTable(pdf, {
    startY: yPosition,
    body: infoData,
    theme: 'grid',
    styles: {
      fontSize: 10,
      cellPadding: 6, // Reduced padding
      valign: 'middle'
    },
    columnStyles: {
      0: {
        fontStyle: 'bold',
        cellWidth: 70,
        halign: 'right',
        fillColor: [245, 247, 250]
      },
      1: { cellWidth: 'auto', halign: 'left' }
    },
    margin: { top: 35 } // Added top margin
  });

  yPosition = (pdf as any).lastAutoTable.finalY + 20; // Reduced spacing

  // 4. Add competency analysis (Manager Questions)
  addCompetencyAnalysis(pdf, evaluation, options);

  // 5. Manager Evaluation (Detailed)
  const managerQuestions = QUESTIONARIO_PADRAO.filter(q => q.tipo === 'manager');
  const managerData = managerQuestions.map(q => {
    const resposta = evaluation.respostas?.[q.id];
    return [
      q.id,
      q.titulo,
      resposta?.nota ? `${resposta.nota}/5` : '-', // Removed stars
      resposta?.comentario || '-'
    ];
  });

  if (managerData.length > 0) {
    yPosition = (pdf as any).lastAutoTable.finalY + 20; // Reduced spacing

    if (yPosition > pdf.internal.pageSize.getHeight() - 100) {
      pdf.addPage();
      yPosition = 40; // Adjusted for header
    }

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(options.translations.managerEvaluationTitle, 14, yPosition);
    yPosition += 15; // Increased spacing

    autoTable(pdf, {
      startY: yPosition,
      head: [[options.translations.id, options.translations.competency, options.translations.grade, options.translations.observation]],
      body: managerData,
      theme: 'grid',
      headStyles: { fillColor: [52, 152, 219], cellPadding: 8 }, // Reduced padding
      styles: { fontSize: 9, cellPadding: 8, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 55, fontStyle: 'bold' },
        2: { cellWidth: 35, halign: 'center', fontStyle: 'bold' },
        3: { cellWidth: 'auto' }
      },
      margin: { top: 35 } // Added top margin
    });
  }

  // 6. Collaborator Answers (Separated Section)
  const collaboratorQuestions = QUESTIONARIO_PADRAO.filter(q => q.tipo === 'collaborator');
  const collaboratorData = collaboratorQuestions.map(q => {
    const resposta = evaluation.respostas?.[q.id];
    return [
      q.id,
      q.titulo,
      resposta?.comentario || options.translations.noAnswer
    ];
  });

  if (collaboratorData.length > 0) {
    // Force new page for clear separation if needed, or just add spacing
    pdf.addPage(); // New page for collaborator answers to separate clearly
    yPosition = 40; // Adjusted for header

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(options.translations.selfEvaluationTitle, 14, yPosition);
    yPosition += 15; // Increased spacing

    // Add explanatory text
    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(100, 100, 100);
    pdf.text(options.translations.collaboratorAnswersIntro || "Respostas fornecidas pelo colaborador durante a autoavaliação.", 14, yPosition);
    yPosition += 10; // Reduced spacing

    autoTable(pdf, {
      startY: yPosition,
      head: [[options.translations.id, options.translations.competencyQuestion, options.translations.response]],
      body: collaboratorData,
      theme: 'grid',
      headStyles: { fillColor: [44, 62, 80], cellPadding: 8 }, // Darker Blue (Midnight Blue)
      styles: { fontSize: 9, cellPadding: 8, overflow: 'linebreak' },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 60, fontStyle: 'bold' },
        2: { cellWidth: 'auto' }
      },
      margin: { top: 35 } // Added top margin
    });
  }

  // 7. Comments Section
  const hasComments = evaluation.observacoes || evaluation.comentario_gerente || evaluation.comentario_final_funcionario;

  if (hasComments) {
    yPosition = (pdf as any).lastAutoTable.finalY + 20; // Reduced spacing

    if (yPosition > pdf.internal.pageSize.getHeight() - 100) {
      pdf.addPage();
      yPosition = 40; // Adjusted for header
    }

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(options.translations.commentsTitle, 14, yPosition);
    yPosition += 15; // Increased spacing

    const commentsData: string[][] = [];

    if (evaluation.observacoes) {
      commentsData.push([`💬 ${options.translations.employeeObservations}`, evaluation.observacoes]);
    }

    if (evaluation.comentario_gerente) {
      commentsData.push([`👤 ${options.translations.managerComments}`, evaluation.comentario_gerente]);
    }

    if (evaluation.comentario_final_funcionario) {
      commentsData.push([`✓ ${options.translations.finalEmployeeComment}`, evaluation.comentario_final_funcionario]);
    }

    if (commentsData.length > 0) {
      autoTable(pdf, {
        startY: yPosition,
        body: commentsData,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 8, overflow: 'linebreak' },
        columnStyles: {
          0: {
            cellWidth: 65,
            fontStyle: 'bold',
            fillColor: [245, 247, 250],
            textColor: [41, 128, 185]
          },
          1: { cellWidth: 'auto' }
        },
        margin: { top: 35 } // Added top margin
      });
    }
  }

  // 8. Charts Section
  if (options.chartsImage) {
    pdf.addPage(); // Always new page for charts
    yPosition = 40; // Adjusted for header

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(41, 128, 185);
    pdf.text(options.translations.chartsTitle, 14, yPosition);
    yPosition += 15;

    try {
      const imgWidth = pageWidth - 28;
      const imgHeight = (imgWidth * 0.75);

      pdf.addImage(options.chartsImage, 'PNG', 14, yPosition, imgWidth, imgHeight);
    } catch (error) {
      console.error('Failed to add charts image to PDF:', error);
    }
  }

  // 9. Development Plan (if there are areas for improvement)
  if (insights.areasForImprovement.length > 0) {
    yPosition = (pdf as any).lastAutoTable?.finalY + 20 || 30; // Reduced spacing

    // If charts were added, yPosition might be messed up or we need new page check
    if (options.chartsImage) {
      yPosition = 30 + (pageWidth - 28) * 0.75 + 30;
    }

    if (yPosition > pdf.internal.pageSize.getHeight() - 100) {
      pdf.addPage();
      yPosition = 40; // Adjusted for header
    }

    pdf.setFontSize(18);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(249, 115, 22); // Orange
    pdf.text(options.translations.developmentPlanTitle, 14, yPosition);
    yPosition += 15; // Increased spacing

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(60, 60, 60);
    pdf.text(options.translations.developmentPlanIntro, 14, yPosition);
    yPosition += 10; // Reduced spacing

    const developmentData = insights.areasForImprovement.map(area => [
      area.question,
      `${area.score.toFixed(1)}`, // Removed stars
      options.translations.recommendationText
    ]);

    autoTable(pdf, {
      startY: yPosition,
      head: [[options.translations.competency, options.translations.currentGrade, options.translations.recommendation]],
      body: developmentData,
      theme: 'grid',
      headStyles: {
        fillColor: [249, 115, 22],
        textColor: [255, 255, 255],
        cellPadding: 8 // Reduced padding
      },
      styles: {
        fontSize: 10,
        cellPadding: 8 // Reduced padding
      },
      columnStyles: {
        0: { cellWidth: 65, fontStyle: 'bold' },
        1: { cellWidth: 30, halign: 'center' },
        2: { cellWidth: 'auto' }
      },
      margin: { top: 35 } // Added top margin
    });
  }

  // Footer with page numbers and confidential mark
  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);

    // Page number
    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    pdf.text(
      `${options.translations.page} ${i} ${options.translations.of} ${pageCount}`,
      pageWidth / 2,
      pdf.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );

    // Confidential watermark
    pdf.setFontSize(7);
    pdf.text(
      options.translations.confidential,
      14,
      pdf.internal.pageSize.getHeight() - 10
    );

    // Date
    pdf.text(
      format(new Date(), 'dd/MM/yyyy HH:mm', { locale: options.locale === 'pt' ? ptBR : undefined }),
      pageWidth - 14,
      pdf.internal.pageSize.getHeight() - 10,
      { align: 'right' }
    );

    // Logo in Header (for all pages)
    if (options.logoImage) {
      try {
        const imgWidth = 30;
        const imgHeight = 12; // Adjusted size for header
        pdf.addImage(options.logoImage, 'PNG', 14, 10, imgWidth, imgHeight);
      } catch (e) {
        // Ignore error
      }
    }
  }

  return pdf;
}

export function downloadEvaluationPDF(pdf: jsPDF, fileName: string) {
  pdf.save(fileName);
}
