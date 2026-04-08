-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('MANAGER', 'ADMIN', 'SALES', 'SERVICE');

-- CreateEnum
CREATE TYPE "EquipmentStatus" AS ENUM ('AVAILABLE', 'RENTED', 'MAINTENANCE', 'RETIRED');

-- CreateEnum
CREATE TYPE "RentalStatus" AS ENUM ('ORDER_RECEIVED', 'PREPARING', 'DELIVERED', 'ACTIVE', 'RETURNING', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('PRE_DELIVERY', 'DELIVERY', 'RETURN');

-- CreateEnum
CREATE TYPE "MaintenanceType" AS ENUM ('REPAIR', 'PM', 'EMERGENCY');

-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('DELIVERY_NOTE', 'INSPECTION_FORM', 'RETURN_FORM', 'RENTAL_CONTRACT');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment" (
    "id" TEXT NOT NULL,
    "serial_number" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT,
    "status" "EquipmentStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition_rating" INTEGER NOT NULL DEFAULT 5,
    "last_inspection_date" TIMESTAMP(3),
    "notes" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "cover_photo_id" TEXT,

    CONSTRAINT "equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_photos" (
    "id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_size_bytes" INTEGER NOT NULL,
    "mime_type" TEXT NOT NULL,
    "width_px" INTEGER,
    "height_px" INTEGER,
    "caption" TEXT,
    "is_cover" BOOLEAN NOT NULL DEFAULT false,
    "uploaded_by" TEXT NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "company_name" TEXT NOT NULL,
    "contact_person" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT,
    "address" TEXT,
    "tax_id" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_sites" (
    "id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "site_name" TEXT NOT NULL,
    "site_address" TEXT NOT NULL,
    "site_contact_person" TEXT,
    "site_phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_sites_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rental_orders" (
    "id" TEXT NOT NULL,
    "rental_number" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "job_site_id" TEXT NOT NULL,
    "equipment_id" TEXT NOT NULL,
    "status" "RentalStatus" NOT NULL DEFAULT 'ORDER_RECEIVED',
    "rental_start_date" TIMESTAMP(3) NOT NULL,
    "rental_end_date" TIMESTAMP(3) NOT NULL,
    "actual_return_date" TIMESTAMP(3),
    "special_conditions" TEXT,
    "created_by" TEXT NOT NULL,
    "assigned_sales" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rental_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inspection_reports" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "inspected_by" TEXT NOT NULL,
    "inspection_date" TIMESTAMP(3) NOT NULL,
    "checklist_items" JSONB NOT NULL,
    "overall_condition" INTEGER NOT NULL,
    "damage_notes" TEXT,
    "customer_signature" TEXT,
    "photos" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inspection_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maintenance_logs" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT,
    "equipment_id" TEXT NOT NULL,
    "type" "MaintenanceType" NOT NULL,
    "performed_by" TEXT NOT NULL,
    "visit_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "parts_used" JSONB,
    "downtime_hours" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maintenance_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "rental_id" TEXT NOT NULL,
    "type" "DocumentType" NOT NULL,
    "file_url" TEXT NOT NULL,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "generated_by" TEXT NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actor_id" TEXT NOT NULL,
    "actor_role" TEXT NOT NULL,
    "before_value" JSONB,
    "after_value" JSONB,
    "ip_address" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_RentalServiceAssignments" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_RentalServiceAssignments_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "equipment_serial_number_key" ON "equipment"("serial_number");

-- CreateIndex
CREATE INDEX "equipment_status_idx" ON "equipment"("status");

-- CreateIndex
CREATE INDEX "equipment_category_idx" ON "equipment"("category");

-- CreateIndex
CREATE INDEX "equipment_status_category_idx" ON "equipment"("status", "category");

-- CreateIndex
CREATE INDEX "equipment_photos_equipment_id_idx" ON "equipment_photos"("equipment_id");

-- CreateIndex
CREATE INDEX "equipment_photos_is_cover_idx" ON "equipment_photos"("is_cover");

-- CreateIndex
CREATE INDEX "job_sites_customer_id_idx" ON "job_sites"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "rental_orders_rental_number_key" ON "rental_orders"("rental_number");

-- CreateIndex
CREATE INDEX "rental_orders_status_idx" ON "rental_orders"("status");

-- CreateIndex
CREATE INDEX "rental_orders_customer_id_idx" ON "rental_orders"("customer_id");

-- CreateIndex
CREATE INDEX "rental_orders_equipment_id_idx" ON "rental_orders"("equipment_id");

-- CreateIndex
CREATE INDEX "rental_orders_assigned_sales_idx" ON "rental_orders"("assigned_sales");

-- CreateIndex
CREATE INDEX "rental_orders_rental_start_date_rental_end_date_idx" ON "rental_orders"("rental_start_date", "rental_end_date");

-- CreateIndex
CREATE INDEX "inspection_reports_rental_id_idx" ON "inspection_reports"("rental_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_equipment_id_idx" ON "maintenance_logs"("equipment_id");

-- CreateIndex
CREATE INDEX "maintenance_logs_rental_id_idx" ON "maintenance_logs"("rental_id");

-- CreateIndex
CREATE INDEX "documents_rental_id_idx" ON "documents"("rental_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_idx" ON "audit_logs"("actor_id");

-- CreateIndex
CREATE INDEX "audit_logs_timestamp_idx" ON "audit_logs"("timestamp");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_timestamp_idx" ON "audit_logs"("entity_type", "timestamp");

-- CreateIndex
CREATE INDEX "_RentalServiceAssignments_B_index" ON "_RentalServiceAssignments"("B");

-- AddForeignKey
ALTER TABLE "equipment" ADD CONSTRAINT "equipment_cover_photo_id_fkey" FOREIGN KEY ("cover_photo_id") REFERENCES "equipment_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_photos" ADD CONSTRAINT "equipment_photos_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_photos" ADD CONSTRAINT "equipment_photos_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_sites" ADD CONSTRAINT "job_sites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_job_site_id_fkey" FOREIGN KEY ("job_site_id") REFERENCES "job_sites"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rental_orders" ADD CONSTRAINT "rental_orders_assigned_sales_fkey" FOREIGN KEY ("assigned_sales") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inspection_reports" ADD CONSTRAINT "inspection_reports_inspected_by_fkey" FOREIGN KEY ("inspected_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_equipment_id_fkey" FOREIGN KEY ("equipment_id") REFERENCES "equipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maintenance_logs" ADD CONSTRAINT "maintenance_logs_performed_by_fkey" FOREIGN KEY ("performed_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_rental_id_fkey" FOREIGN KEY ("rental_id") REFERENCES "rental_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_generated_by_fkey" FOREIGN KEY ("generated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RentalServiceAssignments" ADD CONSTRAINT "_RentalServiceAssignments_A_fkey" FOREIGN KEY ("A") REFERENCES "rental_orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_RentalServiceAssignments" ADD CONSTRAINT "_RentalServiceAssignments_B_fkey" FOREIGN KEY ("B") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
