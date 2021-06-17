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
	const { name, image, stockTotal, categoryId, pricePerDay } = newGame;

	try {
		const existingCategories = await dbConnect.query("SELECT id FROM categories");
		const existingNames = await dbConnect.query("SELECT name FROM games");
		const existingCategoriesValues = existingCategories.rows.map((category) => category.id);
		const existingNamesValues = existingNames.rows.map((game) => game.name);

		if (newGameSchema.validate(newGame).error !== undefined || !existingCategoriesValues.includes(categoryId)) {
			res.sendStatus(400);
			return;
		}

		if (existingNamesValues.includes(name)) {
			res.sendStatus(409);
			return;
		}

		dbConnect.query(`INSERT INTO games (name, image, "stockTotal", "categoryId", "pricePerDay") values ($1, $2, $3, $4, $5)`, [
			name,
			image,
			stockTotal,
			categoryId,
			pricePerDay,
		]);
		res.sendStatus(201);
	} catch {
		res.sendStatus(500);
	}
});

const newGameSchema = joi.object({
	name: joi.string().required(),
	image: joi.string().required(),
	stockTotal: joi.number().min(1).required(),
	categoryId: joi.number().required(),
	pricePerDay: joi.number().min(1).required(),
});

// Games end

// Customers start

app.get("/customers", async (req, res) => {
	const { cpf } = req.query;
	const queryConfig = cpf ? `${cpf}%` : "%";
	try {
		const customersList = await dbConnect.query(`SELECT * FROM customers WHERE cpf LIKE $1`, [queryConfig]);
		res.send(customersList.rows);
	} catch {
		res.sendStatus(500);
	}
});

app.get("/customers/:id", async (req, res) => {
	const { id } = req.params;
	try {
		const customersIdList = await dbConnect.query(`SELECT id FROM customers`);
		const customersIdListValues = customersIdList.rows.map((c) => c.id);

		if (!customersIdListValues.includes(parseInt(id))) {
			res.sendStatus(404);
			return;
		}
		const customer = await dbConnect.query(`SELECT * FROM customers WHERE id = $1`, [id]);
		res.send(customer.rows);
	} catch {
		res.sendStatus(500);
	}
});

app.post("/customers", async (req, res) => {
	const newCustomer = req.body;
	const { name, phone, cpf, birthday } = newCustomer;

	try {
		if (customerSchema.validate(newCustomer).error !== undefined) {
			res.sendStatus(400);
			return;
		}

		const existingCpfList = await dbConnect.query("SELECT cpf FROM customers");
		const existingCpfValues = existingCpfList.rows.map((c) => c.cpf);
		if (existingCpfValues.includes(cpf)) {
			res.sendStatus(409);
			return;
		}
		dbConnect.query("INSERT INTO customers (name, phone, cpf, birthday) values ($1,$2,$3,$4)", [name, phone, cpf, birthday]);
		res.sendStatus(201);
	} catch {
		res.sendStatus(500);
	}
});

app.put("/customers/:id", async (req, res) => {
	const editedCustomer = req.body;
	const { name, phone, cpf, birthday } = editedCustomer;
	const { id } = req.params;

	try {
		if (customerSchema.validate(editedCustomer).error !== undefined) {
			res.sendStatus(400);
			return;
		}
		await dbConnect.query("DELETE FROM customers WHERE id = $1", [id]);

		const existingCpfList = await dbConnect.query("SELECT cpf FROM customers");
		const existingCpfValues = existingCpfList.rows.map((c) => c.cpf);
		if (existingCpfValues.includes(cpf)) {
			res.sendStatus(409);
			return;
		}
		dbConnect.query("INSERT INTO customers (name, phone, cpf, birthday) values ($1,$2,$3,$4)", [name, phone, cpf, birthday]);
		res.sendStatus(200);
	} catch {
		res.sendStatus(500);
	}
});

const customerSchema = joi.object({
	name: joi.string().required(),
	phone: joi.string().min(10).max(11),
	cpf: joi.string().pattern(/^[0-9]{3}[0-9]{3}[0-9]{3}[0-9]{2}$/),
	birthday: joi.date().required(),
});

// Customers end

// Rentals start

app.get("/rentals", async (req, res) => {
	const rentalsList = await dbConnect.query("SELECT * FROM rentals ");
	res.send(rentalsList.rows);
});

app.post("/rentals", async (req, res) => {
	const { customerId, gameId, daysRented } = req.body;

	try {
		let existGameId = await dbConnect.query("SELECT * FROM games WHERE id=$1", [gameId]);
		existGameId = existGameId.rows.length > 0;
		let existCustomer = await dbConnect.query("SELECT * FROM customers WHERE id=$1", [customerId]);
		existCustomer = existCustomer.rows.length > 0;

		const rentedGames = await dbConnect.query(`SELECT * FROM rentals WHERE "gameId"=$1`, [gameId]);
		const rentedGamesQuantity = rentedGames.rows.length;
		const availableGames = await dbConnect.query(`SELECT "stockTotal" FROM games WHERE id=$1`, [gameId]);
		const availableGamesQuantity = availableGames.rows[0].stockTotal;

		if (!existGameId || !existCustomer || !daysRented >= 1 || rentedGamesQuantity + 1 > availableGamesQuantity) {
			res.sendStatus(400);
			return;
		}

		let pricePerDay = await dbConnect.query(`SELECT "pricePerDay" FROM games WHERE id=$1`, [gameId]);
		pricePerDay = pricePerDay.rows[0].pricePerDay;

		const originalPrice = daysRented * pricePerDay;
		const rentDate = new Date();

		await dbConnect.query(
			`INSERT INTO rentals ("customerId","gameId","daysRented","rentDate","originalPrice","returnDate","delayFee") values ($1,$2,$3,$4,$5,$6,$7)`,
			[customerId, gameId, daysRented, rentDate, originalPrice, null, null]
		);
		res.sendStatus(201);
	} catch {
		res.sendStatus(500);
	}
});

app.delete("/rentals/:id", async (req, res) => {
	const { id } = req.params;

	try {
		const existRentalQuery = await dbConnect.query(`SELECT * FROM rentals WHERE id=$1`, [id]);
		const existRental = existRentalQuery.rows[0];

		if (!existRental) {
			res.sendStatus(404);
			return;
		}
		if (existRental.returnDate !== null) {
			res.sendStatus(400);
			return;
		}

		await dbConnect.query("DELETE FROM rentals WHERE id=$1", [id]);
		res.sendStatus(200);
	} catch {
		res.sendStatus(500);
	}
});

// Rentals end
//  fuser -k -n tcp 4000
