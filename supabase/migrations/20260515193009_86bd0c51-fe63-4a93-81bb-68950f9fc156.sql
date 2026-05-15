
revoke execute on function public.rpc_create_game() from anon;
revoke execute on function public.rpc_join_game(text) from anon;
revoke execute on function public.rpc_start_game(uuid) from anon;
revoke execute on function public.rpc_place_bid(uuid,int,int) from anon;
revoke execute on function public.rpc_call_dudo(uuid) from anon;
revoke execute on function public.rpc_call_calza(uuid) from anon;
revoke execute on function public.rpc_next_round(uuid) from anon;
revoke execute on function public.rpc_set_username(text) from anon;
revoke execute on function public._start_round(uuid,uuid) from anon, authenticated;
revoke execute on function public._next_player(uuid,uuid) from anon, authenticated;
revoke execute on function public._resolve_round(uuid,uuid,text) from anon, authenticated;
revoke execute on function public.gen_game_code() from anon, authenticated;
revoke execute on function public.handle_new_user() from anon, authenticated;
