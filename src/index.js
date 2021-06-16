import cors from "cors";
import pg from "pg";
import express from "express";
import joi from "joi";

const app = express();
app.use(cors());
app.use(express.json());
app.listen(4000, () => console.log("Server running..."));

const { Pool } = pg;
const dbConnect = new Pool({
	user: "bootcamp_role",
	password: "senha_super_hiper_ultra_secreta_do_role_do_bootcamp",
	host: "localhost",
	port: 5432,
	database: "boardcamp",
});

// Categories start

app.get("/categories", async (req, res) => {
	try {
		const result = await dbConnect.query("SELECT * FROM categories");
		res.send(result.rows);
	} catch {
		res.sendStatus(500);
	}
});

app.post("/categories", async (req, res) => {
	const { name } = req.body;
	try {
		const existingCategories = await dbConnect.query("SELECT name FROM categories");
		if (name === undefined || name.trim() === "") {
			res.sendStatus(400);
			return;
		}
		existingCategories.rows.forEach((category) => {
			if (category.name === name) {
				res.sendStatus(409);
				return;
			}
		});
		dbConnect.query("INSERT INTO categories (name) values ($1)", [name]);
		res.sendStatus(201);
	} catch {
		res.sendStatus(500);
	}
});

// Categories end

// Games start
// FALTA DESTACAR O NOME ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

app.get("/games", async (req, res) => {
	try {
		const { name } = req.query;
		const queryConfig = name ? `%${name}%` : "%";
		const result = await dbConnect.query("SELECT * FROM games WHERE name LIKE $1", [queryConfig]);
		res.send(result.rows);
	} catch {
		res.sendStatus(500);
	}
});

app.post("/games", async (req, res) => {
	const newGame = req.body;
	const { name, image, stock_total, category_id, price_per_day } = newGame;

	try {
		const existingCategories = await dbConnect.query("SELECT id FROM categories");
		const existingNames = await dbConnect.query("SELECT name FROM games");
		const existingCategoriesValues = existingCategories.rows.map((category) => category.id);
		const existingNamesValues = existingNames.rows.map((game) => game.name);

		if (newGameSchema.validate(newGame).error !== undefined || !existingCategoriesValues.includes(category_id)) {
			res.sendStatus(400);
			return;
		}

		if (existingNamesValues.includes(name)) {
			res.sendStatus(409);
			return;
		}

		dbConnect.query("INSERT INTO games (name, image, stock_total, category_id, price_per_day) values ($1, $2, $3, $4, $5)", [
			name,
			image,
			stock_total,
			category_id,
			price_per_day,
		]);
		res.sendStatus(201);
	} catch {
		res.sendStatus(500);
	}
});

const newGameSchema = joi.object({
	name: joi.string().required(),
	image: joi.string().required(),
	stock_total: joi.number().min(1).required(),
	category_id: joi.number().required(),
	price_per_day: joi.number().min(1).required(),
});
// Games end
