-- إنشاء جدول المستخدمين إذا لم يكن موجوداً
CREATE TABLE IF NOT EXISTS users (
    id                SERIAL PRIMARY KEY, -- رقم تعريفي فريد لكل مستخدم
    full_name         VARCHAR(100) NOT NULL, -- اسم المستخدم (إجباري)
    email             VARCHAR(254) NOT NULL UNIQUE, -- البريد الإلكتروني (إجباري وغير مكرر)
    account_type      VARCHAR(10)  NOT NULL DEFAULT 'user' CHECK (account_type IN ('user', 'admin')), -- نوع الحساب: مستخدم أو مدير
    email_verified_at TIMESTAMP, -- تاريخ تأكيد البريد الإلكتروني
    created_at        TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP -- تاريخ إنشاء الحساب
);

-- إنشاء جدول رموز التحقق OTP
CREATE TABLE IF NOT EXISTS otp_codes (
    id         SERIAL PRIMARY KEY, -- رقم تعريفي فريد لكل رمز
    user_id    INTEGER   NOT NULL REFERENCES users (id) ON DELETE CASCADE, -- ربط الرمز بالمستخدم وحذفه عند حذف المستخدم
    code_hash  TEXT      NOT NULL, -- الرمز بعد تشفيره (Hash)
    expires_at TIMESTAMP NOT NULL, -- تاريخ ووقت انتهاء صلاحية الرمز
    attempts   INTEGER   NOT NULL DEFAULT 0 CHECK (attempts >= 0), -- عدد محاولات إدخال الرمز
    used_at    TIMESTAMP, -- وقت استخدام الرمز
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP -- تاريخ إنشاء الرمز
);

-- إنشاء فهرس لتسريع البحث عن رموز التحقق الخاصة بالمستخدم
CREATE INDEX IF NOT EXISTS idx_otp_codes_user_id ON otp_codes (user_id);