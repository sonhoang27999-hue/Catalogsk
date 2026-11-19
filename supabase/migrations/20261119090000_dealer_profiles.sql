-- Thông tin tư vấn riêng của từng đại lý cấp 1 (link riêng, số gọi, Zalo, ghi chú).
-- Trang gốc không còn nút Gọi/Zalo; nút chỉ hiện khi xác định được đại lý cấp 1.
-- Chạy lại nhiều lần vẫn an toàn.

create table if not exists public.dealer_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  code text not null,
  shop_name text not null default '',
  phone text not null default '',
  zalo text not null default '',
  product_note text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint dealer_profiles_code_format check (code ~ '^[a-z][a-z0-9-]{1,28}[a-z0-9]$'),
  constraint dealer_profiles_phone_format check (phone ~ '^\+?[0-9]{8,15}$'),
  constraint dealer_profiles_zalo_format check (zalo ~ '^[0-9]{8,15}$'),
  constraint dealer_profiles_lengths check (
    char_length(shop_name) <= 80 and char_length(product_note) <= 600
  )
);

create unique index if not exists dealer_profiles_code_key on public.dealer_profiles (code);

alter table public.dealer_profiles enable row level security;

-- Khách vãng lai không đọc thẳng bảng (tránh dò danh sách đại lý); chỉ tra theo mã qua hàm bên dưới.
revoke all on public.dealer_profiles from anon;
grant select, insert, update, delete on public.dealer_profiles to authenticated;

drop policy if exists "Admins and managers manage dealer profiles" on public.dealer_profiles;
create policy "Admins and managers manage dealer profiles"
  on public.dealer_profiles for all to authenticated
  using (public.has_any_role(auth.uid(), array['admin', 'manager']))
  with check (public.has_any_role(auth.uid(), array['admin', 'manager']));

drop policy if exists "Dealer1 reads own profile" on public.dealer_profiles;
create policy "Dealer1 reads own profile"
  on public.dealer_profiles for select to authenticated
  using (user_id = auth.uid());

drop trigger if exists dealer_profiles_touch_updated_at on public.dealer_profiles;
create trigger dealer_profiles_touch_updated_at
  before update on public.dealer_profiles
  for each row execute function public.touch_updated_at();

-- Hàm nội bộ: thông tin tư vấn của một đại lý cấp 1 đang bật.
create or replace function public.dealer_contact_json(_user_id uuid, _with_note boolean)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'code', d.code,
    'shop_name', d.shop_name,
    'phone', d.phone,
    'zalo', d.zalo,
    'note', case when _with_note then d.product_note else '' end
  )
  from public.dealer_profiles d
  where d.user_id = _user_id
    and d.active
    and exists (
      select 1 from public.user_roles r where r.user_id = d.user_id and r.role = 'dealer1'
    )
$$;
revoke all on function public.dealer_contact_json(uuid, boolean) from public, anon, authenticated;

-- Tra theo mã link đại lý (ai cũng gọi được). Ghi chú chỉ trả cho người đã đăng nhập.
create or replace function public.get_dealer_contact(_code text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.dealer_contact_json(d.user_id, auth.uid() is not null)
  from public.dealer_profiles d
  where d.code = lower(btrim(_code))
$$;
revoke all on function public.get_dealer_contact(text) from public;
grant execute on function public.get_dealer_contact(text) to anon, authenticated;

-- Theo tài khoản đang đăng nhập: chính mình (đại lý cấp 1) hoặc đại lý cấp 1 đã tạo ra tài khoản này.
create or replace function public.get_my_dealer_contact()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.dealer_contact_json(auth.uid(), true),
    (
      select public.dealer_contact_json(o.created_by, true)
      from public.account_owners o
      where o.user_id = auth.uid()
    )
  )
$$;
revoke all on function public.get_my_dealer_contact() from public, anon;
grant execute on function public.get_my_dealer_contact() to authenticated;

-- Danh sách "Gửi khách": chỉ hiện thông tin tư vấn khi người tạo là đại lý cấp 1.
create or replace function public.get_share_dealer_contact(_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select public.dealer_contact_json(s.user_id, false)
  from public.catalog_share_lists s
  where s.id = _id
$$;
revoke all on function public.get_share_dealer_contact(uuid) from public;
grant execute on function public.get_share_dealer_contact(uuid) to anon, authenticated;

-- Lưu thông tin: đại lý cấp 1 tự sửa của mình; admin/quản trị viên sửa hộ và bật/tắt.
create or replace function public.save_dealer_profile(
  _user_id uuid,
  _code text,
  _shop_name text,
  _phone text,
  _zalo text,
  _product_note text,
  _active boolean default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  is_staff boolean;
  v_code text := lower(btrim(coalesce(_code, '')));
  v_phone text := regexp_replace(coalesce(_phone, ''), '[^0-9+]', '', 'g');
  v_zalo text := regexp_replace(coalesce(_zalo, ''), '[^0-9]', '', 'g');
  v_shop text := btrim(coalesce(_shop_name, ''));
  v_note text := btrim(coalesce(_product_note, ''));
begin
  if caller is null then
    raise exception 'Vui lòng đăng nhập.';
  end if;
  is_staff := public.has_any_role(caller, array['admin', 'manager']);
  if not is_staff and caller is distinct from _user_id then
    raise exception 'Bạn chỉ sửa được thông tin của chính mình.';
  end if;
  if not exists (
    select 1 from public.user_roles r where r.user_id = _user_id and r.role = 'dealer1'
  ) then
    raise exception 'Tài khoản này không phải đại lý cấp 1.';
  end if;
  if v_code !~ '^[a-z][a-z0-9-]{1,28}[a-z0-9]$' then
    raise exception 'Mã link dài 3–30 ký tự, chỉ gồm chữ thường không dấu, số và gạch nối, bắt đầu bằng chữ.';
  end if;
  if v_code = any (array['true', 'false', 'null', 'off', 'admin', 'auth'])
     or (not is_staff and v_code ~ '^(sk|sklight|sk-light|skambient.*|sk-ambient.*)$') then
    raise exception 'Mã link này không dùng được, vui lòng chọn mã khác.';
  end if;
  if v_phone !~ '^\+?[0-9]{8,15}$' then
    raise exception 'Số gọi tư vấn không hợp lệ.';
  end if;
  if v_zalo = '' then
    v_zalo := regexp_replace(v_phone, '[^0-9]', '', 'g');
  end if;
  if v_zalo !~ '^[0-9]{8,15}$' then
    raise exception 'Số Zalo không hợp lệ.';
  end if;
  if char_length(v_shop) > 80 then
    raise exception 'Tên cửa hàng tối đa 80 ký tự.';
  end if;
  if char_length(v_note) > 600 then
    raise exception 'Ghi chú tối đa 600 ký tự.';
  end if;
  if exists (
    select 1 from public.dealer_profiles d where d.code = v_code and d.user_id <> _user_id
  ) then
    raise exception 'Mã link này đã có đại lý khác dùng, vui lòng chọn mã khác.';
  end if;

  insert into public.dealer_profiles as d (user_id, code, shop_name, phone, zalo, product_note, active)
  values (
    _user_id, v_code, v_shop, v_phone, v_zalo, v_note,
    case when is_staff then coalesce(_active, true) else true end
  )
  on conflict (user_id) do update set
    code = excluded.code,
    shop_name = excluded.shop_name,
    phone = excluded.phone,
    zalo = excluded.zalo,
    product_note = excluded.product_note,
    active = case when is_staff and _active is not null then _active else d.active end;

  return (select to_jsonb(p) from public.dealer_profiles p where p.user_id = _user_id);
end;
$$;
revoke all on function public.save_dealer_profile(uuid, text, text, text, text, text, boolean) from public, anon;
grant execute on function public.save_dealer_profile(uuid, text, text, text, text, text, boolean) to authenticated;
