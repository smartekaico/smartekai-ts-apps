-- Task H2 (2026-10-23): per-vehicle affiliate links.
--
-- One row per (part, vehicle) where the product differs by vehicle — shocks,
-- lift kits, wheels, tonneau covers. A part with no row here falls back to
-- parts.affiliate_url, so nothing changes for universal parts.
--
-- Apply to the Neon branch first (direct URL, psql -1), production only with
-- approval. Never db:push:cars.
create table if not exists part_vehicle_links (
  part_id text not null references parts(id) on delete cascade,
  vehicle_id text not null references vehicles(id) on delete cascade,
  url text not null,
  primary key (part_id, vehicle_id)
);
