-- idempotent, cleaned schema.sql generated from dump
-- safe to run multiple times; uses IF NOT EXISTS and guards for constraints

SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET search_path = public;

-- extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

BEGIN;

-- tables
CREATE TABLE IF NOT EXISTS public.addresses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    country text,
    province text,
    address_line1 text NOT NULL,
    address_line2 text,
    city text,
    postal_code text,
    is_primary boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.app_users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    username text NOT NULL,
    full_name text,
    password_hash text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamptz DEFAULT now(),
    role character varying
);

CREATE TABLE IF NOT EXISTS public.clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
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
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.dependants (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    first_name text,
    last_name text,
    dob date,
    gender varchar,
    relationship text,
    disability boolean DEFAULT false NOT NULL,
    disability_notes text,
    same_address boolean DEFAULT false NOT NULL,
    address_id uuid
);

CREATE TABLE IF NOT EXISTS public.hst_docs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    tax_record_id uuid,
    filename text NOT NULL,
    object_store_key text NOT NULL,
    uploaded_by uuid,
    uploaded_at timestamptz DEFAULT now(),
    checksum text,
    notes text
);

CREATE TABLE IF NOT EXISTS public.notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    note_text text NOT NULL,
    created_by uuid,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spouse_links (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    linked_client_id uuid NOT NULL,
    date_of_marriage date
);

CREATE TABLE IF NOT EXISTS public.tax_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    client_id uuid NOT NULL,
    tax_year smallint NOT NULL,
    tax_status text,
    last_updated timestamptz DEFAULT now(),
    tax_date date,
    hst_required boolean,
    created_by uuid,
    prepared_by text
);

CREATE TABLE IF NOT EXISTS public.verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type text NOT NULL,        -- e.g. 'client' or 'tax_record'
  entity_id uuid NOT NULL,          -- UUID of the target row
  verifier_id uuid NOT NULL,        -- app_users.id
  action text NOT NULL,             -- e.g. 'verified', 'rejected', 'unverified'
  notes text,
  created_at timestamptz DEFAULT now()
);


-- indexes (use IF NOT EXISTS where supported)
CREATE INDEX IF NOT EXISTS idx_addresses_client ON public.addresses (client_id);
CREATE INDEX IF NOT EXISTS idx_clients_name ON public.clients (last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_clients_sin_hash ON public.clients (sin_hash);
CREATE INDEX IF NOT EXISTS idx_dependants_address_id ON public.dependants (address_id);
CREATE INDEX IF NOT EXISTS idx_dependants_client_id ON public.dependants (client_id);
CREATE INDEX IF NOT EXISTS idx_taxrecords_client_year ON public.tax_records (client_id, tax_year);
CREATE INDEX IF NOT EXISTS idx_hst_docs_client_id ON public.hst_docs (client_id);
CREATE INDEX IF NOT EXISTS idx_hst_docs_tax_record_id ON public.hst_docs (tax_record_id);
CREATE INDEX IF NOT EXISTS idx_verifications_entity ON public.verifications(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_verifications_verifier ON public.verifications(verifier_id);
CREATE INDEX IF NOT EXISTS idx_notes_client_id ON public.notes (client_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON public.notes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_spouse_links_client_id ON public.spouse_links (client_id);
CREATE INDEX IF NOT EXISTS idx_spouse_links_linked_client_id ON public.spouse_links (linked_client_id);

-- functions and triggers
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- attach trigger to clients (idempotent)
DROP TRIGGER IF EXISTS trg_clients_updated_at ON public.clients;
CREATE TRIGGER trg_clients_updated_at
BEFORE UPDATE ON public.clients
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- attach trigger to notes (idempotent)
DROP TRIGGER IF EXISTS trg_notes_updated_at ON public.notes;
CREATE TRIGGER trg_notes_updated_at
BEFORE UPDATE ON public.notes
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- If you want similar behavior for tax_records.last_updated create a column trigger function
CREATE OR REPLACE FUNCTION public.set_named_ts_column()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  colname text := TG_ARGV[0];
BEGIN
  -- use EXECUTE to set arbitrary column on NEW
  EXECUTE format('NEW.%I := now()', colname);
  RETURN NEW;
END;
$$;

-- attach to tax_records to update last_updated
DROP TRIGGER IF EXISTS trg_tax_records_last_updated ON public.tax_records;
CREATE TRIGGER trg_tax_records_last_updated
BEFORE UPDATE ON public.tax_records
FOR EACH ROW EXECUTE FUNCTION public.set_named_ts_column('last_updated');

-- constraints: primary keys, uniques, foreign keys guarded with existence checks

-- addresses_pkey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'addresses_pkey') THEN
    ALTER TABLE public.addresses ADD CONSTRAINT addresses_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- app_users pkey and username unique
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_users_pkey') THEN
    ALTER TABLE public.app_users ADD CONSTRAINT app_users_pkey PRIMARY KEY (id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'app_users_username_key') THEN
    ALTER TABLE public.app_users ADD CONSTRAINT app_users_username_key UNIQUE (username);
  END IF;
END$$;

-- notes primary key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_pkey') THEN
    ALTER TABLE public.notes ADD CONSTRAINT notes_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- spouse_links primary key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_links_pkey') THEN
    ALTER TABLE public.spouse_links ADD CONSTRAINT client_links_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- clients primary key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_pkey') THEN
    ALTER TABLE public.clients ADD CONSTRAINT clients_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- dependants primary key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dependants_pk') THEN
    ALTER TABLE public.dependants ADD CONSTRAINT dependants_pk PRIMARY KEY (id);
  END IF;
END$$;

-- hst_docs primary key
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hst_docs_pkey') THEN
    ALTER TABLE public.hst_docs ADD CONSTRAINT hst_docs_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- tax_records unique and pkey
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_records_client_id_tax_year_key') THEN
    ALTER TABLE public.tax_records ADD CONSTRAINT tax_records_client_id_tax_year_key UNIQUE (client_id, tax_year);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_records_pkey') THEN
    ALTER TABLE public.tax_records ADD CONSTRAINT tax_records_pkey PRIMARY KEY (id);
  END IF;
END$$;

-- foreign keys
-- addresses.client_id -> clients(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'addresses_client_id_fkey') THEN
    ALTER TABLE ONLY public.addresses
      ADD CONSTRAINT addresses_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END$$;

-- spouse_links.client_id -> clients(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_links_client_id_fkey') THEN
    ALTER TABLE ONLY public.spouse_links
      ADD CONSTRAINT client_links_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END$$;

-- spouse_links.linked_client_id -> clients(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'client_links_linked_client_id_fkey') THEN
    ALTER TABLE ONLY public.spouse_links
      ADD CONSTRAINT client_links_linked_client_id_fkey FOREIGN KEY (linked_client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END$$;

-- clients.created_by -> app_users(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'clients_created_by_fkey') THEN
    ALTER TABLE ONLY public.clients
      ADD CONSTRAINT clients_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- dependants.address_id -> addresses(id) ON UPDATE CASCADE ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dependants_address_fkey') THEN
    ALTER TABLE ONLY public.dependants
      ADD CONSTRAINT dependants_address_fkey FOREIGN KEY (address_id) REFERENCES public.addresses(id) ON UPDATE CASCADE ON DELETE SET NULL;
  END IF;
END$$;

-- dependants.client_id -> clients(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dependants_dependants_clients_fk' OR conname = 'dependants_clients_fk') THEN
    -- original dump used dependants_clients_fk
    ALTER TABLE ONLY public.dependants
      ADD CONSTRAINT dependants_clients_fk FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END$$;

-- hst_docs.client_id -> clients(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hst_docs_client_id_fkey') THEN
    ALTER TABLE ONLY public.hst_docs
      ADD CONSTRAINT hst_docs_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END$$;

-- hst_docs.tax_record_id -> tax_records(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hst_docs_tax_record_id_fkey') THEN
    ALTER TABLE ONLY public.hst_docs
      ADD CONSTRAINT hst_docs_tax_record_id_fkey FOREIGN KEY (tax_record_id) REFERENCES public.tax_records(id) ON DELETE SET NULL;
  END IF;
END$$;

-- hst_docs.uploaded_by -> app_users(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hst_docs_uploaded_by_fkey') THEN
    ALTER TABLE ONLY public.hst_docs
      ADD CONSTRAINT hst_docs_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- notes.client_id -> clients(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_client_id_fkey') THEN
    ALTER TABLE ONLY public.notes
      ADD CONSTRAINT notes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END$$;

-- notes.created_by -> app_users(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'notes_created_by_fkey') THEN
    ALTER TABLE ONLY public.notes
      ADD CONSTRAINT notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
  END IF;
END$$;

-- tax_records.client_id -> clients(id) ON DELETE CASCADE
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_records_client_id_fkey') THEN
    ALTER TABLE ONLY public.tax_records
      ADD CONSTRAINT tax_records_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.clients(id) ON DELETE CASCADE;
  END IF;
END$$;

-- tax_records.created_by -> app_users(id) ON DELETE SET NULL
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tax_records_app_users_fk') THEN
    ALTER TABLE ONLY public.tax_records
      ADD CONSTRAINT tax_records_app_users_fk FOREIGN KEY (created_by) REFERENCES public.app_users(id) ON DELETE SET NULL;
  END IF;
END$$;


COMMIT;

-- end of schema.sql