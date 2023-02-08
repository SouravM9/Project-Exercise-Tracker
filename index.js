const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()

app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

// Start -->

const mongoose = require('mongoose');
const bodyParser = require('body-parser');

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

mongoose.connection.on('connected', () => {
  console.log("Connected to Mongo");
});

mongoose.connection.on('error', (err) => {
  console.log("Error", err);
});

const { Schema } = mongoose;

const userSchema = new Schema({
	username: { type: String, unique: true, required: true }
});

const Users = mongoose.model('Users', userSchema);

const exerciseSchema = new Schema({
	userId: { type: String, required: true },
	description: { type: String, required: true },
	duration: { type: Number, min: 1, required: true },
	date: { type: Date, default: Date.now }
});

const Exercises = mongoose.model('Exercises', exerciseSchema);

app.post('/api/users', function (req, res) {
	let username = req.body.username;
	let _id = '';

	Users.findOne({ username: username }, function (err, data) {
		if (!err && data === null) {
			let newUser = new Users({
				username: username
			});

			newUser.save(function (err, data) {
				if (!err) {
					_id = data['_id'];

					return res.json({
						_id: _id,
						username: username
					});
				}
			});
		} else {
			return res.json({ error: 'username already exists' });
		}
	});
});

app.get('/api/users', function (req, res) {
	Users.find({}, function (err, data) {
		if (!err) {
			return res.json(data);
		}
	});
});

app.post('/api/users/:_id/exercises', function (req, res) {
	let userId = req.params._id;
	let description = req.body.description;
	let duration = parseInt(req.body.duration);
	let date = (req.body.date !== '' ? new Date(req.body.date) : new Date());

	Users.findById(userId, function (err, data) {
		if (!err && data !== null) {
			let newExercise = new Exercises({
				userId: userId,
				description: description,
				duration: duration,
				date: date
			});

			newExercise.save(function (err2, data2) {
				if (!err2) {
					return res.json({
						_id: data['_id'],
						username: data['username'],
						description: data2['description'],
						duration: data2['duration'],
						date: new Date(data2['date']).toDateString()
					});
				}
			});
		} else {
			return res.json({ error: 'user not found' });
		}
	});
});

app.get('/api/users/:_id/exercises', function (req, res) {
	res.redirect('/api/users/' + req.params._id + '/logs');
});

app.get('/api/users/:_id/logs', function (req, res) {
	let userId = req.params._id;
	let findConditions = { userId: userId };

	if (
		(req.query.from !== undefined && req.query.from !== '')
		||
		(req.query.to !== undefined && req.query.to !== '')
	) {
		findConditions.date = {};

		if (req.query.from !== undefined && req.query.from !== '') {
			findConditions.date.$gte = new Date(req.query.from);
		}

		if (findConditions.date.$gte == 'Invalid Date') {
			return res.json({ error: 'from date is invalid' });
		}

		if (req.query.to !== undefined && req.query.to !== '') {
			findConditions.date.$lte = new Date(req.query.to);
		}

		if (findConditions.date.$lte == 'Invalid Date') {
			return res.json({ error: 'to date is invalid' });
		}
	}

	let limit = (req.query.limit !== undefined ? parseInt(req.query.limit) : 0);

	if (isNaN(limit)) {
		return res.json({ error: 'limit is not a number' });
	}

	Users.findById(userId, function (err, data) {
		if (!err && data !== null) {
			Exercises.find(findConditions).sort({ date: 'asc' }).limit(limit).exec(function (err2, data2) {
				if (!err2) {
					return res.json({
						_id: data['_id'],
						username: data['username'],
						count: data2.length,
						log: data2.map(function (e) {
							return {
								description: e.description,
								duration: e.duration,
								date: new Date(e.date).toDateString()
							};
						})
					});
				}
			});
		} else {
			return res.json({ error: 'user not found' });
		}
	});
});


app.use((req, res, next) => {
	return next({ status: 404, message: 'not found' });
});


app.use((err, req, res, next) => {
	let errCode, errMessage;

	if (err.errors) {
		errCode = 400; 
		const keys = Object.keys(err.errors);
		errMessage = err.errors[keys[0]].message;
	} else {
		errCode = err.status || 500;
		errMessage = err.message || 'Internal Server Error';
	}

	res.status(errCode).type('txt')
		.send(errMessage);
});

const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});