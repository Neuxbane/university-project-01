-- Add per-motorcycle ownership to bolt positions.
-- NULL motorcycle_type_id = shared library / legacy global position.
ALTER TABLE "bolt_positions" ADD COLUMN "motorcycle_type_id" INTEGER;

-- Replace the global unique name constraint with a per-motorcycle one.
DROP INDEX "bolt_positions_name_key";
CREATE UNIQUE INDEX "bolt_positions_motorcycle_type_id_name_key"
  ON "bolt_positions"("motorcycle_type_id", "name");
CREATE INDEX "bolt_positions_motorcycle_type_id_idx"
  ON "bolt_positions"("motorcycle_type_id");

ALTER TABLE "bolt_positions"
  ADD CONSTRAINT "bolt_positions_motorcycle_type_id_fkey"
  FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
