-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "username" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role_id" INTEGER,
    "role" TEXT NOT NULL DEFAULT 'STAFF',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycle_types" (
    "id" SERIAL NOT NULL,
    "brand" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "variant" TEXT NOT NULL,
    "year_start" INTEGER NOT NULL,
    "year_end" INTEGER,
    "display_name" TEXT NOT NULL,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motorcycle_images" (
    "id" SERIAL NOT NULL,
    "motorcycle_type_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "motorcycle_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolt_positions" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "bolt_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolt_specs" (
    "id" SERIAL NOT NULL,
    "code" TEXT NOT NULL,
    "diameter_mm" DECIMAL(5,2) NOT NULL,
    "length_mm" DECIMAL(6,2) NOT NULL,
    "head_type" TEXT NOT NULL,
    "thread_pitch" TEXT,
    "material" TEXT NOT NULL DEFAULT 'Titanium Gr5',
    "finish" TEXT NOT NULL DEFAULT 'Glossy',
    "notes" TEXT,

    CONSTRAINT "bolt_specs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bolt_images" (
    "id" SERIAL NOT NULL,
    "bolt_spec_id" INTEGER NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bolt_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "motor_bolt_requirements" (
    "id" SERIAL NOT NULL,
    "motorcycle_type_id" INTEGER NOT NULL,
    "bolt_position_id" INTEGER NOT NULL,
    "bolt_spec_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "side" TEXT NOT NULL DEFAULT 'NONE',
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,

    CONSTRAINT "motor_bolt_requirements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "packages" (
    "id" SERIAL NOT NULL,
    "motorcycle_type_id" INTEGER NOT NULL,
    "package_type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "packages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "package_items" (
    "id" SERIAL NOT NULL,
    "package_id" INTEGER NOT NULL,
    "bolt_spec_id" INTEGER NOT NULL,
    "source_requirement_id" INTEGER,
    "quantity" INTEGER NOT NULL,
    "emblem_note" TEXT,

    CONSTRAINT "package_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_sessions" (
    "id" SERIAL NOT NULL,
    "motorcycle_type_id" INTEGER NOT NULL,
    "package_id" INTEGER,
    "created_by" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,

    CONSTRAINT "pick_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pick_session_items" (
    "id" SERIAL NOT NULL,
    "pick_session_id" INTEGER NOT NULL,
    "bolt_spec_id" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "position_summary" TEXT NOT NULL,
    "checked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "pick_session_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "action" TEXT NOT NULL,
    "entity" TEXT NOT NULL,
    "entity_id" INTEGER,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "detail" TEXT,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "role_permissions_role_id_idx" ON "role_permissions"("role_id");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_idx" ON "role_permissions"("permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "motorcycle_types_brand_model_variant_year_start_year_end_key" ON "motorcycle_types"("brand", "model", "variant", "year_start", "year_end");

-- CreateIndex
CREATE INDEX "motorcycle_images_motorcycle_type_id_idx" ON "motorcycle_images"("motorcycle_type_id");

-- CreateIndex
CREATE UNIQUE INDEX "bolt_positions_name_key" ON "bolt_positions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "bolt_specs_code_key" ON "bolt_specs"("code");

-- CreateIndex
CREATE INDEX "bolt_images_bolt_spec_id_idx" ON "bolt_images"("bolt_spec_id");

-- CreateIndex
CREATE UNIQUE INDEX "motor_bolt_requirements_motorcycle_type_id_bolt_position_id_key" ON "motor_bolt_requirements"("motorcycle_type_id", "bolt_position_id", "bolt_spec_id", "side");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motorcycle_images" ADD CONSTRAINT "motorcycle_images_motorcycle_type_id_fkey" FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bolt_images" ADD CONSTRAINT "bolt_images_bolt_spec_id_fkey" FOREIGN KEY ("bolt_spec_id") REFERENCES "bolt_specs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_bolt_requirements" ADD CONSTRAINT "motor_bolt_requirements_motorcycle_type_id_fkey" FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_bolt_requirements" ADD CONSTRAINT "motor_bolt_requirements_bolt_position_id_fkey" FOREIGN KEY ("bolt_position_id") REFERENCES "bolt_positions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "motor_bolt_requirements" ADD CONSTRAINT "motor_bolt_requirements_bolt_spec_id_fkey" FOREIGN KEY ("bolt_spec_id") REFERENCES "bolt_specs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "packages" ADD CONSTRAINT "packages_motorcycle_type_id_fkey" FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_bolt_spec_id_fkey" FOREIGN KEY ("bolt_spec_id") REFERENCES "bolt_specs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_source_requirement_id_fkey" FOREIGN KEY ("source_requirement_id") REFERENCES "motor_bolt_requirements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_sessions" ADD CONSTRAINT "pick_sessions_motorcycle_type_id_fkey" FOREIGN KEY ("motorcycle_type_id") REFERENCES "motorcycle_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_sessions" ADD CONSTRAINT "pick_sessions_package_id_fkey" FOREIGN KEY ("package_id") REFERENCES "packages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_sessions" ADD CONSTRAINT "pick_sessions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_session_items" ADD CONSTRAINT "pick_session_items_pick_session_id_fkey" FOREIGN KEY ("pick_session_id") REFERENCES "pick_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pick_session_items" ADD CONSTRAINT "pick_session_items_bolt_spec_id_fkey" FOREIGN KEY ("bolt_spec_id") REFERENCES "bolt_specs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

