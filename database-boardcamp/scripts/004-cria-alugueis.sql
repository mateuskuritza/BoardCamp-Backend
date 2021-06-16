CREATE TABLE "rentals" (
  "id" SERIAL PRIMARY KEY,
  "customer_id" INTEGER NOT NULL,
  "game_id" INTEGER NOT NULL,
  "rent_date" DATE NOT NULL,
  "days_rented" INTEGER NOT NULL,
  "return_date" DATE,
  "original_price" INTEGER NOT NULL,
  "delay_fee" DATE
);