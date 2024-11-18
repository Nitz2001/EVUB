export interface User {
    SRN: string;
    email: string;
    firstName?: string;
    lastName?: string;
    phone_no?: string;
  }
  ``
  export interface Club {
    clubID: string;
    clubName: string;
    clubLogo?: string;
    clubHeadID: string;
  }
  
  export interface Event {
    eventID: string;
    eventName: string;
    eventDate: string;
    eventStartTime: string;
    eventEndTime: string;
    clubID: string;
    venueID: string;
    clubName?: string;
    venueName?: string;
  }
  
  export interface AuthResponse {
    token: string;
    message: string;
  }