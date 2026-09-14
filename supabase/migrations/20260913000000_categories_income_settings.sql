-- =====================================================================
-- Tahap 7: kategori per pengguna, jenis transaksi (masuk/keluar), saldo pembuka
-- Jalankan seluruh isi berkas ini di Supabase -> SQL Editor.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabel categories: kategori milik pengguna beserta kata kunci parser
-- ---------------------------------------------------------------------
create table public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  name text not null,
  keywords text[] not null default '{}',
  is_default boolean not null default false,   -- Lainnya & Pemasukan: tidak bisa dihapus
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.categories enable row level security;

create policy "baca kategori sendiri" on public.categories
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "tambah kategori sendiri" on public.categories
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "ubah kategori sendiri" on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Kategori bawaan (is_default) tidak bisa dihapus, ditegakkan di level database.
create policy "hapus kategori sendiri" on public.categories
  for delete to authenticated
  using ((select auth.uid()) = user_id and is_default = false);

-- Saat kategori dihapus: transaksi lama berpindah ke 'Lainnya'.
-- Saat nama kategori diubah: transaksi lama ikut berganti nama.
create or replace function public.sync_expenses_on_category_change()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'DELETE' then
    update public.expenses
      set category = 'Lainnya'
      where user_id = old.user_id and category = old.name;
    return old;
  end if;

  if tg_op = 'UPDATE' and new.name is distinct from old.name then
    update public.expenses
      set category = new.name
      where user_id = old.user_id and category = old.name;
  end if;

  return new;
end;
$$;

create trigger categories_sync_expenses
  before delete or update on public.categories
  for each row execute function public.sync_expenses_on_category_change();

-- ---------------------------------------------------------------------
-- 2. Kolom type di expenses: 'expense' (keluar) atau 'income' (masuk)
-- ---------------------------------------------------------------------
alter table public.expenses
  add column type text not null default 'expense'
  check (type in ('expense', 'income'));

create index expenses_user_type_spent_idx
  on public.expenses (user_id, type, spent_at desc);

-- ---------------------------------------------------------------------
-- 3. Tabel settings: saldo pembuka untuk e-Statement
-- ---------------------------------------------------------------------
create table public.settings (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  opening_balance numeric(14,2) not null default 0,  -- saldo pada awal opening_date
  opening_date date not null default current_date,   -- transaksi sebelum tanggal ini diabaikan
  updated_at timestamptz not null default now()
);

alter table public.settings enable row level security;

create policy "baca setting sendiri" on public.settings
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "tambah setting sendiri" on public.settings
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "ubah setting sendiri" on public.settings
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------
-- 4. Isi kategori bawaan untuk akun yang sudah ada
-- ---------------------------------------------------------------------
insert into public.categories (user_id, name, keywords, is_default, sort_order)
select u.id, c.name, c.keywords, c.is_default, c.sort_order
from auth.users u
cross join (
  values
    ('Makan',     array['makan','sarapan','jajan','kopi','ngopi','nasi','bakso','mie','gofood','grabfood','warung','resto','cemilan','minum'], false, 1),
    ('Transport', array['bensin','pertalite','pertamax','solar','ojek','gojek','grab','parkir','tol','kereta','busway','taksi','servis'], false, 2),
    ('Belanja',   array['belanja','baju','celana','sepatu','shopee','tokopedia','alfamart','indomaret','skincare','sabun'], false, 3),
    ('Tagihan',   array['listrik','pln','air','pdam','internet','wifi','pulsa','kuota','sewa','kos','cicilan','iuran'], false, 4),
    ('Hiburan',   array['nonton','bioskop','game','netflix','spotify','konser','liburan','wisata'], false, 5),
    ('Kesehatan', array['obat','apotek','dokter','vitamin','klinik','bpjs'], false, 6),
    ('Pemasukan', array['gajian','gaji','masuk','terima','dapat','bonus','thr','cair'], true, 90),
    ('Lainnya',   array[]::text[], true, 99)
) as c(name, keywords, is_default, sort_order);

-- ---------------------------------------------------------------------
-- 5. Baris settings awal untuk akun yang sudah ada (saldo pembuka 0, bisa diubah di aplikasi)
-- ---------------------------------------------------------------------
insert into public.settings (user_id)
select id from auth.users;
