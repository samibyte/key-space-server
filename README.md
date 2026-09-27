# KeySpace 🏠

KeySpace is a comprehensive backend API for a rental property marketplace. The platform connects tenants seeking rental units with landlords listing properties, while administrators oversee content moderation and platform health.

## 🚀 Key Features

*   **Role-Based Access Control (RBAC):** Distinct permissions for Tenants, Landlords, and Admins.
*   **Property Management:** Landlords can list, edit, and manage comprehensive property details including amenities.
*   **Search & Filtering:** Tenants can browse properties with powerful filters (price range, location, property type, amenities).
*   **Rental Requests:** Tenants can submit booking requests; landlords can approve or reject them.
*   **Secure Payments:** Full integration with Stripe Checkout and Webhooks for automated payment verification and status updates.
*   **Review System:** Tenants can rate and review properties only after completing a rental.
*   **Admin Dashboard:** Overview analytics, user moderation (banning/unbanning), and property listing moderation.

---

## 🛠️ Tech Stack

*   **Runtime:** Node.js
*   **Framework:** Express.js (TypeScript)
*   **Database ORM:** Prisma
*   **Database:** PostgreSQL
*   **Validation:** Zod
*   **Authentication:** JWT (JSON Web Tokens) with BCrypt hashing
*   **Payments:** Stripe
*   **Rate Limiting:** `express-rate-limit`

---

## 📦 Prerequisites

*   Node.js (`>= 18`)
*   pnpm (Package Manager)
*   PostgreSQL running locally or on the cloud
*   Stripe Developer Account for payment testing

---

## ⚙️ Environment Configuration

Create a `.env` file in the root directory and configure the following variables:

```env
# Application configuration
NODE_ENV=development
PORT=5000

# Database configurations
DATABASE_URL="postgresql://user:password@localhost:5432/keyspace?schema=public"

# Authentication
BCRYPT_SALT_ROUNDS=12
ACCESS_TOKEN_SECRET=your_super_secret_access_token_key_here
REFRESH_TOKEN_SECRET=your_super_secret_refresh_token_key_here
ACCESS_TOKEN_EXPIRES_IN=1d
REFRESH_TOKEN_EXPIRES_IN=7d

# Stripe Configurations
STRIPE_SECRET_KEY=sk_test_your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
```

---

## 🔧 Installation & Setup

1. **Install dependencies:**
    ```bash
    pnpm install
    ```

2. **Run database migrations:**
    ```bash
    pnpm migrate
    ```

3. **Seed database categories (optional):**
    ```bash
    npx prisma db seed
    ```

4. **Start the development server:**
    ```bash
    pnpm run dev
    ```

### Stripe Webhook Testing (Local Development)

To test Stripe checkout sessions locally, you need to forward webhooks to your local server:

1. Install Stripe CLI and login:
    ```bash
    stripe login
    ```
2. Run the forwarding command:
    ```bash
    pnpm run stripe:webhook
    ```
    *This will output a webhook secret (`whsec_...`). Drop this into your `.env` file.*

---

## 📡 Core API Endpoints

### Authentication (`/api/v1/auth`)
*   `POST /register` - Register a new Tenant or Landlord
*   `POST /login` - Authenticate user and receive JWT
*   `GET /me` - Get current authenticated user profile

### Properties (`/api/v1/properties`)
*   `GET /` - Browse all available properties (supports filtering/pagination)
*   `GET /:id` - View details of a specific property

### Landlord Properties (`/api/v1/landlord/properties`)
*   `POST /` - Create a new property listing
*   `PUT /:id` - Update a property listing
*   `DELETE /:id` - Delete a property listing

### Rental Requests (`/api/v1/rentals`)
*   `POST /` - Tenant submits a rental request
*   `GET /` - Tenant views their own rental history

### Landlord Rental Requests (`/api/v1/landlord/requests`)
*   `GET /` - Landlord views requests targeted at their properties
*   `PATCH /:id` - Landlord approves or rejects a request

### Payments (`/api/v1/payments`)
*   `POST /create` - Creates a pending Stripe checkout session
*   `POST /webhook` - Receives state updates from Stripe servers
*   `GET /` - View tenant payment history

### Reviews (`/api/v1/reviews`)
*   `POST /` - Tenant creates a review for a completed rental
*   `GET /property/:propertyId` - View all reviews for a property

### Admin Operations (`/api/v1/admin`)
*   `GET /stats` - View global platform analytics
*   `GET /users` - List and filter all users
*   `PATCH /users/:id/status` - Block or unblock accounts
*   `GET /properties` - List all properties for moderation
*   `DELETE /properties/:id` - Moderate and force-delete a property listing

---

## 📂 Project Structure (Controller-Service Pattern)

```text
src/
├── app/
│   ├── config/            # Environment and core configs
│   ├── errorHelpers/      # Global error formatters & AppError
│   ├── interfaces/        # Shared global TS interfaces
│   ├── lib/               # 3rd-party library initializations (Prisma)
│   ├── middlewares/       # Express middlewares (Auth, Validation)
│   ├── modules/           # Feature domains (Auth, Property, Rental, etc.)
│   │   └── [feature]/     # Contains .route.ts, .controller.ts, .service.ts, .validation.ts
│   ├── router/            # Centralized v1 routing registry
│   ├── shared/            # Reusable utils (catchAsync, sendResponse)
│   └── utils/             # JWT, Cookie helpers
├── app.ts                 # Express Application setup
├── server.ts              # Network/Port bindings
prisma/ 
├── models/                # Separated domain schemas
└── schema.prisma          # Prisma entrypoint
```

---

## 📝 License
This project is for educational and portfolio presentation purposes.
