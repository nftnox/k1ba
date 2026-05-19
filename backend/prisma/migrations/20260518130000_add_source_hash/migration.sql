-- AddColumn: sourceHash na articles tabelu (bezbjedno ako već postoji)
ALTER TABLE "articles" ADD COLUMN IF NOT EXISTS "sourceHash" TEXT;

-- CreateUniqueIndex: ako index već postoji, preskočiti
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'articles'
    AND indexname = 'articles_sourceHash_key'
  ) THEN
    CREATE UNIQUE INDEX "articles_sourceHash_key" ON "articles"("sourceHash");
  END IF;
END $$;
