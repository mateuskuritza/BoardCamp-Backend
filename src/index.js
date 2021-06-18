import joi from "joi";
import dayjs from "dayjs";
import dbConnect from "./database/database.js";
import app from "./serverConfig.js";

// Categories routes start
app.get("/categories", async (req, res) => {
	const { limit, offset, order, desc } = req.query;
	const [queryLimit, queryOffset, orderConfig] = paginatorQuery(limit, offset, order, desc);

	try {
		const result = await dbConnect.query("SELECT * FROM categories" + queryLimit + queryOffset + orderConfig);
		res.send(result.rows);
	} catch {
		res.sendStatus(500);
	}
});

app.post("/categories", async (req, res) => {
	const { name } = req.body;

	try {
		if (name === undefined || typeof name !== "string" || name.trim() === "") {
			res.sendStatus(400);
			return;
		}

		let existingName = await dbConnect.query("SELECT * FROM categories WHERE name=$1", [name]);
		existingName = existingName.rows[0] ? existingName.rows[0].name : false;
		if (existingName) {
			res.sendStatus(409);
			return;
		}

		dbConnect.query("INSERT INTO categories (name) values ($1)", [name]);
		res.sendStatus(201);
	} catch {
		res.sendStatus(500);
	}
});
// Categories end

// Games routes start
app.get("/games", async (req, res) => {
	const { name, limit, offset, order, desc } = req.query;
	const queryConfig = name ? `%${name}%` : "%";

	const [queryLimit, queryOffset, orderConfig] = paginatorQuery(limit, offset, order, desc);
	try {
		const result = await dbConnect.query(
			`
        SELECT games.*, categories.name AS "categoryName" 
        FROM games JOIN categories
        ON games."categoryId" = categories.id
        WHERE games.name iLIKE $1` +
				queryLimit +
				queryOffset +
				orderConfig,
			[queryConfig]
		);
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

// Customers routes start
app.get("/customers", async (req, res) => {
	const { cpf, limit, offset, order, desc } = req.query;
	const queryCpf = cpf ? `${cpf}%` : "%";
	const [queryLimit, queryOffset, orderConfig] = paginatorQuery(limit, offset, order, desc);

	try {
		const customersList = await dbConnect.query(
			`SELECT * FROM customers WHERE cpf LIKE $1` + queryLimit + queryOffset + orderConfig,
			[queryCpf]
		);
		const customersListFormated = customersList.rows.map((c) => {
			const formated = c;
			formated.birthday = dayjs(formated.birthday).format("YYYY/MM/DD");
			return formated;
		});
		res.send(customersListFormated);
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
		/*
        ???????????????
        const existingCpfList = await dbConnect.query("SELECT cpf FROM customers");
		const existingCpfValues = existingCpfList.rows.map((c) => c.cpf);
		if (existingCpfValues.includes(cpf)) {
			res.sendStatus(409);
			return;
		}
        */

		dbConnect.query("UPDATE customers SET name=$1, phone=$2, cpf=$3, birthday=$4 WHERE id=$5", [
			name,
			phone,
			cpf,
			birthday,
			id,
		]);
		res.sendStatus(200);
	} catch {
		res.sendStatus(500);
	}
});

const customerSchema = joi.object({
	name: joi.string().required(),
	phone: joi.string().min(10).max(11),
	cpf: joi.string().pattern(/^[0-9]{3}[0-9]{3}[0-9]{3}[0-9]{2}$/),
	birthday: joi.date().less("now").required(),
});
// Customers end

// Rentals routes start
app.get("/rentals", async (req, res) => {
	const { customerId, gameId, limit, offset, order, desc } = req.query;
	const [queryLimit, queryOffset, orderConfig] = paginatorQuery(limit, offset, order, desc);

	let rentalsList;
	try {
		if (customerId && gameId) {
			rentalsList = await dbConnect.query(
				`
        SELECT rentals.*, customers.name AS "customerName", games.name AS "gameName", games."categoryId", categories.name AS "categoryName"
        FROM rentals 
        JOIN customers
        ON rentals."customerId" = customers.id
        JOIN games
        ON rentals."gameId" = games.id
        JOIN categories
        ON games."categoryId" = categories.id
        WHERE rentals."customerId" = $1 AND rentals."gameId" = $2
        ` +
					queryLimit +
					queryOffset +
					orderConfig,
				[customerId, gameId]
			);
		}

		if (customerId && !gameId) {
			rentalsList = await dbConnect.query(
				`
        SELECT rentals.*, customers.name AS "customerName", games.name AS "gameName", games."categoryId", categories.name AS "categoryName"
        FROM rentals 
        JOIN customers
        ON rentals."customerId" = customers.id
        JOIN games
        ON rentals."gameId" = games.id
        JOIN categories
        ON games."categoryId" = categories.id
        WHERE rentals."customerId" = $1
        ` +
					queryLimit +
					queryOffset +
					orderConfig,
				[customerId]
			);
		}

		if (!customerId && gameId) {
			rentalsList = await dbConnect.query(
				`
        SELECT rentals.*, customers.name AS "customerName", games.name AS "gameName", games."categoryId", categories.name AS "categoryName"
        FROM rentals 
        JOIN customers
        ON rentals."customerId" = customers.id
        JOIN games
        ON rentals."gameId" = games.id
        JOIN categories
        ON games."categoryId" = categories.id
        WHERE rentals."gameId" = $1
        ` +
					queryLimit +
					queryOffset +
					orderConfig,
				[gameId]
			);
		}

		if (!customerId && !gameId) {
			rentalsList = await dbConnect.query(
				`
        SELECT rentals.*, customers.name AS "customerName", games.name AS "gameName", games."categoryId", categories.name AS "categoryName"
        FROM rentals 
        JOIN customers
        ON rentals."customerId" = customers.id
        JOIN games
        ON rentals."gameId" = games.id
        JOIN categories
        ON games."categoryId" = categories.id
        ` +
					queryLimit +
					queryOffset +
					orderConfig
			);
		}

		const rentalsListFormated = rentalsList.rows.map((rental) => {
			const {
				id,
				customerId,
				gameId,
				rentDate,
				daysRented,
				returnDate,
				originalPrice,
				delayFee,
				customerName,
				gameName,
				categoryId,
				categoryName,
			} = rental;

			return {
				id: id,
				customerId,
				gameId,
				rentDate: dayjs(rentDate).format("YYYY/MM/DD"),
				daysRented,
				returnDate: returnDate ? dayjs(returnDate).format("YYYY/MM/DD") : returnDate,
				originalPrice,
				delayFee,
				customer: {
					id: customerId,
					name: customerName,
				},
				game: {
					id: gameId,
					name: gameName,
					categoryId: categoryId,
					categoryName: categoryName,
				},
			};
		});
		res.send(rentalsListFormated);
	} catch {
		res.sendStatus(500);
	}
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
		const availableGamesQuantity = availableGames.rows[0] !== undefined ? availableGames.rows[0].stockTotal : 0;

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

app.post("/rentals/:id/return", async (req, res) => {
	const { id } = req.params;

	try {
		const rentalQuery = await dbConnect.query(`SELECT * FROM rentals WHERE id=$1`, [id]);
		const rental = rentalQuery.rows[0];
		if (!rental) {
			res.sendStatus(404);
			return;
		}
		if (rental.returnDate !== null) {
			res.sendStatus(400);
			return;
		}

		const returnDate = new Date();
		const daysDiferenceConfig = Math.floor((returnDate.getTime() - rental.rentDate.getTime()) / (1000 * 60 * 60 * 24));
		const daysDiference = daysDiferenceConfig < 0 ? 0 : daysDiferenceConfig;

		const delayFee = daysDiference * (rental.originalPrice / rental.daysRented);
		await dbConnect.query(`UPDATE rentals SET "returnDate"=$1, "delayFee"=$2 WHERE id=$3`, [returnDate, delayFee, id]);
		res.sendStatus(200);
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

function paginatorQuery(limit, offset, order, desc, columns) {
	const newLimit = !isNaN(limit) ? limit : null;
	const newOffset = !isNaN(offset) ? offset : null;
	//const newOrder = columns.includes(order) ? order : false;

	const queryLimit = newLimit ? ` LIMIT ${newLimit}` : "";
	const queryOffset = newOffset ? ` OFFSET ${newOffset} ROWS` : "";
	const orderConfig = order ? (desc ? ` ORDER BY "${order}" DESC` : ` ORDER BY "${order}" ASC`) : "";

	return [queryLimit, queryOffset, orderConfig];
}
