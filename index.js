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
  username: { type: String, required: true, unique: true }
});

const userModel = mongoose.model('User', userSchema);

const exerciseSchema = new Schema({
  username: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date }
});

const exerciseModel = mongoose.model('Exercise', exerciseSchema);

app.post('/api/users', (req, res) => {

  if (req.body.username === '') {
    return res.json({ error: 'username is required' });
  }

  let username = req.body.username;
  let myResponse = {};

  userModel.findOne({ username: username }, (err, data) => {
    if (!err && data === null) {
      const newUser = new userModel({
        'username': username
      });

      newUser.save().then(result => {
        myResponse["_id"] = result["_id"];
        myResponse["username"] = result["username"];
        res.send(myResponse);
      })
        .catch(err => {
          console.log(err);
        });
    }
    else {
      res.json({ error: 'Username already exists' });
    }
  })
});

app.get('/api/users', (req, res) => {

  userModel.find().then(result => {
    res.send(result);
  }).
    catch(err => {
      res.status(400).json('No user found');
    });
});

app.post('/api/users/:_id/exercises', (req, res) => {

  if (req.params._id === '0') {
    return res.json({ error: '_id is required' });
  }

  if (req.body.description === '') {
    return res.json({ error: 'description is required' });
  }

  if (req.body.duration === '') {
    return res.json({ error: 'duration is required' });
  }

  let userId = req.params._id;
  let description = req.body.description;
  let duration = parseInt(req.body.duration);
  let date = (req.body.date !== '' ? new Date(req.body.date) : new Date());

  if (isNaN(duration)) {
    return res.json({ error: 'duration is not a number' });
  }

  if (date == 'Invalid Date') {
    return res.json({ error: 'date is invalid' });
  }

  let myResponse = {};

  myResponse["_id"] = userId;
  myResponse["username"] = '';
  myResponse["date"] = date.toDateString();
  myResponse["duration"] = Number(duration);
  myResponse["description"] = description;

  userModel.findById(userId).then((data) => {

    myResponse["username"] = data.username;
    const newExercise = new exerciseModel({
      username: userId,
      description: description,
      duration: duration,
      date: date
    });

    newExercise.save()
      .then((exerciseData) => {
        res.send(myResponse);
      })
      .catch(err => res.status(400).json('Error: ' + err));
  })
    .catch(err => res.status(400).json('Error: ' + err));

});

app.get('/api/users/:_id/exercises', function (req, res) {
  res.redirect('/api/users/' + req.params._id + '/logs');
});

app.get('/api/users/:_id/logs', function (req, res) {
  let userId = req.params._id;
  let findConditions = { username: userId };

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

  userModel.findById(userId, function (err, data) {
    if (!err && data !== null) {
      exerciseModel.find(findConditions).sort({ date: 'asc' }).limit(limit).exec(function (err2, data2) {
        if (!err2) {
          return res.json({
            _id: data['_id'],
            username: data['username'],
            log: data2.map(function (e) {
              return {
                description: e.description,
                duration: e.duration,
                date: new Date(e.date).toDateString()
              };
            }),
            count: data2.length
          });
        }
      });
    } else {
      return res.json({ error: 'user not found' });
    }
  });
});


// End  <--

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
