SHOW DATABASES;
CREATE DATABASE IF NOT EXISTS Event_Club_db;
USE Event_Club_db;

CREATE TABLE student(
	SRN VARCHAR(13),
	email VARCHAR (50),
    pwd VARCHAR(64),
    phone_no VARCHAR(10),
    firstName VARCHAR(10),
    lastName VARCHAR(10),
    token VARCHAR(255),
    PRIMARY KEY (SRN)
	);

CREATE TABLE payment(
    paymentID VARCHAR (10),
    paymentStatus BOOL,
    amount FLOAT,
    SRN VARCHAR(13),
    PRIMARY KEY (paymentID),
    FOREIGN KEY (SRN) REFERENCES student(SRN)
);

CREATE TABLE venue(
   venueID VARCHAR(10),
   venueName VARCHAR (30),
   located VARCHAR (20),
   capacity INT,
   available BOOL,
   PRIMARY KEY (venueID)
);

CREATE TABLE club(
    clubID VARCHAR (10),
    clubName VARCHAR (30),
    clubDescrip VARCHAR (255),
    PRIMARY KEY (clubID)
);

CREATE TABLE member(
   memberID VARCHAR (10),
   role_given VARCHAR (10),
   SRN VARCHAR(13),
   clubID VARCHAR(10),
   clubHeadID VARCHAR (10),
   PRIMARY KEY (memberID),
   FOREIGN KEY (SRN) REFERENCES student(SRN),
   FOREIGN KEY (clubID) REFERENCES club(clubID)
);

ALTER TABLE member ADD CONSTRAINT club_head_name FOREIGN KEY(clubHeadID) REFERENCES member(memberID);

CREATE TABLE event(
    eventID VARCHAR (10),
    eventName VARCHAR (20),
    eventDate DATE ,
    eventStartTime time ,
    eventEndTime time ,
    clubID VARCHAR (10),
    venueID VARCHAR(10),
    PRIMARY KEY (eventID),
    FOREIGN KEY (clubID) REFERENCES club(clubID),
    FOREIGN KEY (venueID) REFERENCES venue(venueID)
);


CREATE TABLE registration(
    registrationID VARCHAR (10),
    SRN VARCHAR (13),
    eventID VARCHAR (10),
    paymentID VARCHAR (10),
    PRIMARY KEY (registrationID) ,
    FOREIGN KEY (SRN) REFERENCES student(SRN),
    FOREIGN KEY (paymentID) REFERENCES payment(paymentID),
    FOREIGN KEY (eventID) REFERENCES event(eventID)
);


CREATE TABLE venue_booking(
    bookingID VARCHAR (10),
    venueID VARCHAR (10),
    eventID VARCHAR (10),
    bookingDate VARCHAR (10),
    bookingStartTime time,
    bookingEndTime time,
    PRIMARY KEY (bookingID),
    FOREIGN KEY (venueID) REFERENCES venue(venueID),
    FOREIGN KEY (eventID) REFERENCES event(eventID)
);

DELIMITER //
CREATE TRIGGER check_venue_availability BEFORE INSERT ON event
FOR EACH ROW
BEGIN
  DECLARE venue_busy INT;

  SELECT COUNT(*) INTO venue_busy
  FROM event
  WHERE venueID = NEW.venueID
    AND eventDate = NEW.eventDate
    AND ((NEW.eventStartTime BETWEEN eventStartTime AND eventEndTime)
         OR (NEW.eventEndTime BETWEEN eventStartTime AND eventEndTime));

  IF venue_busy > 0 THEN
    SIGNAL SQLSTATE '45000'
    SET MESSAGE_TEXT = 'Venue is not available at the selected time.';
  END IF;
END;
//
DELIMITER ;
