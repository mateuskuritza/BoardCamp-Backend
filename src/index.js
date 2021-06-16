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

// Categories

app.get("/categories", async (req, res) => {
	const result = await dbConnect.query("SELECT * FROM categories");
	res.send(result.rows);
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
