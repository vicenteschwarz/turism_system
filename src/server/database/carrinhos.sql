CREATE TABLE public.carrinho (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
  recomendacao_id BIGINT REFERENCES recomendacoes(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'ativo', -- ativo ou comprado
  criado_em TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE carrinho
ADD COLUMN comprador TEXT;
