-- AlterTable
ALTER TABLE "Kit" ADD COLUMN     "booking" TEXT NOT NULL DEFAULT '{}';

-- Data: booking products move onto the kit as its "Book a call" button. For each creator,
-- the first published booking product (by position) fills every kit that has no booking yet.
-- The product rows stay (hidden from Products and the Shop); nothing is deleted.
UPDATE "Kit" AS k
SET "booking" = json_build_object('url', p."bookingUrl", 'label', left(p."title", 40))::text
FROM (
  SELECT DISTINCT ON ("userId") "userId", "bookingUrl", "title"
  FROM "Product"
  WHERE "type" = 'booking' AND "status" = 'published' AND "bookingUrl" IS NOT NULL
  ORDER BY "userId", "position", "createdAt"
) AS p
WHERE k."userId" = p."userId" AND k."booking" = '{}';
