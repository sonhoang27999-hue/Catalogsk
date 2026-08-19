create type public.app_role as enum ('admin','user');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "Users read own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Admins manage roles" on public.user_roles for all to authenticated
  using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create or replace function public.bootstrap_first_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  else
    insert into public.user_roles (user_id, role) values (new.id, 'user') on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created_role after insert on auth.users
  for each row execute function public.bootstrap_first_admin();

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text not null default 'car',
  image_key text,
  image_url text,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create table public.series (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  slug text not null,
  name text not null,
  image_key text,
  image_url text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (category_id, slug)
);
create table public.models (
  id uuid primary key default gen_random_uuid(),
  series_id uuid not null references public.series(id) on delete cascade,
  slug text not null,
  name text not null,
  years text not null default '',
  image_key text,
  image_url text,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  unique (series_id, slug)
);
create table public.products (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  name text not null,
  form_code text not null default '',
  image_key text,
  image_url text,
  price bigint not null default 0,
  dealer_price bigint,
  install_price bigint,
  price_note text,
  description text,
  brand text not null default '',
  origin text not null default '',
  warranty text not null default '',
  video_url text,
  specs jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  sort integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table public.videos (
  id uuid primary key default gen_random_uuid(),
  model_id uuid not null references public.models(id) on delete cascade,
  title text not null,
  url text not null,
  sort integer not null default 0,
  created_at timestamptz not null default now()
);
create index on public.series (category_id);
create index on public.models (series_id);
create index on public.products (model_id);
create index on public.videos (model_id);

grant select on public.categories to anon, authenticated;
grant insert, update, delete on public.categories to authenticated;
grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "Public read categories" on public.categories for select to anon, authenticated using (true);
create policy "Admins write categories" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant select on public.series to anon, authenticated;
grant insert, update, delete on public.series to authenticated;
grant all on public.series to service_role;
alter table public.series enable row level security;
create policy "Public read series" on public.series for select to anon, authenticated using (true);
create policy "Admins write series" on public.series for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant select on public.models to anon, authenticated;
grant insert, update, delete on public.models to authenticated;
grant all on public.models to service_role;
alter table public.models enable row level security;
create policy "Public read models" on public.models for select to anon, authenticated using (true);
create policy "Admins write models" on public.models for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant select on public.products to anon, authenticated;
grant insert, update, delete on public.products to authenticated;
grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "Public read products" on public.products for select to anon, authenticated using (true);
create policy "Admins write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
grant select on public.videos to anon, authenticated;
grant insert, update, delete on public.videos to authenticated;
grant all on public.videos to service_role;
alter table public.videos enable row level security;
create policy "Public read videos" on public.videos for select to anon, authenticated using (true);
create policy "Admins write videos" on public.videos for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

insert into public.categories (slug,name,icon,image_key,sort) values
('phu-kien-chung','Phụ kiện chung','package','interior',0),
('loa-treble','Loa Treble','speaker','tweeter',1),
('den-tran-sao','Đèn Trần Sao','sparkles','starlight',2),
('mercedes','Mercedes','car','car',3),
('bmw','BMW','car','car',4),
('audi','Audi','car','car',5),
('honda','Honda','car','car',6),
('toyota','Toyota','car','car',7),
('vinfast','VinFast','car','car',8),
('ford','Ford','car','car',9),
('kia','Kia','car','car',10),
('hyundai','Hyundai','car','car',11);

insert into public.series (category_id,slug,name,image_key,sort)
select c.id,v.slug,v.name,v.image_key,v.sort from (values
('phu-kien-chung','camera-360','Camera 360','camera360',0),
('phu-kien-chung','cach-am','Cách âm','soundproof',1),
('loa-treble','loa-uc','Loa Đức','tweeter',0),
('loa-treble','loa-nhat','Loa Nhật','tweeter',1),
('den-tran-sao','soi-quang','Sợi quang','starlight',0),
('den-tran-sao','tran-sao-3d','Trần sao 3D','starlight',1),
('mercedes','a-class','A-Class','car',0),
('mercedes','c-class','C-Class','car',1),
('mercedes','e-class','E-Class','car',2),
('mercedes','s-class','S-Class','car',3),
('bmw','series-3','Series 3','car',0),
('bmw','series-5','Series 5','car',1),
('bmw','x5','X5','car',2),
('audi','a4','A4','car',0),
('audi','q5','Q5','car',1),
('honda','civic','Civic','car',0),
('honda','cr-v','CR-V','car',1),
('toyota','camry','Camry','car',0),
('toyota','fortuner','Fortuner','car',1),
('vinfast','vf8','VF8','car',0),
('vinfast','lux-a','Lux A','car',1),
('ford','ranger','Ranger','car',0),
('ford','everest','Everest','car',1),
('kia','seltos','Seltos','car',0),
('kia','sorento','Sorento','car',1),
('hyundai','tucson','Tucson','car',0),
('hyundai','santa-fe','Santa Fe','car',1)) as v(cat,slug,name,image_key,sort)
join public.categories c on c.slug=v.cat;

insert into public.models (series_id,slug,name,years,image_key,sort)
select s.id,v.slug,v.name,v.years,v.image_key,v.sort from (values
('phu-kien-chung','camera-360','ban-2k','Bản 2K','2023-Nay','camera360',0),
('phu-kien-chung','camera-360','ban-4k','Bản 4K','2024-Nay','camera360',1),
('phu-kien-chung','cach-am','titan','Titan','Full xe','soundproof',0),
('loa-treble','loa-uc','burmester','Burmester','2018-Nay','tweeter',0),
('loa-treble','loa-uc','bosch','Bosch','2016-Nay','tweeter',1),
('loa-treble','loa-nhat','pioneer','Pioneer','2015-Nay','tweeter',0),
('den-tran-sao','soi-quang','380-iem','380 điểm','Phổ thông','starlight',0),
('den-tran-sao','soi-quang','550-iem','550 điểm','Cao cấp','starlight',1),
('den-tran-sao','tran-sao-3d','galaxy','Galaxy','Cao cấp','starlight',0),
('mercedes','a-class','w176','W176','2012-2018','car',0),
('mercedes','a-class','w177','W177','2018-Nay','car',1),
('mercedes','c-class','w205','W205','2014-2021','car',0),
('mercedes','c-class','w206','W206','2021-Nay','car',1),
('mercedes','e-class','w213','W213','2016-2023','car',0),
('mercedes','e-class','w214','W214','2023-Nay','car',1),
('mercedes','s-class','w222','W222','2013-2020','car',0),
('mercedes','s-class','w223','W223','2020-Nay','car',1),
('bmw','series-3','f30','F30','2012-2019','car',0),
('bmw','series-3','g20','G20','2019-Nay','car',1),
('bmw','series-5','g30','G30','2017-2023','car',0),
('bmw','series-5','g60','G60','2023-Nay','car',1),
('bmw','x5','g05','G05','2019-Nay','car',0),
('audi','a4','b9','B9','2016-Nay','car',0),
('audi','q5','fy','FY','2017-Nay','car',0),
('honda','civic','fc','FC','2016-2021','car',0),
('honda','civic','fe','FE','2021-Nay','car',1),
('honda','cr-v','rw','RW','2017-2023','car',0),
('toyota','camry','xv70','XV70','2018-Nay','car',0),
('toyota','fortuner','an160','AN160','2016-Nay','car',0),
('vinfast','vf8','vf8','VF8','2022-Nay','car',0),
('vinfast','lux-a','lux-a2-0','Lux A2.0','2019-2022','car',0),
('ford','ranger','p703','P703','2022-Nay','car',0),
('ford','everest','u704','U704','2022-Nay','car',0),
('kia','seltos','sp2','SP2','2019-Nay','car',0),
('kia','sorento','mq4','MQ4','2020-Nay','car',0),
('hyundai','tucson','nx4','NX4','2021-Nay','car',0),
('hyundai','santa-fe','tm','TM','2018-2023','car',0)) as v(cat,ser,slug,name,years,image_key,sort)
join public.categories c on c.slug=v.cat join public.series s on s.category_id=c.id and s.slug=v.ser;

insert into public.products (model_id,name,form_code,image_key,price,install_price,price_note,description,brand,origin,warranty,specs,variants,sort)
select m.id,v.name,m.name||' ('||m.years||')',v.image_key,v.price,v.install_price,v.price_note,v.description,v.brand,v.origin,v.warranty,v.specs,v.variants,v.sort
from public.models m cross join (values
('Bộ đèn trần sao 3D quang học','starlight',12500000,1500000,null,'Sợi quang 380 điểm, điều khiển qua app, ánh sáng RGB đa chế độ.','AutoDeco Lux','Đài Loan','24 tháng','[{"label":"Số điểm sao","value":"380 điểm (tuỳ chọn 550 / 720)"},{"label":"Loại sợi quang","value":"PMMA 0.75mm, chống ố vàng"},{"label":"Nguồn sáng","value":"LED RGB 16 triệu màu, 15W"},{"label":"Điều khiển","value":"App Bluetooth + remote cảm ứng"},{"label":"Thời gian lắp","value":"8 - 10 giờ (hạ trần)"}]'::jsonb,'[{"name":"Bản 380 điểm","price":12500000,"highlight":"Phổ thông, sao tĩnh","warranty":"24 tháng"},{"name":"Bản 550 điểm","price":16800000,"highlight":"Sao băng 2 tia","warranty":"24 tháng"},{"name":"Bản Galaxy 720","price":23500000,"highlight":"Sao băng 4 tia + dải ngân hà","warranty":"36 tháng"}]'::jsonb,0),
('Loa Treble bệ cửa nguyên bản','tweeter',8900000,800000,null,'Zin theo form xe, không cần khoan cắt, âm hình cao và trong.','Burmester Style','Đức / lắp ráp VN','12 tháng','[{"label":"Đường kính","value":"25mm dome lụa"},{"label":"Công suất","value":"60W RMS / 120W peak"},{"label":"Dải tần","value":"2.5kHz - 22kHz"},{"label":"Trở kháng","value":"4 Ohm"},{"label":"Lắp đặt","value":"Zin theo form, giắc cắm nguyên bản"}]'::jsonb,'[{"name":"Bản tiêu chuẩn","price":8900000,"highlight":"2 loa treble bệ cửa","warranty":"12 tháng"},{"name":"Bản đủ bộ 4 loa","price":14900000,"highlight":"Thêm 2 loa cột A","warranty":"18 tháng"},{"name":"Bản có đèn viền","price":17500000,"highlight":"Loa phát sáng đồng bộ ambient","warranty":"18 tháng"}]'::jsonb,1),
('Viền nội thất mạ crom + đèn viền','ambientTrim',6400000,null,'Giá đã bao gồm công lắp đặt','Đèn viền chạy dải 64 màu đồng bộ hệ thống ambient nguyên bản.','AutoDeco Trim','Việt Nam','12 tháng','[{"label":"Chất liệu","value":"ABS mạ crom + acrylic dẫn sáng"},{"label":"Số màu","value":"64 màu, 11 chế độ hiệu ứng"},{"label":"Nguồn","value":"12V lấy nguồn nội thất, 8W"},{"label":"Đồng bộ","value":"Theo nhạc / theo chế độ lái"},{"label":"Thời gian lắp","value":"3 - 4 giờ"}]'::jsonb,'[{"name":"Bộ 4 cửa","price":6400000,"highlight":"Viền cửa cơ bản","warranty":"12 tháng"},{"name":"Bộ 4 cửa + taplo","price":9800000,"highlight":"Chạy liền mạch taplo","warranty":"12 tháng"},{"name":"Bộ full nội thất","price":14200000,"highlight":"Thêm chân ga, hộc để chân","warranty":"24 tháng"}]'::jsonb,2),
('Camera 360 độ 2K liền màn','camera360',15900000,1200000,null,'4 mắt AHD 2K, ghi hình hành trình trước/sau, cảnh báo điểm mù.','AutoDeco Vision','Hàn Quốc','24 tháng','[{"label":"Độ phân giải","value":"2K (2560×1440) mỗi mắt"},{"label":"Góc nhìn","value":"190° fisheye, ghép 3D"},{"label":"Ghi hình","value":"Hành trình trước + sau, vòng lặp"},{"label":"Tính năng","value":"Cảnh báo điểm mù, hỗ trợ đỗ xe"},{"label":"Kết nối","value":"Xuất hình lên màn zin qua giắc chuyên dụng"}]'::jsonb,'[{"name":"Bản 2K","price":15900000,"highlight":"Ghép hình 2D/3D","warranty":"24 tháng"},{"name":"Bản 4K","price":21900000,"highlight":"Ghi hình 4K, đêm rõ nét","warranty":"24 tháng"},{"name":"Bản 4K + AI","price":27500000,"highlight":"AI cảnh báo va chạm, ADAS","warranty":"36 tháng"}]'::jsonb,3),
('Cách âm chống ồn toàn xe','soundproof',11500000,null,'Giá trọn gói theo dòng xe','Vật liệu butyl + cao su non, giảm 6-10dB tiếng ồn khoang lái.','SilentPro','Nga / Đài Loan','36 tháng','[{"label":"Vật liệu","value":"Butyl 2.0mm + cao su non 10mm"},{"label":"Vị trí thi công","value":"4 cửa, sàn, nắp capo, cốp, hốc bánh"},{"label":"Hiệu quả","value":"Giảm 6 - 10dB ở 80km/h"},{"label":"Chịu nhiệt","value":"-40°C đến 120°C, không chảy nhựa"},{"label":"Thời gian thi công","value":"1 - 2 ngày"}]'::jsonb,'[{"name":"Gói 4 cửa","price":6500000,"highlight":"Giảm ồn gió & dội loa","warranty":"36 tháng"},{"name":"Gói toàn xe","price":11500000,"highlight":"Thêm sàn, cốp, capo","warranty":"36 tháng"},{"name":"Gói Titan","price":18900000,"highlight":"3 lớp + hốc bánh, cao cấp nhất","warranty":"60 tháng"}]'::jsonb,4)) as v(name,image_key,price,install_price,price_note,description,brand,origin,warranty,specs,variants,sort);

insert into public.videos (model_id,title,url,sort)
select m.id,v.title,v.url,v.sort from public.models m cross join (values
('Clip lắp đặt thực tế tại xưởng','https://www.youtube.com/embed/ScMzIvxBSi4',0),
('Nghiệm thu & demo hiệu ứng ban đêm','https://www.youtube.com/embed/aqz-KE-bpKQ',1)) as v(title,url,sort);