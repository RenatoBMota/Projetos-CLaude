-- Medidas da peça (lidas da descrição ou informadas no cadastro) para a
-- requisição por peça. pecas_caixa e area_peca_m2 são calculadas:
-- área por peça = m² da caixa ÷ peças da caixa (bate com o m² do ERP);
-- sem os m² da caixa, usa a medida nominal (largura × comprimento).
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peca_largura_cm numeric(8,2) CHECK (peca_largura_cm > 0);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS peca_comprimento_cm numeric(8,2) CHECK (peca_comprimento_cm > 0);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS m2_caixa numeric(10,3) CHECK (m2_caixa > 0);
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS pecas_caixa integer GENERATED ALWAYS AS (
    NULLIF(round(m2_caixa / (peca_largura_cm * peca_comprimento_cm / 10000)), 0)::integer
) STORED;
ALTER TABLE produtos ADD COLUMN IF NOT EXISTS area_peca_m2 numeric GENERATED ALWAYS AS (
    COALESCE(
        m2_caixa / NULLIF(round(m2_caixa / (peca_largura_cm * peca_comprimento_cm / 10000)), 0),
        peca_largura_cm * peca_comprimento_cm / 10000
    )
) STORED;

-- Quantidade pedida em peças (a quantidade do item continua em m²)
ALTER TABLE itens_solicitacao ADD COLUMN IF NOT EXISTS quantidade_pecas numeric(12,3) CHECK (quantidade_pecas > 0);
