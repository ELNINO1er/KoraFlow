-- New sessions expire after five minutes and are extended only by human activity.
-- Bound sessions issued before deployment as well; never extend an expired session.
UPDATE "session"
SET "expiresAt" = LEAST("expiresAt", CURRENT_TIMESTAMP + INTERVAL '5 minutes');
