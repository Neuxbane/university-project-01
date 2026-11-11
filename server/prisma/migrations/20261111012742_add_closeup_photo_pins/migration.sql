-- CreateTable
CREATE TABLE "close_up_photos" (
    "id" SERIAL NOT NULL,
    "motorcycle_type_id" INTEGER NOT NULL,
    "bolt_position_id" INTEGER NOT NULL,
    "image_url" TEXT NOT NULL,
    "caption" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "close_up_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "close_up_bolt_pins" (
    "id" SERIAL NOT NULL,
    "close_up_photo_id" INTEGER NOT NULL,
    "bolt_spec_id" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "label" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "close_up_bolt_pins_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "close_up_photos_motorcycle_type_id_idx" ON "close_up_photos"("motorcycle_type_id");

-- CreateIndex
CREATE INDEX "close_up_photos_motorcycle_type_id_bolt_position_id_idx" ON "close_up_photos"("motorcycle_type_id", "bolt_position_id");

-- CreateIndex
CREATE INDEX "close_up_bolt_pins_close_up_photo_id_idx" ON "close_up_bolt_pins"("close_up_photo_id");

-- CreateIndex
CREATE INDEX "close_up_bolt_pins_bolt_spec_id_idx" ON "close_up_bolt_pins"("bolt_spec_id");

-- AddForeignKey
ALTER TABLE "close_up_photos" ADD CONSTRAINT "close_up_photos_motorcycle_type_id_fkey" FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_up_photos" ADD CONSTRAINT "close_up_photos_bolt_position_id_fkey" FOREIGN KEY ("bolt_position_id") REFERENCES "bolt_positions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_up_bolt_pins" ADD CONSTRAINT "close_up_bolt_pins_close_up_photo_id_fkey" FOREIGN KEY ("close_up_photo_id") REFERENCES "close_up_photos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "close_up_bolt_pins" ADD CONSTRAINT "close_up_bolt_pins_bolt_spec_id_fkey" FOREIGN KEY ("bolt_spec_id") REFERENCES "bolt_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
