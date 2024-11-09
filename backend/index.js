require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET_KEY = process.env.JWT_SECRET_KEY || 'your_default_secret_key';

// Enable CORS for Svelte to access the backend
app.use(cors());
app.use(express.json());

// Set up MySQL connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.stack);
    return;
  }
  console.log('Connected to database');
});


// Register API
app.post('/register', async (req, res) => {
  try {
    const { SRN, email, pwd, phone_no, firstName, lastName } = req.body;

    if (!pwd) {
      return res.status(400).json({ message: 'Password is required' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(pwd, 5);

    // Generate a JWT token
    const token = jwt.sign({ SRN, email }, JWT_SECRET_KEY, { expiresIn: '1h' });

    const query = `INSERT INTO student (SRN, email, pwd, phone_no, firstName, lastName, token) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    db.query(query, [SRN, email, hashedPassword, phone_no, firstName, lastName, token], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Error registering user' });
      }
      res.status(201).json({ message: 'User registered successfully', token });
    });
  } catch (error) {
    console.error('Unexpected error in register route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});



// Login API
app.post('/login', (req, res) => {
  const { email, pwd } = req.body;

  const query = `SELECT * FROM student WHERE email = ?`;
  db.query(query, [email], async (err, results) => {
    if (err) return res.status(500).json({ message: 'Error logging in' });
    if (results.length === 0) return res.status(404).json({ message: 'User not found' });

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(pwd, user.pwd);
    if (!isPasswordValid) return res.status(401).json({ message: 'Invalid password' });

    // Use existing token or create a new one if none exists
    let token = user.token;
    if (!token) {
      token = jwt.sign({ SRN: user.SRN, email: user.email }, JWT_SECRET_KEY, { expiresIn: '1h' });
      const updateTokenQuery = `UPDATE student SET token = ? WHERE SRN = ?`;
      db.query(updateTokenQuery, [token, user.SRN]);
    }

    res.json({ message: 'Login successful', token });
  });
});


// Protected Route Example
app.get('/protected', (req, res) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET_KEY, (err, user) => {
    if (err) return res.sendStatus(403);

    res.json({ message: 'Protected route accessed', user });
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});


//To get upcoming events
// Filter and display events based on club, date, venue, and time
app.get('/events/filter', (req, res) => {
  const { clubName, eventDate, venueName, startTime, endTime } = req.query;

  // Base query
  let query = `
    SELECT e.eventID, e.eventName, e.eventDate, e.eventStartTime, e.eventEndTime, 
           c.clubName, v.venueName
    FROM event e
    JOIN club c ON e.clubID = c.clubID
    JOIN venue v ON e.venueID = v.venueID
    WHERE 1=1
  `;

  // Parameters array
  const params = [];

  // Apply filters based on query parameters
  if (clubName) {
    query += ` AND c.clubName = ?`;
    params.push(clubName);
  }

  // If eventDate is provided, use it, otherwise default to today's date or later
  if (eventDate) {
    query += ` AND e.eventDate = ?`;
    params.push(eventDate);
  } else {
    query += ` AND e.eventDate >= CURDATE()`;
  }

  if (venueName) {
    query += ` AND v.venueName = ?`;
    params.push(venueName);
  }
  if (startTime) {
    query += ` AND e.eventStartTime >= ?`;
    params.push(startTime);
  }
  if (endTime) {
    query += ` AND e.eventEndTime <= ?`;
    params.push(endTime);
  }

  // Order results by date and start time
  query += `ORDER BY e.eventDate ASC, e.eventStartTime ASC`;

  // Execute the query with the parameters
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Error fetching filtered events' });
    }
    res.status(200).json({ events: results });
  });
});







// Add event API with club head verification and venue availability check
app.post('/events/add', (req, res) => {
  const { eventName, eventDate, eventStartTime, eventEndTime, clubID, venueID } = req.body;
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Authorization token is missing' });

  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) return res.status(403).json({ message: 'Invalid token' });

    const memberID = decoded.SRN; // Get memberID from the decoded JWT token

    // Step 1: Verify if the logged-in user (memberID) is the club head of the specified club
    const checkClubHeadQuery = `
      SELECT 1 FROM member 
      WHERE memberID = ? AND clubID = ? AND memberID = clubHeadID
    `;

    db.query(checkClubHeadQuery, [memberID, clubID], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error while verifying club head' });
      }

      // If no results, the user is not the club head
      if (results.length === 0) {
        return res.status(403).json({ message: 'Only club heads are authorized to add events for this club' });
      }

      // Step 2: Check if the venue is available
      const checkVenueAvailabilityQuery = `
            SELECT v.available
            FROM venue v
            LEFT JOIN venue_booking vb ON v.venueID = vb.venueID
            AND vb.booking_date = ? 
      AND (
        (? BETWEEN vb.start_time AND vb.end_time) OR
        (? BETWEEN vb.start_time AND vb.end_time)
      )
    WHERE v.venueID = ? 
      AND v.available = true
      AND vb.booking_date IS NULL;
      `;

      db.query(checkVenueAvailabilityQuery, [venueID], (err, venueResults) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Database error while checking venue availability' });
        }

        // If no results, the venue is not available
        if (venueResults.length === 0) {
          return res.status(400).json({ message: 'The selected venue is not available for booking' });
        }

        // Step 3: Add the event and update the venue availability
        const addEventQuery = `
          INSERT INTO event (eventID, eventName, eventDate, eventStartTime, eventEndTime, clubID, venueID)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `;

        const eventID = `E${Math.floor(1000 + Math.random() * 9000)}`; // Example ID generation

        db.query(addEventQuery, [eventID, eventName, eventDate, eventStartTime, eventEndTime, clubID, venueID], (err, results) => {
          if (err) {
            console.error('Error adding event:', err);
            return res.status(500).json({ message: 'Error adding event' });
          }

          // Step 4: Update the venue's availability status to false
          const updateVenueAvailabilityQuery = `
            UPDATE venue 
            SET available = false 
            WHERE venueID = ?
          `;

          db.query(updateVenueAvailabilityQuery, [venueID], (err) => {
            if (err) {
              console.error('Error updating venue availability:', err);
              return res.status(500).json({ message: 'Error updating venue availability' });
            }

            res.status(201).json({ message: 'Event added successfully and venue marked as unavailable', eventID });
          });
        });
      });
    });
  });
});

// To get upcoming events
// Filter and display events based on club, date, venue, and time
app.get('/events/filter', (req, res) => {
  const { clubName, eventDate, venueName, startTime, endTime } = req.query;

  // Base query
  let query = `
    SELECT e.eventID, e.eventName, e.eventDate, e.eventStartTime, e.eventEndTime, 
           c.clubName, v.venueName
    FROM event e
    JOIN club c ON e.clubID = c.clubID
    JOIN venue v ON e.venueID = v.venueID
    WHERE 1=1
  `;

  // Parameters array
  const params = [];

  // Apply filters based on query parameters
  if (clubName) {
    query += ` AND c.clubName = ?`;
    params.push(clubName);
  }

  // If eventDate is provided, use it, otherwise default to today's date or later
  if (eventDate) {
    query += ` AND e.eventDate = ?`;
    params.push(eventDate);
  } else {
    query += ` AND e.eventDate >= CURDATE()`;
  }

  if (venueName) {
    query += ` AND v.venueName = ?`;
    params.push(venueName);
  }
  if (startTime) {
    query += ` AND e.eventStartTime >= ?`;
    params.push(startTime);
  }
  if (endTime) {
    query += ` AND e.eventEndTime <= ?`;
    params.push(endTime);
  }

  // Order results by date and start time
  query += ` ORDER BY e.eventDate ASC, e.eventStartTime ASC`;

  // Execute the query with the parameters
  db.query(query, params, (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Error fetching filtered events' });
    }
    res.status(200).json({ events: results });
  });
});


