
alter table public.series drop constraint series_category_id_fkey,
  add constraint series_category_id_fkey foreign key (category_id) references public.categories(id) on delete cascade;

alter table public.models drop constraint models_series_id_fkey,
  add constraint models_series_id_fkey foreign key (series_id) references public.series(id) on delete cascade;

alter table public.videos drop constraint videos_model_id_fkey,
  add constraint videos_model_id_fkey foreign key (model_id) references public.models(id) on delete cascade;

alter table public.nodes drop constraint nodes_category_id_fkey,
  add constraint nodes_category_id_fkey foreign key (category_id) references public.categories(id) on delete cascade;

alter table public.nodes drop constraint nodes_parent_id_fkey,
  add constraint nodes_parent_id_fkey foreign key (parent_id) references public.nodes(id) on delete cascade;

alter table public.products drop constraint products_model_id_fkey,
  add constraint products_model_id_fkey foreign key (model_id) references public.models(id) on delete cascade;

alter table public.products drop constraint products_node_id_fkey,
  add constraint products_node_id_fkey foreign key (node_id) references public.nodes(id) on delete cascade;

alter table public.products drop constraint products_category_id_fkey,
  add constraint products_category_id_fkey foreign key (category_id) references public.categories(id) on delete cascade;

alter table public.product_dealer_prices drop constraint product_dealer_prices_product_id_fkey,
  add constraint product_dealer_prices_product_id_fkey foreign key (product_id) references public.products(id) on delete cascade;
