-- Script para adicionar chaves estrangeiras à tabela avaliacoes_desempenho

-- Adicionar chave estrangeira para funcionario_id
ALTER TABLE avaliacoes_desempenho
ADD CONSTRAINT fk_avaliacoes_desempenho_funcionario
FOREIGN KEY (funcionario_id) REFERENCES funcionarios(id);

-- Adicionar chave estrangeira para avaliador_id
ALTER TABLE avaliacoes_desempenho
ADD CONSTRAINT fk_avaliacoes_desempenho_avaliador
FOREIGN KEY (avaliador_id) REFERENCES funcionarios(id);

-- Adicionar índices para melhorar o desempenho
CREATE INDEX idx_avaliacoes_desempenho_funcionario_id ON avaliacoes_desempenho(funcionario_id);
CREATE INDEX idx_avaliacoes_desempenho_avaliador_id ON avaliacoes_desempenho(avaliador_id);
