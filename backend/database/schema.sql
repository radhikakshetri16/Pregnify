PRAGMA foreign_keys = ON;

-- =========================================================
-- 1. ADMIN
-- =========================================================

CREATE TABLE IF NOT EXISTS ADMIN (
    admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL
);


-- =========================================================
-- 2. USER
-- =========================================================

CREATE TABLE IF NOT EXISTS USER (
    user_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT
);


-- =========================================================
-- 3. PATIENT
-- =========================================================

CREATE TABLE IF NOT EXISTS PATIENT (
    patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL UNIQUE,
    name TEXT NOT NULL,
    age INTEGER,
    gender TEXT,
    phone TEXT,
    address TEXT,
    relationship_type TEXT NOT NULL
        CHECK (
            relationship_type IN (
                'Self',
                'Husband',
                'Caretaker',
                'Guardian',
                'Other'
            )
        ),

    FOREIGN KEY (user_id)
        REFERENCES USER(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 4. DOCTOR
-- =========================================================

CREATE TABLE IF NOT EXISTS DOCTOR (
    doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    phone TEXT,
    specialization TEXT NOT NULL,
    nmc_number TEXT NOT NULL UNIQUE,
    experience INTEGER NOT NULL,
    practice_at TEXT NOT NULL,
    consultation_fee REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'Active'
        CHECK (status IN ('Active', 'Inactive')),
    must_change_password INTEGER NOT NULL DEFAULT 1
        CHECK (must_change_password IN (0, 1))
);


-- =========================================================
-- 4.1 DOCTOR_SCHEDULE (WEEKLY & DATE-SPECIFIC)
-- =========================================================

CREATE TABLE IF NOT EXISTS DOCTOR_SCHEDULE (
    schedule_id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
    start_time TEXT NOT NULL,
    end_time TEXT NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),

    FOREIGN KEY (doctor_id)
        REFERENCES DOCTOR(doctor_id)
        ON DELETE CASCADE,

    UNIQUE(doctor_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS DOCTOR_AVAILABLE_DATE (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    doctor_id INTEGER NOT NULL,
    available_date DATE NOT NULL,
    time_slots TEXT NOT NULL,

    FOREIGN KEY (doctor_id)
        REFERENCES DOCTOR(doctor_id)
        ON DELETE CASCADE,

    UNIQUE(doctor_id, available_date)
);


-- =========================================================
-- 5. PREGNANCY
-- =========================================================

CREATE TABLE IF NOT EXISTS PREGNANCY (
    pregnancy_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL UNIQUE,
    last_menstrual_date DATE NOT NULL,
    due_date DATE NOT NULL,
    pregnancy_status TEXT NOT NULL DEFAULT 'Active'
        CHECK (
            pregnancy_status IN (
                'Active',
                'Completed',
                'Cancelled'
            )
        ),
    notes TEXT,

    FOREIGN KEY (patient_id)
        REFERENCES PATIENT(patient_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 6. HEALTHLOG
-- =========================================================

CREATE TABLE IF NOT EXISTS HEALTHLOG (
    healthlog_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    pregnancy_id INTEGER NOT NULL,
    sleep_hours REAL,
    hydration TEXT,
    weight REAL,
    nutrition_notes TEXT,
    symptoms TEXT,
    log_date DATETIME NOT NULL,

    FOREIGN KEY (patient_id)
        REFERENCES PATIENT(patient_id)
        ON DELETE CASCADE,

    FOREIGN KEY (pregnancy_id)
        REFERENCES PREGNANCY(pregnancy_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 7. MEDICAL_HISTORY
-- =========================================================

CREATE TABLE IF NOT EXISTS MEDICAL_HISTORY (
    medical_history_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    condition_name TEXT NOT NULL,
    description TEXT,
    diagnosed_date DATE,
    medication_history TEXT,
    status TEXT,
    notes TEXT,

    FOREIGN KEY (patient_id)
        REFERENCES PATIENT(patient_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 8. MEDICATION
-- =========================================================

CREATE TABLE IF NOT EXISTS MEDICATION (
    medication_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    prescribed_by INTEGER NOT NULL,
    medication_name TEXT NOT NULL,
    dosage TEXT,
    frequency TEXT,
    instructions TEXT,
    reason TEXT,
    start_date DATE,
    end_date DATE,
    status TEXT
        CHECK (
            status IS NULL OR
            status IN ('Active', 'Completed', 'Stopped')
        ),

    FOREIGN KEY (patient_id)
        REFERENCES PATIENT(patient_id)
        ON DELETE CASCADE,

    FOREIGN KEY (prescribed_by)
        REFERENCES DOCTOR(doctor_id)
        ON DELETE RESTRICT
);


-- =========================================================
-- 9. APPOINTMENT
-- =========================================================

CREATE TABLE IF NOT EXISTS APPOINTMENT (
    appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    doctor_id INTEGER NOT NULL,
    booked_by INTEGER NOT NULL,
    appointment_type TEXT NOT NULL,
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'Pending'
        CHECK (
            status IN (
                'Pending',
                'Confirmed',
                'Completed',
                'Cancelled'
            )
        ),
    reason TEXT,
    doctor_notes TEXT,
    diagnosis TEXT,
    tests_recommended TEXT,
    follow_up_date DATE,
    next_appointment TEXT,
    payment_status TEXT NOT NULL DEFAULT 'NOT_REQUIRED',

    FOREIGN KEY (patient_id)
        REFERENCES PATIENT(patient_id)
        ON DELETE CASCADE,

    FOREIGN KEY (doctor_id)
        REFERENCES DOCTOR(doctor_id)
        ON DELETE RESTRICT,

    FOREIGN KEY (booked_by)
        REFERENCES USER(user_id)
        ON DELETE CASCADE
);


-- =========================================================
-- 10. REPORT
-- =========================================================

CREATE TABLE IF NOT EXISTS REPORT (
    report_id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_id INTEGER NOT NULL,
    report_title TEXT NOT NULL,
    report_type TEXT NOT NULL,
    report_date DATE NOT NULL,
    file_path TEXT NOT NULL,
    notes TEXT,
    uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (patient_id)
        REFERENCES PATIENT(patient_id)
        ON DELETE CASCADE
);


-- =========================================================
-- APPOINTMENT CONFLICT PROTECTION
-- =========================================================
-- Prevent two non-cancelled appointments from using the
-- same doctor, date and time.

CREATE UNIQUE INDEX IF NOT EXISTS
idx_active_doctor_appointment
ON APPOINTMENT (
    doctor_id,
    appointment_date,
    appointment_time
)
WHERE status <> 'Cancelled';


-- =========================================================
-- PAYMENT
-- =========================================================

CREATE TABLE IF NOT EXISTS PAYMENT (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    provider TEXT NOT NULL CHECK (provider = 'ESEWA'),
    idempotency_key TEXT NOT NULL,
    merchant_transaction_id TEXT NOT NULL UNIQUE,
    provider_payment_id TEXT,
    provider_transaction_id TEXT,
    amount_paisa INTEGER NOT NULL CHECK (amount_paisa > 0),
    currency TEXT NOT NULL DEFAULT 'NPR',
    status TEXT NOT NULL DEFAULT 'INITIATED'
        CHECK (status IN (
            'INITIATED', 'PENDING', 'COMPLETED', 'FAILED',
            'CANCELLED', 'EXPIRED', 'REFUND_REQUESTED', 'REFUNDED'
        )),
    checkout_payload TEXT,
    failure_reason TEXT,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    verified_at TEXT,
    paid_at TEXT,
    refund_requested_at TEXT,
    refunded_at TEXT,
    refund_reference TEXT,
    admin_note TEXT,
    FOREIGN KEY (appointment_id) REFERENCES APPOINTMENT(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES USER(user_id) ON DELETE CASCADE,
    UNIQUE(user_id, idempotency_key)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_provider_reference
ON PAYMENT(provider, provider_payment_id)
WHERE provider_payment_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_payment_status_expiry
ON PAYMENT(status, expires_at);


