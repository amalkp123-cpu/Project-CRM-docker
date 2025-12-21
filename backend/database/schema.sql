-- schema.sql
-- idempotent, safe to re-run

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public;

CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- =========================
-- tables
-- =========================

CREATE TABLE IF NOT EXISTS public.app_users (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    username text NOT NULL UNIQUE,
    full_name text,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    role varchar,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    first_name text NOT NULL,
    last_name text NOT NULL,
    dob date,
    phone varchar,
    email varchar,
    gender varchar,
    fax varchar,
    sin_encrypted text,
    sin_hash text,
    marital_status text,
    loyalty_since date,
    referred_by text,
    created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    country text,
    province text,
    address_line1 text NOT NULL,
    address_line2 text,
    city text,
    postal_code text,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dependants (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    first_name text,
    last_name text,
    dob date,
    gender varchar,
    relationship text,
    disability boolean DEFAULT false NOT NULL,
    disability_notes text,
    same_address boolean DEFAULT false NOT NULL,
    address_id uuid REFERENCES public.addresses(id) ON UPDATE CASCADE ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.spouse_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    linked_client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    date_of_marriage date
);

CREATE TABLE IF NOT EXISTS public.tax_records (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    tax_year smallint NOT NULL,
    tax_status text,
    tax_date date,
    hst_required boolean,
    prepared_by text,
    created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    last_updated timestamptz DEFAULT now(),
    UNIQUE (client_id, tax_year)
);

CREATE TABLE IF NOT EXISTS public.hst_docs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    tax_record_id uuid REFERENCES public.tax_records(id) ON DELETE SET NULL,
    filename text NOT NULL,
    object_store_key text NOT NULL,
    uploaded_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    uploaded_at timestamptz DEFAULT now(),
    checksum text,
    notes text
);

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    note_text text NOT NULL,
    created_by uuid REFERENCES public.app_users(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.verifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    verifier_id uuid NOT NULL REFERENCES public.app_users(id),
    action text NOT NULL,
    notes text,
    created_at timestamptz DEFAULT now()
);

-- =========================
-- indexes
-- =========================

CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients(last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_clients_sin_hash ON public.clients(sin_hash);

CREATE INDEX IF NOT EXISTS idx_addresses_client ON public.addresses(client_id);

CREATE INDEX IF NOT EXISTS idx_dependants_client ON public.dependants(client_id);
CREATE INDEX IF NOT EXISTS idx_dependants_address ON public.dependants(address_id);

CREATE INDEX IF NOT EXISTS idx_spouse_links_client ON public.spouse_links(client_id);
CREATE INDEX IF NOT EXISTS idx_spouse_links_linked ON public.spouse_links(linked_client_id);

CREATE INDEX IF NOT EXISTS idx_tax_records_client_year
  ON public.tax_records(client_id, tax_year);

CREATE INDEX IF NOT EXISTS idx_hst_docs_client ON public.hst_docs(client_id);
CREATE INDEX IF NOT EXISTS idx_hst_docs_tax_record ON public.hst_docs(tax_record_id);

CREATE INDEX IF NOT EXISTS idx_notes_client ON public.notes(client_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_verifications_entity
  ON public.verifications(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_verifications_verifier
  ON public.verifications(verifier_id);

-- =========================
-- triggers (only where valid)
-- =========================

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


COMMIT;
