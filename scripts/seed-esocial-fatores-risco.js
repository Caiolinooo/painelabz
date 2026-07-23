const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const dados = [
  ['AJUDANTE DE COZINHA', 'Auxiliar o cozinheiro na preparação e no serviço de refeições; garantir a qualidade e a segurança alimentar, além de manter a limpeza e a organização da cozinha e dos utensílios utilizados.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['ANALISTA DE FOLHA DE PAGAMENTO', 'Realizar à gestão da folha de pagamento. Acompanhar alterações na legislação trabalhista, controlar admissões, afastamentos, férias e rescisões, preparar documentação para impostos, benefícios e descontos, realizar cálculos de encargos sociais e contribuições.', '09.01.001', 'NA', 'NA'],
  ['ANALISTA DE LOGISTICA', 'Providenciar a logística de embarque e desembarque, além de providenciar transportes aéreos, hospedagens e passagens de acordo com as diretrizes do cliente.', '09.01.001', 'NA', 'NA'],
  ['ANALISTA DE RECURSOS HUMANOS', 'Conduzir os processos de recrutamento, contratação, demissão e renovação de contratos, e seleção de talentos, alinhada às demandas operacionais e comerciais da empresa. Dar suporte a ações comerciais, auxiliando na captação de novos clientes. Assegurar que todos os funcionários contratados no regime CLT estejam de acordo com as legislações brasileiras', '09.01.001', 'NA', 'NA'],
  ['ANALISTA DE SUPORTE TI', 'Prestar suporte técnico aos colaboradores (usuários dos sistemas) identificar e solucionar problemas técnicos, realizando a gestão de chamados e garantindo o cumprimento das requisições, responsáveis por instalação, configuração e manutenção de redes e servidores', '09.01.001', 'NA', 'NA'],
  ['ANALISTA FINANCEIRO', 'Realizar pagamentos, recebimentos de contas, emitir notas fiscais no sistema e manutenção de planilha de controle de gastos, organizar documentos, na apuração dos impostos e realizar o arquivo dos documentos. Controlar o processo de contas pagar e de contas a receber. Realizar compra de material de escritório e itens solicitados.', '09.01.001', 'NA', 'NA'],
  ['ASSISTENTE DE RECRUTAMENTO E SELECAO', 'Realizar triagem de currículos, agendar e conduzir entrevistas individuas, atualizar sistema ou planilha de recrutamento. Enviar proposta salarial e pacote de benefícios para os candidatos em processo, agendar e acompanhar ASO admissional dos candidatos, conferir a documentação pessoal e certificação para admissão.', '09.01.001', 'NA', 'NA'],
  ['ASSISTENTE DE RECURSOS HUMANOS', 'Manter o departamento de logística ciente dos treinamentos, dar suporte ao setor de Recrutamento e Seleção sempre que necessário, auxiliar nas tarefas envolvidas na organização e controle de gestão de pessoas, processos de admissão e demissão, folha de pagamento e renovação de contratos de trabalho', '09.01.001', 'NA', 'NA'],
  ['COORDENADOR (A) DE RELATÓRIOS OFFSHORE', 'Consolidar, organização e elaboração dos relatórios técnicos e operacionais gerados durante as atividades offshore nas áreas de Subsea, Survey e Processamento de Dados. Atua diretamente com registros de atividades operacionais e conformidade com os padrões de qualidade definidos pelo projeto e pelo cliente.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['COZINHEIRO', 'Preparar refeições e garantir a qualidade dos alimentos servidos a bordo, atendendo às necessidades da tripulação. Atuar em ambientes restritos, com conhecimento sobre normas de segurança alimentar e higiene.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['JOVEM APRENDIZ - ADMINISTRATIVO', 'Auxiliar em tarefas administrativas, nos setores de recrutamento e seleção de pessoal, departamento pessoal, logística, treinamento, compras e comunicação. Organizar documentos e itens de escritório, auxiliar na organização de eventos, atendimento a clientes internos e participar em treinamentos e palestras.', '09.01.001', 'NA', 'NA'],
  ['JOVEM APRENDIZ - LOGISTICA', 'Auxiliar em tarefas administrativas, nos setores de logística, treinamento, compras e comunicação, recebimento, conferência, registro de entrada de materiais do escritório. Organização e armazenamento materiais do escritório em estoque organização de documentos e controle de arquivos, auxílio na organização de promoções e eventos atendimento a clientes internos e participação em treinamentos e palestras.', '09.01.001', 'NA', 'NA'],
  ['MARINHEIRO DE CONVES', 'Realizar serviços gerais no passadiço quando solicitado, dar assistência nas operações de carga seguindo as ordens do seu supervisor, realizar manutenções gerais no navio seguindo as ordens do seu supervisor e auxiliar nas operações relacionadas ao lançamento e recuperação de bote salva-vidas.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['PADEIRO', 'Produzir pães e produtos de panificação em ambientes offshore/marítimo. Esse profissional deve garantir a qualidade e a segurança alimentar dos produtos, mantendo um ambiente de trabalho limpo e organizado.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['ONLINE SURVEYOR', 'Realizar levantamentos e medições de dados em tempo real durante operações offshore.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['PILOTO DE ROV', 'Operar e manter sistemas de ROV (Remotely Operated Vehicle) em ambientes offshore, garantindo a execução segura e eficiente de inspeções, manutenções e intervenções submarinas conforme os padrões técnicos e de segurança estabelecidos.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['PROCESSADOR DE DADOS', 'Coletar, analisar e processar dados hidrográficos obtidos durante operações em ambientes offshore, para criar produtos cartográficos. Emitir relatórios detalhados sobre os resultados das análises avaliar a qualidade e a precisão dos dados coletados, identificando e corrigindo eventuais discrepâncias. Realizar manutenções preventivas e corretivas quando necessário.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['SOLDADOR', 'Organizar o local de trabalho: consultar desenhos e especificações, identificar material (consumível) a ser usado na obra, isolar com anteparas o local de trabalho, obedecer a instruções, execuções de inspeção de soldagem, obedecer aos procedimentos de manuseio dos consumíveis preparar peças para soldagem.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['SUPERVISOR DE INSTALAÇÃO', 'Supervisionar atividades de instalação em ambientes offshore.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['SUPERVISOR DE ROV', 'Supervisionar todas as atividades relacionadas à operação de sistemas de ROV (Remotely Operated Vehicle) em ambiente offshore, garantindo a segurança, qualidade, conformidade técnica e eficiência nas operações submarina.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['SURVEYOR', 'Realizar levantamentos e medições precisas de áreas marítimas, incluindo fundos oceânicos, plataformas e estruturas subaquáticas. Conduzir inspeções regulares de estruturas offshore.', '02.01.001', 'Maquinas e Equipamentos', 'Plug 5745'],
  ['TAIFEIRO', 'Organizar, higienizar e arrumar camarotes, refeitórios e cozinhas. Preparação e distribuição de refeições para a tripulação. Controlar de estoque de alimentos e suprimentos, assegurando que estejam devidamente armazenados e dentro do prazo de validade.', '02.01.001 / 03.01.007', 'Embarcação / Manipulação de resíduos', 'Plug 5745 / Luva 15532'],
];

async function seed() {
  console.log('Inserindo fatores de risco...');
  
  for (const [cargo, descricao, codigo, fator, epi] of dados) {
    const { error } = await supabase
      .from('esocial_fatores_risco')
      .upsert(
        {
          cargo,
          descricao_atividades: descricao,
          codigo_fator_risco: codigo,
          descricao_fator_risco: fator,
          epi_utilizado: epi,
        },
        { onConflict: 'cargo', ignoreDuplicates: false }
      );

    if (error) {
      console.error(`Erro ao inserir "${cargo}":`, error.message);
    } else {
      console.log(`  ✓ ${cargo}`);
    }
  }

  console.log(`\nSeed concluído: ${dados.length} cargos inseridos`);
}

seed().catch(console.error);
