revoke select on public.api_connections from authenticated;
revoke insert, update on public.api_connections from authenticated;
grant select (created_at, google_project, id, is_active, is_primary, last_error, last_tested_at, metadata, model, name, provider, quota_exceeded_at, secret_hint, status, updated_at, user_id) on public.api_connections to authenticated;
grant delete on public.api_connections to authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

do $$
declare t text;
begin
  foreach t in array array['agent_events','agent_sessions','chat_messages','agent_plans'] loop
    if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;