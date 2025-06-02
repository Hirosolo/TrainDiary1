# TrainDiary1

TrainDiary1 is a web application designed to help users track their workout plans, log their training sessions, and view progress.

## Prerequisites

Before you begin, ensure you have the following installed:

*   Node.js (LTS version recommended)
*   npm or yarn
*   MySQL database server

## Setup

Follow these steps to get the project up and running on your local machine:

1.  **Clone the repository:**

    ```bash
    git clone <repository_url>
    cd TrainDiary1
    ```

2.  **Database Setup:**

    *   Create a MySQL database for the project (e.g., `traindiary_db`).

    *   Run the schema and seed files to set up the database tables and initial data:

        ```bash
        # Connect to your MySQL server
        mysql -u your_username -p

        # Select your database
        USE traindiary_db;

        # Run schema.sql to create tables
        SOURCE schema.sql;

        # Run seedData.sql to populate initial data
        SOURCE seedData.sql;
        ```

3.  **Backend Setup:**

    *   Navigate to the backend directory:

        ```bash
        cd backend
        ```

    *   Install backend dependencies:

        ```bash
        npm install
        # or yarn install
        ```

    *   **Environment Variables:** Create a `.env` file in the `backend` directory. This file will contain your database connection details and other configuration. Add the following variables, replacing the placeholder values with your actual database credentials:

        ```env
        PORT=4000
        DB_HOST=localhost
        DB_USER=your_mysql_username
        DB_PASSWORD=your_mysql_password
        DB_NAME=traindiary_db
        # Add any other necessary backend environment variables here
        ```

4.  **Frontend Setup:**

    *   Navigate back to the project root directory:

        ```bash
        cd ..
        ```

    *   Install frontend dependencies:

        ```bash
        npm install
        # or yarn install
        ```

    *   **Environment Variables:** If your frontend requires environment variables (e.g., for API URLs), create a `.env` file in the project root directory. Refer to any existing `.env` file you have for required variables.

        ```env
        VITE_API_URL=http://localhost:4000/api
        # Add any other necessary frontend environment variables here
        ```

## Running the Application

1.  **Start the Backend Server:**

    *   Open a terminal and navigate to the `backend` directory.

    *   Run the start command:

        ```bash
        npm run dev
        # or yarn dev
        ```

    The backend server should start on the port specified in your backend `.env` file (defaulting to 4000).

2.  **Start the Frontend Development Server:**

    *   Open a **new** terminal and navigate to the project root directory.

    *   Run the development command:

        ```bash
        npm run dev
        # or yarn dev
        ```

    The frontend development server should start (typically on port 5173 or similar).

Open your web browser and visit the address provided by the frontend development server (e.g., `http://localhost:5173`).

## Features

*   User authentication (Login/Register)
*   Browse workout plans
*   Apply workout plans to your schedule
*   View scheduled workout sessions
*   Log exercises with sets, reps, and notes
*   Track workout progress
