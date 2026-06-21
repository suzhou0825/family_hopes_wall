create extension if not exists pgcrypto with schema extensions;

drop function if exists public.register_app_account(text, text, text);
drop function if exists public.register_app_account(text, text, text, text);
drop function if exists public.create_family_member_account(text, text, text, text, text, text, text, text);
drop function if exists public.delete_family_member_account(text, text);
drop function if exists public.create_child_account(text, text, text, text, text, text);
drop function if exists public.login_app_account(text, text);
drop function if exists public.get_app_state(text);
drop function if exists public.save_app_state(text, jsonb);
drop function if exists public.update_app_account(text, text, text);
drop function if exists public.update_app_account(text, text, text, text);
drop function if exists public.account_from_token(text);
drop function if exists public.ensure_account_family(uuid);
drop function if exists public.create_app_session(uuid);
drop function if exists public.validate_app_username(text);
drop function if exists public.validate_app_password(text);
drop function if exists public.ensure_child_point_account(uuid, text);
drop function if exists public.refresh_family_pet_daily(uuid);
drop function if exists public.get_family_economy(text);
drop function if exists public.award_task_points(text, text, integer, text, text);
drop function if exists public.redeem_point_item(text, text);
drop function if exists public.adopt_app_pet(text, text);
drop function if exists public.abandon_app_pet(text, uuid);
drop function if exists public.interact_app_pet(text, uuid, text, text);
drop function if exists public.save_reward_item(text, uuid, text, text, text, integer, integer, text);
drop function if exists public.set_reward_item_status(text, uuid, boolean);
drop function if exists public.redeem_reward_item(text, uuid);

drop table if exists public.app_data cascade;
drop table if exists public.app_state cascade;
drop table if exists public.profiles cascade;

create table if not exists public.app_families (
  id uuid primary key default extensions.gen_random_uuid(),
  created_at timestamptz not null default now()
);

create table if not exists public.app_accounts (
  id uuid primary key default extensions.gen_random_uuid(),
  username text not null unique,
  display_name text not null,
  password_hash text not null,
  family_id uuid references public.app_families(id) on delete cascade,
  member_id text,
  role text not null default 'parent',
  parent_title text,
  child_title text,
  gender text,
  avatar_id text not null default 'father_01',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.app_accounts
add column if not exists family_id uuid references public.app_families(id) on delete cascade,
add column if not exists member_id text,
add column if not exists role text not null default 'parent',
add column if not exists parent_title text,
add column if not exists child_title text,
add column if not exists gender text,
add column if not exists avatar_id text not null default 'father_01';

alter table public.app_accounts alter column avatar_id set default 'father_01';

update public.app_accounts
set avatar_id = case
  when role = 'parent' and parent_title = '妈妈' then 'mother_01'
  when role = 'child' and child_title = '哥哥' then 'older_brother_01'
  when role = 'child' and child_title = '姐姐' then 'older_sister_01'
  when role = 'child' and child_title = '妹妹' then 'younger_sister_01'
  when role = 'child' then 'younger_brother_01'
  else 'father_01'
end
where avatar_id is null or avatar_id in ('star', 'rocket', 'flower', 'sun');

create table if not exists public.app_sessions (
  token_hash text primary key,
  account_id uuid not null references public.app_accounts(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);

create table if not exists public.app_family_data (
  family_id uuid primary key references public.app_families(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.app_point_accounts (
  family_id uuid not null references public.app_families(id) on delete cascade,
  member_id text not null,
  balance integer not null default 100 check (balance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (family_id, member_id)
);

create table if not exists public.app_point_transactions (
  id uuid primary key default extensions.gen_random_uuid(),
  family_id uuid not null references public.app_families(id) on delete cascade,
  member_id text not null,
  amount integer not null check (amount <> 0),
  balance_after integer not null check (balance_after >= 0),
  category text not null,
  description text not null,
  source_type text,
  source_id text,
  created_at timestamptz not null default now()
);

create unique index if not exists app_point_transactions_source_unique
on public.app_point_transactions (family_id, member_id, source_type, source_id)
where source_type is not null and source_id is not null;

create table if not exists public.app_pet_adoptions (
  id uuid primary key default extensions.gen_random_uuid(),
  family_id uuid not null references public.app_families(id) on delete cascade,
  member_id text not null,
  pet_id text not null check (pet_id in ('corgi_star', 'poodle_cloud', 'ragdoll_moon', 'orange_star')),
  status text not null default 'active' check (status in ('active', 'abandoned')),
  adopted_at timestamptz not null default now(),
  abandoned_at timestamptz,
  growth_value integer not null default 10 check (growth_value >= 0),
  mood text not null default '开心',
  hunger integer not null default 80 check (hunger between 0 and 100),
  happiness integer not null default 80 check (happiness between 0 and 100),
  cleanliness integer not null default 80 check (cleanliness between 0 and 100),
  energy integer not null default 80 check (energy between 0 and 100),
  outfit_id text not null default 'classic',
  daily_thought text not null default '今天也想和你一起完成一件小事。',
  thought_date date not null default current_date,
  updated_at timestamptz not null default now(),
  unique (family_id, member_id, pet_id)
);

create table if not exists public.app_pet_interactions (
  id uuid primary key default extensions.gen_random_uuid(),
  adoption_id uuid not null references public.app_pet_adoptions(id) on delete cascade,
  action text not null check (action in ('feed', 'play', 'dress', 'pet_head', 'pet_body', 'pet_paw')),
  detail text,
  created_at timestamptz not null default now()
);

alter table public.app_pet_interactions drop constraint if exists app_pet_interactions_action_check;
alter table public.app_pet_interactions add constraint app_pet_interactions_action_check
  check (action in ('feed', 'play', 'dress', 'pet_head', 'pet_body', 'pet_paw'));

create table if not exists public.app_reward_items (
  id uuid primary key default extensions.gen_random_uuid(),
  family_id uuid not null references public.app_families(id) on delete cascade,
  item_type text not null check (item_type in ('physical', 'virtual')),
  name text not null,
  description text not null,
  cost integer not null check (cost > 0),
  stock integer check (stock is null or stock >= 0),
  icon text not null default '🎁',
  is_active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.app_reward_redemptions (
  id uuid primary key default extensions.gen_random_uuid(),
  family_id uuid not null references public.app_families(id) on delete cascade,
  member_id text not null,
  reward_item_id uuid not null references public.app_reward_items(id) on delete restrict,
  cost integer not null check (cost > 0),
  status text not null check (status in ('pending', 'fulfilled')),
  created_at timestamptz not null default now()
);

alter table public.app_families enable row level security;
alter table public.app_accounts enable row level security;
alter table public.app_sessions enable row level security;
alter table public.app_family_data enable row level security;
alter table public.app_point_accounts enable row level security;
alter table public.app_point_transactions enable row level security;
alter table public.app_pet_adoptions enable row level security;
alter table public.app_pet_interactions enable row level security;
alter table public.app_reward_items enable row level security;
alter table public.app_reward_redemptions enable row level security;

with inserted_accounts as (
  insert into public.app_point_accounts (family_id, member_id, balance)
  select family_id, member_id, 100
  from public.app_accounts
  where role = 'child' and family_id is not null and member_id is not null
  on conflict (family_id, member_id) do nothing
  returning family_id, member_id, balance
)
insert into public.app_point_transactions (
  family_id, member_id, amount, balance_after, category, description, source_type, source_id
)
select family_id, member_id, 100, balance, 'system_grant', '系统授予初始成长星', 'initial_grant', member_id
from inserted_accounts
on conflict do nothing;

create or replace function public.validate_app_password(p_password text)
returns boolean
language sql
immutable
as $$
  select coalesce(length(p_password) >= 8 and p_password ~ '[A-Za-z]' and p_password ~ '[0-9]', false);
$$;

create or replace function public.validate_app_username(p_username text)
returns boolean
language sql
immutable
as $$
  select coalesce(p_username ~ '^[a-z0-9_]{3,32}$', false);
$$;

create or replace function public.account_json(p_account public.app_accounts)
returns jsonb
language sql
stable
as $$
  select jsonb_build_object(
    'id', p_account.id,
    'username', p_account.username,
    'display_name', p_account.display_name,
    'family_id', p_account.family_id,
    'member_id', p_account.member_id,
    'role', p_account.role,
    'parent_title', p_account.parent_title,
    'child_title', p_account.child_title,
    'gender', p_account.gender,
    'avatar_id', p_account.avatar_id,
    'created_at', p_account.created_at,
    'updated_at', p_account.updated_at
  );
$$;

create or replace function public.create_app_session(p_account_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  raw_token text;
begin
  raw_token := encode(extensions.gen_random_bytes(32), 'hex');

  insert into public.app_sessions (token_hash, account_id, expires_at)
  values (encode(extensions.digest(raw_token, 'sha256'), 'hex'), p_account_id, now() + interval '30 days');

  return raw_token;
end;
$$;

create or replace function public.ensure_account_family(p_account_id uuid)
returns public.app_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account public.app_accounts;
  new_family public.app_families;
  initial_data jsonb;
begin
  select * into target_account
  from public.app_accounts
  where id = p_account_id
  for update;

  if target_account.id is null then
    raise exception '账号不存在';
  end if;

  if target_account.family_id is not null then
    return target_account;
  end if;

  insert into public.app_families default values
  returning * into new_family;

  update public.app_accounts
  set
    family_id = new_family.id,
    member_id = coalesce(member_id, extensions.gen_random_uuid()::text),
    role = coalesce(role, 'parent'),
    parent_title = coalesce(parent_title, '爸爸'),
    updated_at = now()
  where id = target_account.id
  returning * into target_account;

  initial_data := jsonb_build_object(
    'members',
    jsonb_build_array(
      jsonb_build_object(
        'id', target_account.member_id,
        'name', target_account.display_name,
        'role', 'parent',
        'title', target_account.parent_title,
        'accountUsername', target_account.username
      )
    ),
    'wishes',
    '[]'::jsonb,
    'tasks',
    '[]'::jsonb
  );

  insert into public.app_family_data (family_id, data)
  values (target_account.family_id, initial_data)
  on conflict (family_id) do nothing;

  return target_account;
end;
$$;

create or replace function public.account_from_token(p_raw_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account_id uuid;
begin
  select account_id into target_account_id
  from public.app_sessions
  where token_hash = encode(extensions.digest(p_raw_token, 'sha256'), 'hex')
    and expires_at > now();

  if target_account_id is null then
    raise exception '登录已失效，请重新登录';
  end if;

  return target_account_id;
end;
$$;

create or replace function public.ensure_child_point_account(p_family_id uuid, p_member_id text)
returns public.app_point_accounts
language plpgsql
security definer
set search_path = public
as $$
declare
  point_account public.app_point_accounts;
  was_created boolean := false;
begin
  insert into public.app_point_accounts (family_id, member_id, balance)
  values (p_family_id, p_member_id, 100)
  on conflict (family_id, member_id) do nothing
  returning * into point_account;

  was_created := point_account.member_id is not null;

  if not was_created then
    select * into point_account
    from public.app_point_accounts
    where family_id = p_family_id and member_id = p_member_id;
  else
    insert into public.app_point_transactions (
      family_id, member_id, amount, balance_after, category, description, source_type, source_id
    ) values (
      p_family_id, p_member_id, 100, 100, 'system_grant', '系统授予初始成长星', 'initial_grant', p_member_id
    ) on conflict do nothing;
  end if;

  return point_account;
end;
$$;

create or replace function public.refresh_family_pet_daily(p_family_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  moods text[] := array['开心', '期待', '安心', '好奇', '元气满满'];
  thoughts text[] := array[
    '今天也想和你一起完成一件小事。',
    '被认真陪伴的每一天都值得收藏。',
    '慢慢长大，也要记得为自己鼓掌。',
    '今天的努力，会变成明天的小惊喜。',
    '有你回来看看我，心里就暖暖的。',
    '一起保持好奇，去发现新的快乐。'
  ];
begin
  update public.app_pet_adoptions
  set
    growth_value = greatest(10, (current_date - adopted_at::date + 1) * 10),
    mood = moods[1 + mod(ascii(substr(md5(pet_id || current_date::text), 1, 1)), array_length(moods, 1))],
    daily_thought = thoughts[1 + mod(ascii(substr(md5(current_date::text || pet_id), 1, 1)), array_length(thoughts, 1))],
    thought_date = current_date,
    updated_at = case when thought_date <> current_date then now() else updated_at end
  where family_id = p_family_id and status = 'active';
end;
$$;

create or replace function public.get_family_economy(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account public.app_accounts;
  account_items jsonb;
  transaction_items jsonb;
  adoption_items jsonb;
  interaction_items jsonb;
  reward_items jsonb;
  redemption_items jsonb;
begin
  select * into target_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  insert into public.app_point_accounts (family_id, member_id, balance)
  select target_account.family_id, account.member_id, 100
  from public.app_accounts account
  where account.family_id = target_account.family_id
    and account.role = 'child'
    and account.member_id is not null
  on conflict (family_id, member_id) do nothing;

  insert into public.app_point_transactions (
    family_id, member_id, amount, balance_after, category, description, source_type, source_id
  )
  select point_account.family_id, point_account.member_id, 100, 100, 'system_grant', '系统授予初始成长星', 'initial_grant', point_account.member_id
  from public.app_point_accounts point_account
  where point_account.family_id = target_account.family_id
    and not exists (
      select 1 from public.app_point_transactions transaction_item
      where transaction_item.family_id = point_account.family_id
        and transaction_item.member_id = point_account.member_id
        and transaction_item.source_type = 'initial_grant'
        and transaction_item.source_id = point_account.member_id
    )
  on conflict do nothing;

  perform public.refresh_family_pet_daily(target_account.family_id);

  select coalesce(jsonb_agg(jsonb_build_object(
    'memberId', member_id,
    'balance', balance,
    'createdAt', created_at,
    'updatedAt', updated_at
  ) order by balance desc), '[]'::jsonb) into account_items
  from public.app_point_accounts
  where family_id = target_account.family_id
    and (target_account.role = 'parent' or member_id = target_account.member_id);

  select coalesce(jsonb_agg(item order by item->>'createdAt' desc), '[]'::jsonb) into transaction_items
  from (
    select jsonb_build_object(
      'id', id,
      'memberId', member_id,
      'amount', amount,
      'balanceAfter', balance_after,
      'category', category,
      'description', description,
      'createdAt', created_at
    ) as item
    from public.app_point_transactions
    where family_id = target_account.family_id
      and (target_account.role = 'parent' or member_id = target_account.member_id)
    order by created_at desc
    limit 100
  ) transactions;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'memberId', member_id,
    'petId', pet_id,
    'status', status,
    'adoptedAt', adopted_at,
    'abandonedAt', abandoned_at,
    'growthValue', growth_value,
    'mood', mood,
    'hunger', hunger,
    'happiness', happiness,
    'cleanliness', cleanliness,
    'energy', energy,
    'outfitId', outfit_id,
    'dailyThought', daily_thought,
    'thoughtDate', thought_date,
    'updatedAt', updated_at
  ) order by adopted_at), '[]'::jsonb) into adoption_items
  from public.app_pet_adoptions
  where family_id = target_account.family_id
    and status = 'active'
    and (target_account.role = 'parent' or member_id = target_account.member_id);

  select coalesce(jsonb_agg(item order by item->>'createdAt' desc), '[]'::jsonb) into interaction_items
  from (
    select jsonb_build_object(
      'id', interaction.id,
      'adoptionId', interaction.adoption_id,
      'action', interaction.action,
      'detail', interaction.detail,
      'createdAt', interaction.created_at
    ) as item
    from public.app_pet_interactions interaction
    join public.app_pet_adoptions adoption on adoption.id = interaction.adoption_id
    where adoption.family_id = target_account.family_id
      and (target_account.role = 'parent' or adoption.member_id = target_account.member_id)
    order by interaction.created_at desc
    limit 100
  ) interactions;

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', id,
    'itemType', item_type,
    'name', name,
    'description', description,
    'cost', cost,
    'stock', stock,
    'icon', icon,
    'isActive', is_active,
    'createdBy', created_by,
    'createdAt', created_at,
    'updatedAt', updated_at
  ) order by created_at desc), '[]'::jsonb) into reward_items
  from public.app_reward_items
  where family_id = target_account.family_id
    and (target_account.role = 'parent' or is_active = true);

  select coalesce(jsonb_agg(jsonb_build_object(
    'id', redemption.id,
    'memberId', redemption.member_id,
    'rewardItemId', redemption.reward_item_id,
    'cost', redemption.cost,
    'status', redemption.status,
    'createdAt', redemption.created_at
  ) order by redemption.created_at desc), '[]'::jsonb) into redemption_items
  from public.app_reward_redemptions redemption
  where redemption.family_id = target_account.family_id
    and (target_account.role = 'parent' or redemption.member_id = target_account.member_id);

  return jsonb_build_object(
    'pointAccounts', account_items,
    'transactions', transaction_items,
    'petAdoptions', adoption_items,
    'petInteractions', interaction_items,
    'rewardItems', reward_items,
    'redemptions', redemption_items
  );
end;
$$;

create or replace function public.award_task_points(
  p_token text,
  p_member_id text,
  p_points integer,
  p_task_id text,
  p_description text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_account public.app_accounts;
  point_account public.app_point_accounts;
begin
  select * into parent_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if parent_account.role <> 'parent' then
    raise exception '只有父母账号可以发放任务积分';
  end if;

  if p_points is null or p_points <= 0 then
    raise exception '积分奖励必须大于 0';
  end if;

  if not exists (
    select 1 from public.app_accounts
    where family_id = parent_account.family_id and member_id = p_member_id and role = 'child'
  ) then
    raise exception '孩子账号不存在';
  end if;

  if exists (
    select 1 from public.app_point_transactions
    where family_id = parent_account.family_id
      and member_id = p_member_id
      and source_type = 'task_reward'
      and source_id = p_task_id
  ) then
    return jsonb_build_object('ok', true, 'duplicate', true);
  end if;

  point_account := public.ensure_child_point_account(parent_account.family_id, p_member_id);

  update public.app_point_accounts
  set balance = balance + p_points, updated_at = now()
  where family_id = parent_account.family_id and member_id = p_member_id
  returning * into point_account;

  insert into public.app_point_transactions (
    family_id, member_id, amount, balance_after, category, description, source_type, source_id
  ) values (
    parent_account.family_id,
    p_member_id,
    p_points,
    point_account.balance,
    'task_reward',
    coalesce(nullif(trim(p_description), ''), '完成任务获得成长星'),
    'task_reward',
    p_task_id
  );

  return jsonb_build_object('ok', true, 'balance', point_account.balance);
end;
$$;

create or replace function public.redeem_point_item(p_token text, p_item_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  child_account public.app_accounts;
  point_account public.app_point_accounts;
  item_cost integer;
  item_name text;
  transaction_id uuid := extensions.gen_random_uuid();
begin
  select * into child_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if child_account.role <> 'child' then
    raise exception '只有孩子账号可以兑换积分物品';
  end if;

  item_cost := case p_item_id
    when 'family_movie' then 600
    when 'weekend_picnic' then 800
    when 'star_curtain' then 80
    when 'pet_toy' then 200
    else null
  end;
  item_name := case p_item_id
    when 'family_movie' then '亲子电影夜'
    when 'weekend_picnic' then '周末野餐券'
    when 'star_curtain' then '星光窗帘'
    when 'pet_toy' then '宠物互动玩具'
    else null
  end;

  if item_cost is null then
    raise exception '兑换物品编号无效';
  end if;

  point_account := public.ensure_child_point_account(child_account.family_id, child_account.member_id);
  if point_account.balance < item_cost then
    raise exception '成长星余额不足';
  end if;

  update public.app_point_accounts
  set balance = balance - item_cost, updated_at = now()
  where family_id = child_account.family_id and member_id = child_account.member_id
  returning * into point_account;

  insert into public.app_point_transactions (
    id, family_id, member_id, amount, balance_after, category, description, source_type, source_id
  ) values (
    transaction_id, child_account.family_id, child_account.member_id, -item_cost, point_account.balance,
    'redemption', '兑换' || item_name, 'redemption', transaction_id::text
  );

  return jsonb_build_object('ok', true, 'balance', point_account.balance, 'cost', item_cost, 'itemName', item_name);
end;
$$;

create or replace function public.adopt_app_pet(p_token text, p_pet_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  child_account public.app_accounts;
  point_account public.app_point_accounts;
  adoption_count integer;
  adoption_cost integer;
  adoption public.app_pet_adoptions;
begin
  select * into child_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if child_account.role <> 'child' then
    raise exception '只有孩子账号可以领养电子宠物';
  end if;

  if p_pet_id not in ('corgi_star', 'poodle_cloud', 'ragdoll_moon', 'orange_star') then
    raise exception '宠物编号无效';
  end if;

  select count(*) into adoption_count
  from public.app_pet_adoptions
  where family_id = child_account.family_id and member_id = child_account.member_id and status = 'active';

  if adoption_count >= 2 then
    raise exception '每个孩子最多领养 2 只电子宠物';
  end if;

  if exists (
    select 1 from public.app_pet_adoptions
    where family_id = child_account.family_id and member_id = child_account.member_id and pet_id = p_pet_id and status = 'active'
  ) then
    raise exception '这只宠物已经领养';
  end if;

  adoption_cost := case when adoption_count = 0 then 0 else 500 end;
  point_account := public.ensure_child_point_account(child_account.family_id, child_account.member_id);

  if point_account.balance < adoption_cost then
    raise exception '成长星不足，第二只宠物需要 500 成长星';
  end if;

  insert into public.app_pet_adoptions (
    family_id, member_id, pet_id, status, adopted_at, abandoned_at, growth_value,
    mood, hunger, happiness, cleanliness, energy, outfit_id, daily_thought, thought_date, updated_at
  ) values (
    child_account.family_id, child_account.member_id, p_pet_id, 'active', now(), null, 10,
    '开心', 80, 80, 80, 80, 'classic', '今天也想和你一起完成一件小事。', current_date, now()
  )
  on conflict (family_id, member_id, pet_id)
  do update set
    status = 'active', adopted_at = now(), abandoned_at = null, growth_value = 10,
    mood = '开心', hunger = 80, happiness = 80, cleanliness = 80, energy = 80,
    outfit_id = 'classic', daily_thought = '今天也想和你一起完成一件小事。',
    thought_date = current_date, updated_at = now()
  returning * into adoption;

  if adoption_cost > 0 then
    update public.app_point_accounts
    set balance = balance - adoption_cost, updated_at = now()
    where family_id = child_account.family_id and member_id = child_account.member_id
    returning * into point_account;

    insert into public.app_point_transactions (
      family_id, member_id, amount, balance_after, category, description, source_type, source_id
    ) values (
      child_account.family_id, child_account.member_id, -adoption_cost, point_account.balance,
      'pet_adoption', '领养第二只电子宠物', 'pet_adoption', adoption.id::text || '-' || extract(epoch from adoption.adopted_at)::text
    );
  end if;

  return jsonb_build_object('ok', true, 'adoptionId', adoption.id, 'cost', adoption_cost, 'balance', point_account.balance);
end;
$$;

create or replace function public.abandon_app_pet(p_token text, p_adoption_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  child_account public.app_accounts;
  point_account public.app_point_accounts;
  adoption public.app_pet_adoptions;
begin
  select * into child_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if child_account.role <> 'child' then
    raise exception '只有孩子账号可以操作自己的电子宠物';
  end if;

  select * into adoption
  from public.app_pet_adoptions
  where id = p_adoption_id
    and family_id = child_account.family_id
    and member_id = child_account.member_id
    and status = 'active'
  for update;

  if adoption.id is null then
    raise exception '电子宠物不存在或已经弃养';
  end if;

  point_account := public.ensure_child_point_account(child_account.family_id, child_account.member_id);
  if point_account.balance < 2000 then
    raise exception '弃养需要扣除 2000 成长星，当前余额不足';
  end if;

  update public.app_point_accounts
  set balance = balance - 2000, updated_at = now()
  where family_id = child_account.family_id and member_id = child_account.member_id
  returning * into point_account;

  update public.app_pet_adoptions
  set status = 'abandoned', abandoned_at = now(), updated_at = now()
  where id = adoption.id;

  insert into public.app_point_transactions (
    family_id, member_id, amount, balance_after, category, description, source_type, source_id
  ) values (
    child_account.family_id, child_account.member_id, -2000, point_account.balance,
    'pet_abandonment', '弃养电子宠物扣除成长星', 'pet_abandonment', adoption.id::text || '-' || extract(epoch from adoption.adopted_at)::text
  );

  return jsonb_build_object('ok', true, 'balance', point_account.balance);
end;
$$;

create or replace function public.interact_app_pet(
  p_token text,
  p_adoption_id uuid,
  p_action text,
  p_detail text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  child_account public.app_accounts;
  adoption public.app_pet_adoptions;
begin
  select * into child_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if child_account.role <> 'child' then
    raise exception '只有孩子账号可以与电子宠物互动';
  end if;

  if p_action not in ('feed', 'play', 'dress', 'pet_head', 'pet_body', 'pet_paw') then
    raise exception '宠物互动类型无效';
  end if;

  select * into adoption
  from public.app_pet_adoptions
  where id = p_adoption_id
    and family_id = child_account.family_id
    and member_id = child_account.member_id
    and status = 'active'
  for update;

  if adoption.id is null then
    raise exception '电子宠物不存在';
  end if;

  update public.app_pet_adoptions
  set
    hunger = case when p_action = 'feed' then least(100, hunger + 20) else hunger end,
    happiness = case when p_action = 'play' then least(100, happiness + 18) when p_action in ('pet_head', 'pet_body', 'pet_paw') then least(100, happiness + 3) else happiness end,
    energy = case when p_action = 'feed' then least(100, energy + 4) when p_action = 'play' then greatest(0, energy - 8) else energy end,
    mood = case when p_action = 'feed' then '满足' when p_action = 'play' then '兴奋' when p_action = 'dress' then '神气' when p_action = 'pet_head' then '开心' when p_action = 'pet_body' then '安心' when p_action = 'pet_paw' then '兴奋' else mood end,
    outfit_id = case when p_action = 'dress' then coalesce(nullif(trim(p_detail), ''), 'classic') else outfit_id end,
    daily_thought = case
      when p_action = 'feed' then '肚子饱饱的，谢谢你照顾我。'
      when p_action = 'play' then '刚才的游戏真开心，还想再玩一次。'
      when p_action = 'dress' then '今天的新装扮让我觉得很神气。'
      when p_action = 'pet_head' then '你摸摸我的头，我就知道你在关心我。'
      when p_action = 'pet_body' then '安静地靠在你身边，我觉得很安心。'
      when p_action = 'pet_paw' then '击掌成功，我们今天也要一起加油。'
      else daily_thought
    end,
    thought_date = current_date,
    updated_at = now()
  where id = adoption.id
  returning * into adoption;

  insert into public.app_pet_interactions (adoption_id, action, detail)
  values (adoption.id, p_action, p_detail);

  return jsonb_build_object('ok', true, 'adoptionId', adoption.id);
end;
$$;

create or replace function public.save_reward_item(
  p_token text,
  p_item_id uuid,
  p_item_type text,
  p_name text,
  p_description text,
  p_cost integer,
  p_stock integer,
  p_icon text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_account public.app_accounts;
  reward_item public.app_reward_items;
begin
  select * into parent_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if parent_account.role <> 'parent' then
    raise exception '只有父母账号可以上架兑换奖品';
  end if;
  if p_item_type not in ('physical', 'virtual') then
    raise exception '奖品类型无效';
  end if;
  if nullif(trim(p_name), '') is null or nullif(trim(p_description), '') is null then
    raise exception '奖品名称和说明不能为空';
  end if;
  if p_cost is null or p_cost <= 0 then
    raise exception '兑换价格必须大于 0';
  end if;
  if p_item_type = 'physical' and (p_stock is null or p_stock < 0) then
    raise exception '实物奖品必须填写有效库存';
  end if;

  if p_item_id is null then
    insert into public.app_reward_items (
      family_id, item_type, name, description, cost, stock, icon, is_active, created_by
    ) values (
      parent_account.family_id,
      p_item_type,
      trim(p_name),
      trim(p_description),
      p_cost,
      case when p_item_type = 'physical' then p_stock else null end,
      coalesce(nullif(trim(p_icon), ''), '🎁'),
      true,
      parent_account.member_id
    ) returning * into reward_item;
  else
    update public.app_reward_items
    set
      item_type = p_item_type,
      name = trim(p_name),
      description = trim(p_description),
      cost = p_cost,
      stock = case when p_item_type = 'physical' then p_stock else null end,
      icon = coalesce(nullif(trim(p_icon), ''), icon),
      updated_at = now()
    where id = p_item_id and family_id = parent_account.family_id
    returning * into reward_item;

    if reward_item.id is null then
      raise exception '奖品不存在';
    end if;
  end if;

  return jsonb_build_object('ok', true, 'itemId', reward_item.id);
end;
$$;

create or replace function public.set_reward_item_status(p_token text, p_item_id uuid, p_is_active boolean)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_account public.app_accounts;
begin
  select * into parent_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if parent_account.role <> 'parent' then
    raise exception '只有父母账号可以调整奖品状态';
  end if;

  update public.app_reward_items
  set is_active = p_is_active, updated_at = now()
  where id = p_item_id and family_id = parent_account.family_id;

  if not found then
    raise exception '奖品不存在';
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.redeem_reward_item(p_token text, p_item_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  child_account public.app_accounts;
  point_account public.app_point_accounts;
  reward_item public.app_reward_items;
  redemption public.app_reward_redemptions;
begin
  select * into child_account
  from public.app_accounts
  where id = public.account_from_token(p_token);

  if child_account.role <> 'child' then
    raise exception '只有孩子账号可以兑换奖品';
  end if;

  select * into reward_item
  from public.app_reward_items
  where id = p_item_id and family_id = child_account.family_id and is_active = true
  for update;

  if reward_item.id is null then
    raise exception '奖品不存在或已经下架';
  end if;
  if reward_item.item_type = 'physical' and coalesce(reward_item.stock, 0) <= 0 then
    raise exception '奖品库存不足';
  end if;

  point_account := public.ensure_child_point_account(child_account.family_id, child_account.member_id);
  if point_account.balance < reward_item.cost then
    raise exception '成长星余额不足';
  end if;

  update public.app_point_accounts
  set balance = balance - reward_item.cost, updated_at = now()
  where family_id = child_account.family_id and member_id = child_account.member_id
  returning * into point_account;

  if reward_item.item_type = 'physical' then
    update public.app_reward_items
    set stock = stock - 1, updated_at = now()
    where id = reward_item.id;
  end if;

  insert into public.app_reward_redemptions (
    family_id, member_id, reward_item_id, cost, status
  ) values (
    child_account.family_id,
    child_account.member_id,
    reward_item.id,
    reward_item.cost,
    case when reward_item.item_type = 'physical' then 'pending' else 'fulfilled' end
  ) returning * into redemption;

  insert into public.app_point_transactions (
    family_id, member_id, amount, balance_after, category, description, source_type, source_id
  ) values (
    child_account.family_id,
    child_account.member_id,
    -reward_item.cost,
    point_account.balance,
    'redemption',
    '兑换' || reward_item.name,
    'reward_redemption',
    redemption.id::text
  );

  return jsonb_build_object('ok', true, 'balance', point_account.balance, 'itemName', reward_item.name);
end;
$$;

create or replace function public.register_app_account(
  p_username text,
  p_password text,
  p_display_name text default null,
  p_parent_title text default '爸爸'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_username text;
  normalized_parent_title text;
  new_family public.app_families;
  new_account public.app_accounts;
  raw_token text;
  initial_data jsonb;
begin
  normalized_username := lower(trim(p_username));
  normalized_parent_title := coalesce(nullif(trim(p_parent_title), ''), '爸爸');

  if not public.validate_app_username(normalized_username) then
    raise exception '账号只能包含小写字母、数字、下划线，长度 3 到 32 位';
  end if;

  if normalized_parent_title not in ('爸爸', '妈妈') then
    raise exception '父母身份只能选择爸爸或妈妈';
  end if;

  if not public.validate_app_password(p_password) then
    raise exception '密码至少 8 位，并且必须包含字母和数字';
  end if;

  insert into public.app_families default values
  returning * into new_family;

  insert into public.app_accounts (
    username,
    display_name,
    password_hash,
    family_id,
    member_id,
    role,
    parent_title,
    avatar_id
  )
  values (
    normalized_username,
    coalesce(nullif(trim(p_display_name), ''), normalized_username),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    new_family.id,
    extensions.gen_random_uuid()::text,
    'parent',
    normalized_parent_title,
    case when normalized_parent_title = '妈妈' then 'mother_01' else 'father_01' end
  )
  returning * into new_account;

  initial_data := jsonb_build_object(
    'members',
    jsonb_build_array(
      jsonb_build_object(
        'id', new_account.member_id,
        'name', new_account.display_name,
        'role', 'parent',
        'title', normalized_parent_title,
        'avatarId', new_account.avatar_id,
        'accountUsername', new_account.username
      )
    ),
    'wishes',
    '[]'::jsonb,
    'tasks',
    '[]'::jsonb
  );

  insert into public.app_family_data (family_id, data)
  values (new_family.id, initial_data);

  raw_token := public.create_app_session(new_account.id);

  return jsonb_build_object(
    'token', raw_token,
    'account', public.account_json(new_account),
    'data', initial_data
  );
exception
  when unique_violation then
    raise exception '账号已存在';
end;
$$;

create or replace function public.login_app_account(p_username text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_username text;
  target_account public.app_accounts;
  raw_token text;
  saved_data jsonb;
begin
  normalized_username := lower(trim(p_username));

  select * into target_account
  from public.app_accounts
  where app_accounts.username = normalized_username;

  if target_account.id is null or target_account.password_hash <> extensions.crypt(p_password, target_account.password_hash) then
    raise exception '账号或密码错误';
  end if;

  target_account := public.ensure_account_family(target_account.id);
  raw_token := public.create_app_session(target_account.id);

  select data into saved_data
  from public.app_family_data
  where family_id = target_account.family_id;

  return jsonb_build_object(
    'token', raw_token,
    'account', public.account_json(target_account),
    'data', coalesce(saved_data, '{"members":[],"wishes":[],"tasks":[]}'::jsonb)
  );
end;
$$;

create or replace function public.get_app_state(p_token text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account_id uuid;
  target_account public.app_accounts;
  saved_data jsonb;
begin
  target_account_id := public.account_from_token(p_token);

  target_account := public.ensure_account_family(target_account_id);

  select data into saved_data
  from public.app_family_data
  where family_id = target_account.family_id;

  return jsonb_build_object(
    'account', public.account_json(target_account),
    'data', coalesce(saved_data, '{"members":[],"wishes":[],"tasks":[]}'::jsonb)
  );
end;
$$;

create or replace function public.save_app_state(p_token text, p_state_data jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account_id uuid;
  target_account public.app_accounts;
begin
  target_account_id := public.account_from_token(p_token);

  target_account := public.ensure_account_family(target_account_id);

  insert into public.app_family_data (family_id, data, updated_at)
  values (target_account.family_id, p_state_data, now())
  on conflict (family_id)
  do update set data = excluded.data, updated_at = now();

  return jsonb_build_object('ok', true);
end;
$$;

create or replace function public.update_app_account(
  p_token text,
  p_display_name text,
  p_new_password text default null,
  p_avatar_id text default 'father_01'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_account_id uuid;
  updated_account public.app_accounts;
begin
  target_account_id := public.account_from_token(p_token);

  if nullif(trim(p_new_password), '') is not null and not public.validate_app_password(p_new_password) then
    raise exception '新密码至少 8 位，并且必须包含字母和数字';
  end if;

  if coalesce(p_avatar_id, 'father_01') not in (
    'father_01', 'mother_01', 'older_brother_01', 'younger_brother_01', 'older_sister_01', 'younger_sister_01'
  ) then
    raise exception '头像编号无效';
  end if;

  update public.app_accounts
  set
    display_name = coalesce(nullif(trim(p_display_name), ''), app_accounts.display_name),
    avatar_id = coalesce(p_avatar_id, avatar_id),
    password_hash = case
      when nullif(trim(p_new_password), '') is null then password_hash
      else extensions.crypt(p_new_password, extensions.gen_salt('bf'))
    end,
    updated_at = now()
  where id = target_account_id
  returning * into updated_account;

  return jsonb_build_object('account', public.account_json(updated_account));
end;
$$;

create or replace function public.create_family_member_account(
  p_token text,
  p_username text,
  p_password text,
  p_display_name text,
  p_role text,
  p_parent_title text,
  p_gender text,
  p_child_title text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_account_id uuid;
  parent_account public.app_accounts;
  normalized_username text;
  normalized_role text;
  normalized_parent_title text;
  normalized_gender text;
  normalized_child_title text;
  member_account public.app_accounts;
  saved_data jsonb;
  next_data jsonb;
begin
  parent_account_id := public.account_from_token(p_token);

  parent_account := public.ensure_account_family(parent_account_id);

  if parent_account.role <> 'parent' then
    raise exception '只有父母账号可以添加孩子账号';
  end if;

  normalized_username := lower(trim(p_username));
  normalized_role := coalesce(nullif(trim(p_role), ''), 'child');
  normalized_parent_title := coalesce(nullif(trim(p_parent_title), ''), '妈妈');
  normalized_gender := coalesce(nullif(trim(p_gender), ''), '男孩');
  normalized_child_title := coalesce(nullif(trim(p_child_title), ''), '弟弟');

  if not public.validate_app_username(normalized_username) then
    raise exception '账号只能包含小写字母、数字、下划线，长度 3 到 32 位';
  end if;

  if normalized_role not in ('parent', 'child') then
    raise exception '家庭成员角色只能选择父母或孩子';
  end if;

  if normalized_parent_title not in ('爸爸', '妈妈') then
    raise exception '父母身份只能选择爸爸或妈妈';
  end if;

  if normalized_role = 'child' and normalized_gender not in ('男孩', '女孩') then
    raise exception '孩子性别只能选择男孩或女孩';
  end if;

  if normalized_role = 'child' and normalized_child_title not in ('哥哥', '弟弟', '姐姐', '妹妹') then
    raise exception '孩子称呼只能选择哥哥、弟弟、姐姐或妹妹';
  end if;

  if not public.validate_app_password(p_password) then
    raise exception '密码至少 8 位，并且必须包含字母和数字';
  end if;

  insert into public.app_accounts (
    username,
    display_name,
    password_hash,
    family_id,
    member_id,
    role,
    parent_title,
    child_title,
    gender,
    avatar_id
  )
  values (
    normalized_username,
    coalesce(nullif(trim(p_display_name), ''), normalized_username),
    extensions.crypt(p_password, extensions.gen_salt('bf')),
    parent_account.family_id,
    extensions.gen_random_uuid()::text,
    normalized_role,
    case when normalized_role = 'parent' then normalized_parent_title else null end,
    case when normalized_role = 'child' then normalized_child_title else null end,
    case when normalized_role = 'child' then normalized_gender else null end,
    case
      when normalized_role = 'parent' and normalized_parent_title = '妈妈' then 'mother_01'
      when normalized_role = 'parent' then 'father_01'
      when normalized_child_title = '哥哥' then 'older_brother_01'
      when normalized_child_title = '姐姐' then 'older_sister_01'
      when normalized_child_title = '妹妹' then 'younger_sister_01'
      else 'younger_brother_01'
    end
  )
  returning * into member_account;

  if normalized_role = 'child' then
    perform public.ensure_child_point_account(parent_account.family_id, member_account.member_id);
  end if;

  select data into saved_data
  from public.app_family_data
  where family_id = parent_account.family_id;

  next_data := jsonb_set(
    coalesce(saved_data, '{"members":[],"wishes":[],"tasks":[]}'::jsonb),
    '{members}',
    coalesce(saved_data->'members', '[]'::jsonb) || jsonb_build_array(
      jsonb_build_object(
        'id', member_account.member_id,
        'name', member_account.display_name,
        'role', member_account.role,
        'title', member_account.parent_title,
        'gender', member_account.gender,
        'childTitle', member_account.child_title,
        'avatarId', member_account.avatar_id,
        'accountUsername', member_account.username
      )
    )
  );

  insert into public.app_family_data (family_id, data, updated_at)
  values (parent_account.family_id, next_data, now())
  on conflict (family_id)
  do update set data = excluded.data, updated_at = now();

  return jsonb_build_object(
    'account', public.account_json(member_account),
    'data', next_data
  );
exception
  when unique_violation then
    raise exception '账号已存在';
end;
$$;

create or replace function public.create_child_account(
  p_token text,
  p_username text,
  p_password text,
  p_display_name text,
  p_gender text,
  p_child_title text
)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select public.create_family_member_account(
    p_token,
    p_username,
    p_password,
    p_display_name,
    'child',
    '妈妈',
    p_gender,
    p_child_title
  );
$$;

create or replace function public.delete_family_member_account(
  p_token text,
  p_member_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_account_id uuid;
  parent_account public.app_accounts;
  target_account public.app_accounts;
  saved_data jsonb;
  next_members jsonb := '[]'::jsonb;
  next_wishes jsonb := '[]'::jsonb;
  next_tasks jsonb := '[]'::jsonb;
  item jsonb;
  next_data jsonb;
begin
  parent_account_id := public.account_from_token(p_token);
  parent_account := public.ensure_account_family(parent_account_id);

  if parent_account.role <> 'parent' then
    raise exception '只有父母账号可以删除家庭成员账号';
  end if;

  if parent_account.member_id = p_member_id then
    raise exception '不能删除当前登录账号';
  end if;

  select * into target_account
  from public.app_accounts
  where family_id = parent_account.family_id
    and member_id = p_member_id;

  if target_account.id is null then
    raise exception '家庭成员账号不存在';
  end if;

  select data into saved_data
  from public.app_family_data
  where family_id = parent_account.family_id;

  saved_data := coalesce(saved_data, '{"members":[],"wishes":[],"tasks":[]}'::jsonb);

  for item in select value from jsonb_array_elements(coalesce(saved_data->'members', '[]'::jsonb)) loop
    if item->>'id' <> p_member_id then
      next_members := next_members || jsonb_build_array(item);
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(saved_data->'wishes', '[]'::jsonb)) loop
    if item->>'childId' <> p_member_id then
      next_wishes := next_wishes || jsonb_build_array(item);
    end if;
  end loop;

  for item in select value from jsonb_array_elements(coalesce(saved_data->'tasks', '[]'::jsonb)) loop
    if item->>'creatorId' = p_member_id then
      continue;
    end if;

    if item->>'assigneeId' = p_member_id then
      item := (item - 'assigneeId') || jsonb_build_object('status', '待申领', 'submitted', false);
    end if;

    next_tasks := next_tasks || jsonb_build_array(item);
  end loop;

  next_data := jsonb_build_object(
    'members', next_members,
    'wishes', next_wishes,
    'tasks', next_tasks
  );

  delete from public.app_pet_adoptions
  where family_id = parent_account.family_id and member_id = p_member_id;

  delete from public.app_point_transactions
  where family_id = parent_account.family_id and member_id = p_member_id;

  delete from public.app_point_accounts
  where family_id = parent_account.family_id and member_id = p_member_id;

  delete from public.app_accounts
  where id = target_account.id;

  insert into public.app_family_data (family_id, data, updated_at)
  values (parent_account.family_id, next_data, now())
  on conflict (family_id)
  do update set data = excluded.data, updated_at = now();

  return jsonb_build_object('data', next_data);
end;
$$;

revoke all on function public.validate_app_password(text) from PUBLIC;
revoke all on function public.validate_app_username(text) from PUBLIC;
revoke all on function public.account_json(public.app_accounts) from PUBLIC;
revoke all on function public.create_app_session(uuid) from PUBLIC, anon, authenticated;
revoke all on function public.ensure_account_family(uuid) from PUBLIC, anon, authenticated;
revoke all on function public.account_from_token(text) from PUBLIC, anon, authenticated;
revoke all on function public.ensure_child_point_account(uuid, text) from PUBLIC, anon, authenticated;
revoke all on function public.refresh_family_pet_daily(uuid) from PUBLIC, anon, authenticated;
revoke all on function public.register_app_account(text, text, text, text) from PUBLIC;
revoke all on function public.login_app_account(text, text) from PUBLIC;
revoke all on function public.get_app_state(text) from PUBLIC;
revoke all on function public.save_app_state(text, jsonb) from PUBLIC;
revoke all on function public.update_app_account(text, text, text, text) from PUBLIC;
revoke all on function public.create_family_member_account(text, text, text, text, text, text, text, text) from PUBLIC;
revoke all on function public.delete_family_member_account(text, text) from PUBLIC;
revoke all on function public.create_child_account(text, text, text, text, text, text) from PUBLIC;
revoke all on function public.get_family_economy(text) from PUBLIC;
revoke all on function public.award_task_points(text, text, integer, text, text) from PUBLIC;
revoke all on function public.redeem_point_item(text, text) from PUBLIC;
revoke all on function public.adopt_app_pet(text, text) from PUBLIC;
revoke all on function public.abandon_app_pet(text, uuid) from PUBLIC;
revoke all on function public.interact_app_pet(text, uuid, text, text) from PUBLIC;
revoke all on function public.save_reward_item(text, uuid, text, text, text, integer, integer, text) from PUBLIC;
revoke all on function public.set_reward_item_status(text, uuid, boolean) from PUBLIC;
revoke all on function public.redeem_reward_item(text, uuid) from PUBLIC;

revoke all on table public.app_point_accounts from anon, authenticated;
revoke all on table public.app_point_transactions from anon, authenticated;
revoke all on table public.app_pet_adoptions from anon, authenticated;
revoke all on table public.app_pet_interactions from anon, authenticated;
revoke all on table public.app_reward_items from anon, authenticated;
revoke all on table public.app_reward_redemptions from anon, authenticated;

grant execute on function public.register_app_account(text, text, text, text) to anon, authenticated;
grant execute on function public.login_app_account(text, text) to anon, authenticated;
grant execute on function public.get_app_state(text) to anon, authenticated;
grant execute on function public.save_app_state(text, jsonb) to anon, authenticated;
grant execute on function public.update_app_account(text, text, text, text) to anon, authenticated;
grant execute on function public.create_family_member_account(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_family_member_account(text, text) to anon, authenticated;
grant execute on function public.create_child_account(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.get_family_economy(text) to anon, authenticated;
grant execute on function public.award_task_points(text, text, integer, text, text) to anon, authenticated;
grant execute on function public.redeem_point_item(text, text) to anon, authenticated;
grant execute on function public.adopt_app_pet(text, text) to anon, authenticated;
grant execute on function public.abandon_app_pet(text, uuid) to anon, authenticated;
grant execute on function public.interact_app_pet(text, uuid, text, text) to anon, authenticated;
grant execute on function public.save_reward_item(text, uuid, text, text, text, integer, integer, text) to anon, authenticated;
grant execute on function public.set_reward_item_status(text, uuid, boolean) to anon, authenticated;
grant execute on function public.redeem_reward_item(text, uuid) to anon, authenticated;
