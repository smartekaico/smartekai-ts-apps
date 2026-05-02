import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { db } from "../lib/db";

async function updateHybridSearchFunction() {
	console.log(
		"🚀 Updating hybrid_search function to include metadata columns...",
	);

	try {
		// Drop existing function by exact type signatures to resolve overloading
		console.log("🗑️ Dropping existing hybrid_search function overloads...");
		await db.query(`
      DROP FUNCTION IF EXISTS hybrid_search(vector,text,integer,text,text,double precision,double precision);
      DROP FUNCTION IF EXISTS hybrid_search(vector,text,integer,text,text,text,text,double precision,double precision);
    `);

		console.log("📝 Creating new hybrid_search function (768-dim)...");
		await db.query(`
      CREATE OR REPLACE FUNCTION hybrid_search(
        query_embedding vector(768),
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
        chunk_id integer,
        document_id integer,
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
            AND (filter_organization_id IS NULL OR d.organization_id = filter_organization_id)
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
            AND (filter_organization_id IS NULL OR d.organization_id = filter_organization_id)
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
    `);

		console.log("✅ hybrid_search function updated successfully!");
	} catch (error) {
		console.error("❌ Error updating hybrid_search function:", error);
		process.exit(1);
	} finally {
		process.exit(0);
	}
}

updateHybridSearchFunction();
