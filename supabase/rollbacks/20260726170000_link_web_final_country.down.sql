begin;

-- The forward migration copies exact country evidence from rows with the same
-- Web episode and environment. An emergency code rollback leaves this correct
-- evidence in place instead of deleting it.

commit;
