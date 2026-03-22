# P2P Book Renting System Backend

This project currently includes authentication, profile, book CRUD, rental requests, active rentals, return initiation, and return confirmation modules built with Node.js, Express, MongoDB, and Mongoose.

## Authentication Requirement

The profile routes below require a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

## User Profile API

### GET `/api/users/me`

Returns the currently logged-in user's profile.

#### Auth

Required

#### Sample Success Response

```json
{
  "user": {
    "id": "69be654a2d9103c1f292404c",
    "name": "Test User",
    "email": "testuser@example.com",
    "phone": "9998887776",
    "addressLine1": "42 Reader Lane",
    "addressLine2": "Near Library",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "bio": "Book lover and careful renter.",
    "avatarUrl": "https://example.com/profile.png",
    "createdAt": "2026-03-21T09:30:50.596Z",
    "updatedAt": "2026-03-21T09:45:09.884Z"
  }
}
```

#### Sample Error Response

```json
{
  "message": "Not authorized, token missing"
}
```

### PUT `/api/users/me`

Updates the currently logged-in user's profile. Only the authenticated user can update their own profile.

#### Auth

Required

#### Accepted Request Body

All fields are optional, but at least one allowed field must be provided.

```json
{
  "phone": "9998887776",
  "addressLine1": "42 Reader Lane",
  "addressLine2": "Near Library",
  "city": "Pune",
  "state": "Maharashtra",
  "pincode": "411001",
  "bio": "Book lover and careful renter.",
  "avatarUrl": "https://example.com/profile.png"
}
```

#### Validation Notes

- `phone` must be a string between 7 and 20 characters.
- `pincode` must be a string between 3 and 20 characters.
- `bio` must be a string up to 500 characters.
- `avatarUrl` must be an empty string or a valid absolute URL.
- String fields are trimmed before saving.
- Unknown fields are rejected.
- Password updates are not allowed on this route.

#### Sample Success Response

```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": "69be654a2d9103c1f292404c",
    "name": "Test User",
    "email": "testuser@example.com",
    "phone": "9998887776",
    "addressLine1": "42 Reader Lane",
    "addressLine2": "Near Library",
    "city": "Pune",
    "state": "Maharashtra",
    "pincode": "411001",
    "bio": "Book lover and careful renter.",
    "avatarUrl": "https://example.com/profile.png",
    "createdAt": "2026-03-21T09:30:50.596Z",
    "updatedAt": "2026-03-21T09:45:09.884Z"
  }
}
```

#### Sample Error Responses

Missing token:

```json
{
  "message": "Not authorized, token missing"
}
```

Password update attempt:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "",
      "message": "Password updates are not allowed in this route"
    }
  ]
}
```

Invalid field type:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "phone",
      "message": "Phone must be a string"
    }
  ]
}
```

Unknown field:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "",
      "message": "Unknown field(s): role"
    }
  ]
}
```

## Book Listing API

### POST `/api/books`

Creates a new book listing for the currently logged-in user.

#### Auth

Required

Use a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

#### Accepted Request Body

```json
{
  "title": "Clean Code",
  "author": "Robert C. Martin",
  "isbn": "9780132350884",
  "category": "Programming",
  "description": "A handbook of agile software craftsmanship.",
  "condition": "Good",
  "rentalPrice": 55,
  "securityDeposit": 220,
  "location": "Hyderabad",
  "imageUrl": "https://example.com/clean-code.jpg"
}
```

#### Sample Success Response

```json
{
  "message": "Book listing created successfully",
  "book": {
    "id": "69be6bf048888591e67461d5",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "9780132350884",
    "category": "Programming",
    "description": "A handbook of agile software craftsmanship.",
    "condition": "Good",
    "rentalPrice": 55,
    "securityDeposit": 220,
    "location": "Hyderabad",
    "availabilityStatus": "available",
    "imageUrl": "https://example.com/clean-code.jpg",
    "owner": {
      "id": "69be654a2d9103c1f292404c",
      "name": "Test User",
      "email": "testuser@example.com"
    },
    "createdAt": "2026-03-21T09:59:12.195Z",
    "updatedAt": "2026-03-21T09:59:12.195Z"
  }
}
```

#### Sample Error Responses

Missing token:

```json
{
  "message": "Not authorized, token missing"
}
```

Missing required fields:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "author",
      "message": "Author is required"
    },
    {
      "field": "category",
      "message": "Category is required"
    }
  ]
}
```

Invalid condition:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "condition",
      "message": "Condition must be one of: New, Like New, Good, Fair, Poor"
    }
  ]
}
```

Invalid numeric values:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "rentalPrice",
      "message": "Rental price must be a number greater than or equal to 0"
    },
    {
      "field": "securityDeposit",
      "message": "Security deposit must be a number greater than or equal to 0"
    }
  ]
}
```

Invalid image URL:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "imageUrl",
      "message": "Image URL must be a valid absolute URL"
    }
  ]
}
```

Owner override attempt:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "",
      "message": "Owner cannot be provided in request body"
    }
  ]
}
```

### GET `/api/books/:id`

Returns the full details of a single book by its id.

#### Sample Request URL

```http
GET /api/books/69be6bf048888591e67461d5
```

#### Sample Success Response

```json
{
  "book": {
    "id": "69be6bf048888591e67461d5",
    "title": "Clean Code",
    "author": "Robert C. Martin",
    "isbn": "9780132350884",
    "category": "Programming",
    "description": "A handbook of agile software craftsmanship.",
    "condition": "Good",
    "rentalPrice": 55,
    "securityDeposit": 220,
    "location": "Hyderabad",
    "availabilityStatus": "available",
    "imageUrl": "https://example.com/clean-code.jpg",
    "owner": {
      "id": "69be654a2d9103c1f292404c",
      "name": "Test User",
      "email": "testuser@example.com"
    },
    "createdAt": "2026-03-21T09:59:12.195Z",
    "updatedAt": "2026-03-21T09:59:12.195Z"
  }
}
```

#### Sample Error Responses

Invalid book id:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "id",
      "message": "Book id must be a valid MongoDB ObjectId"
    }
  ]
}
```

Book not found:

```json
{
  "message": "Book not found"
}
```

### PUT `/api/books/:id`

Updates an existing book listing owned by the currently logged-in user.

#### Auth

Required

Use a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

#### Ownership Requirement

Only the owner of the book can update it. If another authenticated user tries to update the book, the API returns `403 Forbidden`.

#### Sample Request Bodies

```json
{
  "title": "Clean Code Final",
  "availabilityStatus": "available",
  "imageUrl": "https://example.com/final.jpg"
}
```

```json
{
  "location": "Ahmedabad"
}
```

```json
{
  "imageUrl": ""
}
```

#### Sample Success Response

```json
{
  "message": "Book listing updated successfully",
  "book": {
    "id": "69be6bf048888591e67461d5",
    "title": "Clean Code Final",
    "author": "Robert C. Martin",
    "isbn": "9780132350884",
    "category": "Programming",
    "description": "A handbook of agile software craftsmanship.",
    "condition": "Good",
    "rentalPrice": 65,
    "securityDeposit": 220,
    "location": "Ahmedabad",
    "availabilityStatus": "available",
    "imageUrl": "https://example.com/final.jpg",
    "owner": {
      "id": "69be654a2d9103c1f292404c",
      "name": "Test User",
      "email": "testuser@example.com"
    },
    "createdAt": "2026-03-21T09:59:12.195Z",
    "updatedAt": "2026-03-21T10:17:44.689Z"
  }
}
```

#### Sample Error Responses

Invalid book id:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "id",
      "message": "Book id must be a valid MongoDB ObjectId"
    }
  ]
}
```

Book not found:

```json
{
  "message": "Book not found"
}
```

Forbidden for non-owner:

```json
{
  "message": "You are not authorized to update this book"
}
```

Validation error:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "availabilityStatus",
      "message": "Availability status must be one of: available, unavailable, rented"
    }
  ]
}
```

## Rental Request API

### POST `/api/rent-requests`

Creates a new rental request for a book owned by another user.

#### Auth

Required

Use a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

#### Sample Request Body

```json
{
  "book": "69bea9e38d636521031c2afc",
  "startDate": "2026-03-21",
  "endDate": "2026-03-25"
}
```

#### Sample Success Response

```json
{
  "message": "Rental request created successfully",
  "rentalRequest": {
    "id": "69bea9e38d636521031c2b04",
    "status": "pending",
    "startDate": "2026-03-21T00:00:00.000Z",
    "endDate": "2026-03-25T00:00:00.000Z",
    "book": {
      "id": "69bea9e38d636521031c2afc",
      "title": "Rent Request Target",
      "author": "Shared Author",
      "category": "Fiction",
      "rentalPrice": 25,
      "securityDeposit": 100
    },
    "owner": {
      "id": "69be6fd959f238148041ad0d",
      "name": "Second User",
      "email": "seconduser@example.com"
    },
    "renter": {
      "id": "69bea9e28d636521031c2af7",
      "name": "Third User",
      "email": "thirduser@example.com"
    },
    "createdAt": "2026-03-21T14:23:31.154Z",
    "updatedAt": "2026-03-21T14:23:31.154Z"
  }
}
```

#### Sample Error Responses

User requesting their own book:

```json
{
  "message": "You cannot request your own book"
}
```

Invalid book id:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "book",
      "message": "Book must be a valid MongoDB ObjectId"
    }
  ]
}
```

Book not found:

```json
{
  "message": "Book not found"
}
```

Book unavailable:

```json
{
  "message": "Book is not available for rent"
}
```

Invalid date range:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "endDate",
      "message": "End date must be later than start date"
    }
  ]
}
```

Duplicate active request:

```json
{
  "message": "You already have an active rental request for this book"
}
```

### GET `/api/rent-requests/incoming`

Returns incoming rental requests for the currently logged-in owner.

#### Auth

Required

Use a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

#### Supported Query Params

- `status`
- `page`
- `limit`

#### Sample Request URLs

```http
GET /api/rent-requests/incoming
```

```http
GET /api/rent-requests/incoming?status=pending
```

```http
GET /api/rent-requests/incoming?status=approved
```

```http
GET /api/rent-requests/incoming?page=1&limit=1
```

#### Sample Success Response

```json
{
  "requests": [
    {
      "id": "69beabf8bb285edb4b3c8183",
      "status": "approved",
      "startDate": "2026-03-21T00:00:00.000Z",
      "endDate": "2026-03-25T00:00:00.000Z",
      "createdAt": "2026-03-21T14:32:24.817Z",
      "book": {
        "id": "69beabf8bb285edb4b3c816c",
        "title": "Incoming Book Two",
        "author": "Owner A",
        "category": "Testing",
        "rentalPrice": 20,
        "securityDeposit": 80
      },
      "renter": {
        "id": "69beabf7bb285edb4b3c815f",
        "name": "Incoming Renter Two",
        "email": "incomingrenter2@example.com"
      }
    },
    {
      "id": "69beabf8bb285edb4b3c8179",
      "status": "pending",
      "startDate": "2026-03-21T00:00:00.000Z",
      "endDate": "2026-03-24T00:00:00.000Z",
      "createdAt": "2026-03-21T14:32:24.739Z",
      "book": {
        "id": "69beabf8bb285edb4b3c8167",
        "title": "Incoming Book One",
        "author": "Owner A",
        "category": "Testing",
        "rentalPrice": 15,
        "securityDeposit": 60
      },
      "renter": {
        "id": "69beabf7bb285edb4b3c815b",
        "name": "Incoming Renter One",
        "email": "incomingrenter1@example.com"
      }
    }
  ],
  "totalRequests": 2,
  "currentPage": 1,
  "totalPages": 1
}
```

#### Sample Error Responses

Invalid status:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "status",
      "message": "Status must be one of: pending, approved, rejected, cancelled"
    }
  ]
}
```

Invalid page:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "page",
      "message": "Page must be an integer greater than or equal to 1"
    }
  ]
}
```

Invalid limit:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "limit",
      "message": "Limit must be an integer between 1 and 50"
    }
  ]
}
```

### GET `/api/rent-requests/outgoing`

Returns rental requests sent by the currently logged-in renter.

#### Auth

Required

Use a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

#### Supported Query Params

- `status`
- `page`
- `limit`

#### Sample Request URLs

```http
GET /api/rent-requests/outgoing
```

```http
GET /api/rent-requests/outgoing?status=pending
```

```http
GET /api/rent-requests/outgoing?status=approved
```

```http
GET /api/rent-requests/outgoing?page=1&limit=1
```

#### Sample Response

```json
{
  "requests": [
    {
      "id": "69beabf8bb285edb4b3c818d",
      "status": "pending",
      "startDate": "2026-03-21T00:00:00.000Z",
      "endDate": "2026-03-26T00:00:00.000Z",
      "createdAt": "2026-03-21T14:32:24.890Z",
      "book": {
        "id": "69beabf8bb285edb4b3c8171",
        "title": "Other Owner Book",
        "author": "Owner B",
        "category": "Testing",
        "rentalPrice": 22
      },
      "owner": {
        "id": "69beabf8bb285edb4b3c8163",
        "name": "Other Owner",
        "email": "otherowner@example.com"
      }
    },
    {
      "id": "69beabf8bb285edb4b3c8179",
      "status": "pending",
      "startDate": "2026-03-21T00:00:00.000Z",
      "endDate": "2026-03-24T00:00:00.000Z",
      "createdAt": "2026-03-21T14:32:24.739Z",
      "book": {
        "id": "69beabf8bb285edb4b3c8167",
        "title": "Incoming Book One",
        "author": "Owner A",
        "category": "Testing",
        "rentalPrice": 15
      },
      "owner": {
        "id": "69beabf6bb285edb4b3c8157",
        "name": "Incoming Owner",
        "email": "incomingowner@example.com"
      }
    }
  ],
  "totalRequests": 2,
  "currentPage": 1,
  "totalPages": 1
}
```

#### Sample Error Responses

Invalid status:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "status",
      "message": "Status must be one of: pending, approved, rejected, cancelled"
    }
  ]
}
```

Invalid page:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "page",
      "message": "Page must be an integer greater than or equal to 1"
    }
  ]
}
```

Invalid limit:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "limit",
      "message": "Limit must be an integer between 1 and 50"
    }
  ]
}
```

### PUT `/api/rent-requests/:id/approve`

Approves a pending rental request. Only the owner of the related book can approve it.

#### Auth

Required

Use a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

#### Ownership Requirement

Only the owner of the request’s book can approve the request.

#### Sample Request

```http
PUT /api/rent-requests/69beae27e3454929dcb46d9c/approve
Authorization: Bearer <your_jwt_token>
```

#### Sample Success Response

```json
{
  "message": "Rental request approved successfully",
  "rentalRequest": {
    "id": "69beae27e3454929dcb46d9c",
    "status": "approved",
    "startDate": "2026-03-21T00:00:00.000Z",
    "endDate": "2026-03-24T00:00:00.000Z",
    "book": {
      "id": "69beae27e3454929dcb46d8f",
      "title": "Approve Test Book",
      "author": "Owner Test",
      "category": "Testing",
      "rentalPrice": 18,
      "securityDeposit": 70
    },
    "renter": {
      "id": "69beae25e3454929dcb46d83",
      "name": "Approve Test Renter One",
      "email": "approvetestrenter1@example.com"
    },
    "createdAt": "2026-03-21T14:41:43.201Z",
    "updatedAt": "2026-03-21T14:41:43.401Z"
  }
}
```

### PUT `/api/rent-requests/:id/reject`

Rejects a pending rental request. Only the owner of the related book can reject it.

#### Auth

Required

Use a valid JWT in the `Authorization` header:

```http
Authorization: Bearer <your_jwt_token>
```

#### Ownership Requirement

Only the owner of the request’s book can reject the request.

#### Sample Request

```http
PUT /api/rent-requests/69beae27e3454929dcb46db0/reject
Authorization: Bearer <your_jwt_token>
```

#### Sample Success Response

```json
{
  "message": "Rental request rejected successfully",
  "rentalRequest": {
    "id": "69beae27e3454929dcb46db0",
    "status": "rejected",
    "startDate": "2026-03-21T00:00:00.000Z",
    "endDate": "2026-03-23T00:00:00.000Z",
    "book": {
      "id": "69beae27e3454929dcb46d94",
      "title": "Reject Test Book",
      "author": "Owner Test",
      "category": "Testing",
      "rentalPrice": 19,
      "securityDeposit": 75
    },
    "renter": {
      "id": "69beae25e3454929dcb46d83",
      "name": "Approve Test Renter One",
      "email": "approvetestrenter1@example.com"
    },
    "createdAt": "2026-03-21T14:41:43.331Z",
    "updatedAt": "2026-03-21T14:41:43.466Z"
  }
}
```

#### Sample Error Responses

Invalid rental request id:

```json
{
  "message": "Validation failed",
  "errors": [
    {
      "field": "id",
      "message": "Rental request id must be a valid MongoDB ObjectId"
    }
  ]
}
```

Rental request not found:

```json
{
  "message": "Rental request not found"
}
```

Forbidden for non-owner:

```json
{
  "message": "You are not authorized to update this rental request"
}
```

Invalid state transition:

```json
{
  "message": "Only pending rental requests can be approved"
}
```

## Additional Rental Lifecycle Routes

The backend also includes the following rental lifecycle APIs:

- `GET /api/rent-requests/active/owner`
- `GET /api/rent-requests/active/renter`
- `PUT /api/rent-requests/:id/return-initiate`
- `PUT /api/rent-requests/:id/return-confirm`

Current rental request statuses used by the API are:

- `pending`
- `approved`
- `rejected`
- `cancelled`
- `return_pending`
- `completed`

Book availability values used by the API are:

- `available`
- `unavailable`
- `rented`
