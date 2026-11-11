-- AlterTable
ALTER TABLE "bolt_positions" ADD COLUMN     "photo_url" TEXT;

-- CreateTable
CREATE TABLE "motorcycle_models" (
    "id" SERIAL NOT NULL,
    "motorcycle_type_id" INTEGER NOT NULL,
    "model_url" TEXT NOT NULL,
    "thumbnail_url" TEXT,
    "scale" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "rotation_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "position_annotations" (
    "id" SERIAL NOT NULL,
    "bolt_position_id" INTEGER NOT NULL,
    "motorcycle_type_id" INTEGER NOT NULL,
    "model_id" INTEGER,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "z" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "normal_x" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "normal_y" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "normal_z" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "position_annotations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "motorcycle_models_motorcycle_type_id_idx" ON "motorcycle_models"("motorcycle_type_id");

-- CreateIndex
CREATE INDEX "position_annotations_motorcycle_type_id_idx" ON "position_annotations"("motorcycle_type_id");

-- CreateIndex
CREATE INDEX "position_annotations_bolt_position_id_idx" ON "position_annotations"("bolt_position_id");

-- AddForeignKey
ALTER TABLE "motorcycle_models" ADD CONSTRAINT "motorcycle_models_motorcycle_type_id_fkey" FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_annotations" ADD CONSTRAINT "position_annotations_bolt_position_id_fkey" FOREIGN KEY ("bolt_position_id") REFERENCES "bolt_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_annotations" ADD CONSTRAINT "position_annotations_motorcycle_type_id_fkey" FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "position_annotations" ADD CONSTRAINT "position_annotations_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "motorcycle_models"("id") ON DELETE SET NULL ON UPDATE CASCADE;
