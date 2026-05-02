-- Simple saved_documents table for persisting generated legal documents
CREATE TABLE IF NOT EXISTS saved_documents (
  id            text PRIMARY KEY,
  title         text NOT NULL DEFAULT 'مستند بدون عنوان',
  content       text NOT NULL,
  doc_type      text NOT NULL DEFAULT 'analysis',
  source_text   text DEFAULT '',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS saved_docs_type_idx ON saved_documents(doc_type);
CREATE INDEX IF NOT EXISTS saved_docs_created_idx ON saved_documents(created_at DESC);
