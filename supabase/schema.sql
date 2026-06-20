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

alter table public.app_families enable row level security;
alter table public.app_accounts enable row level security;
alter table public.app_sessions enable row level security;
alter table public.app_family_data enable row level security;

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
revoke all on function public.register_app_account(text, text, text, text) from PUBLIC;
revoke all on function public.login_app_account(text, text) from PUBLIC;
revoke all on function public.get_app_state(text) from PUBLIC;
revoke all on function public.save_app_state(text, jsonb) from PUBLIC;
revoke all on function public.update_app_account(text, text, text, text) from PUBLIC;
revoke all on function public.create_family_member_account(text, text, text, text, text, text, text, text) from PUBLIC;
revoke all on function public.delete_family_member_account(text, text) from PUBLIC;
revoke all on function public.create_child_account(text, text, text, text, text, text) from PUBLIC;

grant execute on function public.register_app_account(text, text, text, text) to anon, authenticated;
grant execute on function public.login_app_account(text, text) to anon, authenticated;
grant execute on function public.get_app_state(text) to anon, authenticated;
grant execute on function public.save_app_state(text, jsonb) to anon, authenticated;
grant execute on function public.update_app_account(text, text, text, text) to anon, authenticated;
grant execute on function public.create_family_member_account(text, text, text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_family_member_account(text, text) to anon, authenticated;
grant execute on function public.create_child_account(text, text, text, text, text, text) to anon, authenticated;
