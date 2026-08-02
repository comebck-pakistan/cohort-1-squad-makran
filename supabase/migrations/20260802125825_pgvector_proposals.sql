-- pgvector for Proposal Drafter (M3): retrieval over past-proposal corpus.
-- Past proposals imported at onboarding are stored as rows in `proposals` (state = 'won',
-- client_id null) so we stay within the locked 8-table schema instead of adding a 9th table.
-- Embedding dimension 1536 matches OpenAI text-embedding-3-small.

create extension if not exists vector;

alter table proposals add column embedding vector(1536);

create index proposals_embedding_idx on proposals
  using hnsw (embedding vector_cosine_ops);

-- Cosine-similarity top-k retrieval, scoped to the calling user's own rows (RLS still applies
-- since this runs as the caller via `security invoker`, matching the owner-only policy already
-- on `proposals`).
create function match_proposals(
  query_embedding vector(1536),
  match_owner_id uuid,
  match_count int default 3
)
returns table (
  id uuid,
  title text,
  body text,
  similarity float
)
language sql
stable
security invoker
as $$
  select
    proposals.id,
    proposals.title,
    proposals.body,
    1 - (proposals.embedding <=> query_embedding) as similarity
  from proposals
  where proposals.owner_id = match_owner_id
    and proposals.embedding is not null
  order by proposals.embedding <=> query_embedding
  limit match_count;
$$;

grant execute on function match_proposals(vector(1536), uuid, int) to authenticated, service_role;
