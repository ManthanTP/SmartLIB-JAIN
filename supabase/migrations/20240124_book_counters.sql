create or replace function decrement_available_copies(book_id_input uuid)
returns void
security definer
set search_path = public
as $$
begin
  update books
  set available_copies = greatest(0, available_copies - 1)
  where id = book_id_input;
end;
$$ language plpgsql;

create or replace function increment_available_copies(book_id_input uuid)
returns void
security definer
set search_path = public
as $$
begin
  update books
  set available_copies = available_copies + 1
  where id = book_id_input;
end;
$$ language plpgsql;
