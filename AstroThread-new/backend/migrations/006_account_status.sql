-- إضافة حالة الحساب: نشط أو موقوف (يستخدمها المدير لإيقاف الحسابات)
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS status VARCHAR(10) NOT NULL DEFAULT 'active'; -- جميع الحسابات الحالية تصبح نشطة

-- السماح فقط بالقيمتين active و suspended
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check; -- حذف القيد القديم إن وُجد حتى يمكن تشغيل الملف أكثر من مرة
ALTER TABLE users
    ADD CONSTRAINT users_status_check CHECK (status IN ('active', 'suspended'));