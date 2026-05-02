-- ═══════════════════════════════════════════════════════════════
-- Kuwait Legal AI — Neon pgvector Schema
-- Run this in your Neon SQL console or via migration tool
-- ═══════════════════════════════════════════════════════════════

-- 0) Enable extensions
CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- ═══════════════════════════════════════════════════════════════
-- 1) JURISDICTIONS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kb_jurisdictions (
  id            text PRIMARY KEY,
  name_ar       text NOT NULL,
  name_en       text NOT NULL,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  metadata      jsonb DEFAULT '{}'::jsonb
);

INSERT INTO kb_jurisdictions (id, name_ar, name_en) VALUES
  ('kuwait', 'الكويت', 'Kuwait')
ON CONFLICT (id) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 2) CATEGORIES
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kb_categories (
  id            text NOT NULL,
  jurisdiction  text NOT NULL REFERENCES kb_jurisdictions(id),
  slug          text UNIQUE NOT NULL,
  name_ar       text NOT NULL,
  name_en       text NOT NULL,
  description   text,
  primary_law   text,
  court         text,
  keywords      text[] DEFAULT '{}',
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  metadata      jsonb DEFAULT '{}'::jsonb,
  PRIMARY KEY (id, jurisdiction)
);

INSERT INTO kb_categories (id, jurisdiction, name_ar, name_en, description) VALUES
  ('civil',             'kuwait', 'مدني',                'Civil',                    'القضايا المدنية العامة'),
  ('commercial',        'kuwait', 'تجاري',               'Commercial',               'قضايا الشركات والتجارة'),
  ('labor',             'kuwait', 'عمالي',               'Labor',                    'قضايا العمل والعمال'),
  ('personal_status',   'kuwait', 'أحوال شخصية',         'Personal Status',          'قضايا الأسرة'),
  ('real_estate',       'kuwait', 'عقاري',               'Real Estate',              'قضايا الملكية العقارية'),
  ('traffic',           'kuwait', 'مرور',                'Traffic',                  'قضايا المرور والحوادث'),
  ('penal_financial',   'kuwait', 'جرائم مالية (شيكات)', 'Financial Crimes',         'جرائم الشيكات بدون رصيد'),
  ('penal_cyber',       'kuwait', 'جرائم إلكترونية',     'Cyber Crimes',             'جرائم تقنية المعلومات'),
  ('penal_persons',     'kuwait', 'جنح ضد الأشخاص',     'Misdemeanors vs Persons',  'ضرب وسب وقذف وتهديد'),
  ('penal_narcotics',   'kuwait', 'مخدرات ومؤثرات',      'Narcotics',                'حيازة وتعاطي واتجار')
ON CONFLICT (id, jurisdiction) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════
-- 3) DOCUMENTS
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kb_documents (
  id            bigserial PRIMARY KEY,
  jurisdiction  text NOT NULL REFERENCES kb_jurisdictions(id),
  category_id   text,
  doc_type      text NOT NULL,
  title         text NOT NULL,
  title_en      text,
  slug          text UNIQUE NOT NULL,
  source_ref    text,
  source_url    text,
  language      text DEFAULT 'ar',
  version       text DEFAULT '1.0',
  raw_markdown  text NOT NULL,
  frontmatter   jsonb DEFAULT '{}'::jsonb,
  file_hash     text NOT NULL,
  status        text DEFAULT 'active',
  uploaded_by   text DEFAULT 'system',
  tags          text[] DEFAULT '{}',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  metadata      jsonb DEFAULT '{}'::jsonb
);

CREATE UNIQUE INDEX IF NOT EXISTS kb_documents_hash_idx
  ON kb_documents(file_hash) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS kb_documents_jurisdiction_idx
  ON kb_documents(jurisdiction);
CREATE INDEX IF NOT EXISTS kb_documents_doc_type_idx
  ON kb_documents(doc_type);
CREATE INDEX IF NOT EXISTS kb_documents_category_idx
  ON kb_documents(category_id);
CREATE INDEX IF NOT EXISTS kb_documents_status_idx
  ON kb_documents(status);
CREATE INDEX IF NOT EXISTS kb_documents_tags_idx
  ON kb_documents USING gin(tags);

-- ═══════════════════════════════════════════════════════════════
-- 4) CHUNKS — using 1536d for OpenAI text-embedding-3-small
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kb_chunks (
  id              bigserial PRIMARY KEY,
  document_id     bigint NOT NULL REFERENCES kb_documents(id) ON DELETE CASCADE,
  chunk_index     int NOT NULL,
  chunk_id        text,
  heading_path    text,
  heading_level   int DEFAULT 0,
  content_md      text NOT NULL,
  content_text    text NOT NULL,
  tokens_est      int DEFAULT 0,
  embedding       vector(1536),
  citation_label  text,
  created_at      timestamptz DEFAULT now(),
  metadata        jsonb DEFAULT '{}'::jsonb,
  UNIQUE(document_id, chunk_index)
);

-- Full-text search column (auto-generated)
ALTER TABLE kb_chunks
  ADD COLUMN IF NOT EXISTS content_tsv tsvector
  GENERATED ALWAYS AS (
    to_tsvector('simple', coalesce(content_text, ''))
  ) STORED;

-- Indexes
CREATE INDEX IF NOT EXISTS kb_chunks_doc_idx
  ON kb_chunks(document_id);
CREATE INDEX IF NOT EXISTS kb_chunks_citation_idx
  ON kb_chunks(citation_label) WHERE citation_label IS NOT NULL;
CREATE INDEX IF NOT EXISTS kb_chunks_tsv_idx
  ON kb_chunks USING gin(content_tsv);

-- HNSW vector index (cosine similarity)
CREATE INDEX IF NOT EXISTS kb_chunks_embedding_hnsw_idx
  ON kb_chunks USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- ═══════════════════════════════════════════════════════════════
-- 5) UPLOAD LOG
-- ═══════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS kb_upload_log (
  id            bigserial PRIMARY KEY,
  document_id   bigint REFERENCES kb_documents(id),
  action        text NOT NULL,
  status        text NOT NULL,
  error_message text,
  chunks_count  int DEFAULT 0,
  duration_ms   int DEFAULT 0,
  uploaded_by   text,
  created_at    timestamptz DEFAULT now()
);

-- ═══════════════════════════════════════════════════════════════
-- 6) HELPER FUNCTIONS
-- ═══════════════════════════════════════════════════════════════

-- Function: Search chunks by embedding + optional filters
CREATE OR REPLACE FUNCTION search_chunks(
  query_embedding vector(1536),
  match_count int DEFAULT 10,
  filter_jurisdiction text DEFAULT NULL,
  filter_doc_type text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_organization_id text DEFAULT NULL,
  similarity_threshold float DEFAULT 0.5
)
RETURNS TABLE (
  chunk_id bigint,
  document_id bigint,
  doc_title text,
  doc_type text,
  jurisdiction text,
  category_id text,
  heading_path text,
  content_md text,
  content_text text,
  citation_label text,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS chunk_id,
    c.document_id,
    d.title AS doc_title,
    d.doc_type,
    d.jurisdiction,
    d.category_id,
    c.heading_path,
    c.content_md,
    c.content_text,
    c.citation_label,
    (1 - (c.embedding <=> query_embedding))::float AS similarity
  FROM kb_chunks c
  JOIN kb_documents d ON d.id = c.document_id
  WHERE
    d.status = 'active'
    AND c.embedding IS NOT NULL
    AND (filter_jurisdiction IS NULL OR d.jurisdiction = filter_jurisdiction)
    AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
    AND (filter_category IS NULL OR d.category_id = filter_category)
    AND (d.organization_id IS NULL OR d.organization_id = filter_organization_id)
    AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
  ORDER BY c.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Function: Hybrid search (vector + full-text)
CREATE OR REPLACE FUNCTION hybrid_search(
  query_embedding vector(1536),
  query_text text,
  match_count int DEFAULT 10,
  filter_jurisdiction text DEFAULT NULL,
  filter_doc_type text DEFAULT NULL,
  filter_category text DEFAULT NULL,
  filter_organization_id text DEFAULT NULL,
  vector_weight float DEFAULT 0.7,
  text_weight float DEFAULT 0.3
)
RETURNS TABLE (
  chunk_id bigint,
  document_id bigint,
  doc_title text,
  doc_type text,
  jurisdiction text,
  category_id text,
  heading_path text,
  content_md text,
  citation_label text,
  vector_score float,
  text_score float,
  combined_score float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH vector_results AS (
    SELECT
      c.id,
      c.document_id,
      d.title,
      d.doc_type,
      d.jurisdiction,
      d.category_id,
      c.heading_path,
      c.content_md,
      c.citation_label,
      (1 - (c.embedding <=> query_embedding))::float AS v_score
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    WHERE d.status = 'active'
      AND c.embedding IS NOT NULL
      AND (filter_jurisdiction IS NULL OR d.jurisdiction = filter_jurisdiction)
      AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
      AND (filter_category IS NULL OR d.category_id = filter_category)
      AND (d.organization_id IS NULL OR d.organization_id = filter_organization_id)
    ORDER BY c.embedding <=> query_embedding
    LIMIT match_count * 3
  ),
  text_results AS (
    SELECT
      c.id,
      ts_rank(c.content_tsv, plainto_tsquery('simple', query_text))::float AS t_score
    FROM kb_chunks c
    JOIN kb_documents d ON d.id = c.document_id
    WHERE d.status = 'active'
      AND c.content_tsv @@ plainto_tsquery('simple', query_text)
      AND (filter_jurisdiction IS NULL OR d.jurisdiction = filter_jurisdiction)
      AND (filter_doc_type IS NULL OR d.doc_type = filter_doc_type)
      AND (filter_category IS NULL OR d.category_id = filter_category)
      AND (d.organization_id IS NULL OR d.organization_id = filter_organization_id)
  )
  SELECT
    vr.id AS chunk_id,
    vr.document_id,
    vr.title AS doc_title,
    vr.doc_type,
    vr.jurisdiction,
    vr.category_id,
    vr.heading_path,
    vr.content_md,
    vr.citation_label,
    vr.v_score AS vector_score,
    COALESCE(tr.t_score, 0) AS text_score,
    (vr.v_score * vector_weight + COALESCE(tr.t_score, 0) * text_weight)::float
      AS combined_score
  FROM vector_results vr
  LEFT JOIN text_results tr ON tr.id = vr.id
  ORDER BY (vr.v_score * vector_weight + COALESCE(tr.t_score, 0) * text_weight) DESC
  LIMIT match_count;
END;
$$;
