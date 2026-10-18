-- Perfil "requisitante geral": conta compartilhada (computador da loja) em que
-- o promotor informa o próprio nome ao fazer a requisição.
ALTER TYPE perfil_usuario ADD VALUE IF NOT EXISTS 'requisitante_geral';

ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS solicitante_nome text;
ALTER TABLE solicitacoes ADD COLUMN IF NOT EXISTS solicitante_empresa text;
CREATE INDEX IF NOT EXISTS solicitacoes_solicitante_nome_idx ON solicitacoes (lower(solicitante_nome));
