CREATE TABLE "games" (
  "id" SERIAL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "image" TEXT NOT NULL,
  "stock_total" INTEGER NOT NULL,
  "category_id" INTEGER NOT NULL,
  "price_per_day" INTEGER NOT NULL
);