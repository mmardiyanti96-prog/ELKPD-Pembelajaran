-- POLYA-MATH QUEST: jalankan di Supabase SQL Editor.
-- Aktifkan Authentication > Providers > "Allow anonymous sign-ins" (untuk siswa). Guru dibuat manual (email+password).
create table classes(code text primary key check(code ~ '^[A-Za-z0-9_-]{3,20}$'), teacher_id uuid not null default auth.uid() references auth.users(id), created_at timestamptz default now());
create table sessions(code text primary key check(code ~ '^[A-Za-z0-9_-]{3,20}$'), class_code text not null references classes(code) on delete cascade, title text, created_at timestamptz default now());
create table students(id uuid primary key default auth.uid() references auth.users(id) on delete cascade, student_code text not null check(student_code ~ '^[A-Za-z0-9_-]{3,20}$'), class_code text not null references classes(code), created_at timestamptz default now());
create table attempts(id uuid primary key, student_id uuid not null default auth.uid() references students(id) on delete cascade, student_code text not null, class_code text not null references classes(code), session_code text not null references sessions(code),
  mission smallint not null check(mission in (1,2)), item_no smallint not null check(item_no between 1 and 50), correct boolean not null,
  scores smallint[] not null check(array_length(scores,1)=4 and scores <@ array[1,2,3,4]::smallint[]), hint_total smallint not null default 0 check(hint_total>=0), error_types text[] default '{}', created_at timestamptz default now());
create table polya_steps(attempt_id uuid references attempts(id) on delete cascade, step smallint check(step between 1 and 4), score smallint not null check(score between 1 and 4), wrong_tries smallint not null default 0 check(wrong_tries>=0), hint_level smallint not null default 0 check(hint_level between 0 and 3), primary key(attempt_id, step));
create table hint_logs(id uuid primary key, attempt_id uuid not null references attempts(id) on delete cascade, step smallint not null check(step between 1 and 4), level smallint not null check(level between 1 and 3), created_at timestamptz default now());
create table assessments(id uuid primary key, student_id uuid not null default auth.uid() references students(id) on delete cascade, session_code text not null references sessions(code), mission smallint not null check(mission in (1,2)), mastery numeric not null check(mastery between 0 and 100), process numeric not null check(process between 0 and 100), hint_total smallint not null default 0, created_at timestamptz default now(), unique(student_id, session_code, mission));


-- Kompatibilitas jika tabel attempts sudah pernah dibuat sebelum kolom kode siswa ditambahkan.
alter table public.attempts add column if not exists student_code text;

create function is_teacher_of(c text) returns boolean language sql security definer set search_path=public stable as $$ select exists(select 1 from classes where code=c and teacher_id=auth.uid()) $$;
create function is_teacher() returns boolean language sql stable as $$ select coalesce((auth.jwt()->>'is_anonymous')::boolean,false)=false $$;

-- Fungsi SECURITY DEFINER membantu memvalidasi relasi sesi tanpa membuka daftar sesi kepada siswa.
create or replace function public.session_matches(s text, c text) returns boolean
language sql security definer set search_path=public stable as $$
  select exists(select 1 from public.sessions se where se.code=s and se.class_code=c)
$$;
create or replace function public.student_matches(c text, sc text) returns boolean
language sql security definer set search_path=public stable as $$
  select exists(select 1 from public.students st where st.id=auth.uid() and st.class_code=c and st.student_code=sc)
$$;
create or replace function public.student_session_matches(s text) returns boolean
language sql security definer set search_path=public stable as $$
  select exists(select 1 from public.students st join public.sessions se on se.class_code=st.class_code where st.id=auth.uid() and se.code=s)
$$;
revoke all on function public.session_matches(text,text) from public;
revoke all on function public.student_matches(text,text) from public;
revoke all on function public.student_session_matches(text) from public;
grant execute on function public.session_matches(text,text) to authenticated;
grant execute on function public.student_matches(text,text) to authenticated;
grant execute on function public.student_session_matches(text) to authenticated;

alter table classes enable row level security; alter table sessions enable row level security; alter table students enable row level security; alter table attempts enable row level security;
alter table polya_steps enable row level security; alter table hint_logs enable row level security; alter table assessments enable row level security;

create policy cls_teacher on classes for all to authenticated using(teacher_id=auth.uid() and is_teacher()) with check(teacher_id=auth.uid() and is_teacher());
create policy ses_teacher on sessions for all to authenticated using(is_teacher() and is_teacher_of(class_code)) with check(is_teacher() and is_teacher_of(class_code));
create policy stu_ins on students for insert to authenticated with check(id=auth.uid());
create policy stu_sel on students for select to authenticated using(id=auth.uid() or is_teacher_of(class_code));
drop policy if exists att_ins on attempts;
create policy att_ins on attempts for insert to authenticated with check(student_id=auth.uid() and public.student_matches(attempts.class_code, attempts.student_code) and public.session_matches(attempts.session_code, attempts.class_code));
create policy att_sel on attempts for select to authenticated using(student_id=auth.uid() or is_teacher_of(class_code));
create policy pst_ins on polya_steps for insert to authenticated with check(exists(select 1 from attempts a where a.id=attempt_id and a.student_id=auth.uid()));
create policy pst_sel on polya_steps for select to authenticated using(exists(select 1 from attempts a where a.id=attempt_id and (a.student_id=auth.uid() or is_teacher_of(a.class_code))));
create policy hl_ins on hint_logs for insert to authenticated with check(exists(select 1 from attempts a where a.id=attempt_id and a.student_id=auth.uid()));
create policy hl_sel on hint_logs for select to authenticated using(exists(select 1 from attempts a where a.id=attempt_id and (a.student_id=auth.uid() or is_teacher_of(a.class_code))));
create policy as_ins on assessments for insert to authenticated with check(student_id=auth.uid() and public.student_session_matches(assessments.session_code));
create policy as_sel on assessments for select to authenticated using(student_id=auth.uid() or exists(select 1 from students s where s.id=student_id and is_teacher_of(s.class_code)));
-- Contoh data awal (ganti UUID dengan id akun guru Anda):
-- insert into classes(code,teacher_id) values('VI-A','<UUID_GURU>'); insert into sessions(code,class_code,title) values('PERTEMUAN1','VI-A','Pertemuan 1');
