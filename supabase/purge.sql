-- Deletes every reservation (names, emails, tickets) after the event.
-- Run this by hand ONLY after the final CSV export from /admin: it cannot be undone.
truncate reservations;
