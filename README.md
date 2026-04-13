# Optometry Clinic System

Complete FastAPI + SQLAlchemy optical clinic app with a Vanilla CSS/JS single page frontend.

## Setup

1. Create a virtual environment:
   ```bash
   python -m venv venv
   # Activation
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate
   ```
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set up the environment (Optional overrides):
   The application uses `.env` configuration. A default `clinical_app.db` will be initialized automatically.

## Run Application Locally
Start the Uvicorn server:
```bash
uvicorn main:app --reload
```

Then visit `http://localhost:8000` to interact with the system.

## Deployment Details (Railway)

This application is structurally pre-configured via `Procfile` and `railway.toml` for easy deployment on **[Railway.app](https://railway.app)**.

### Deployment Instructions:
1. **Push your code to GitHub**: Commit your codebase and push (excluding `.env`, database, and caches, configured via `.gitignore`).
2. **Start a Railway Project**: Select "Deploy from GitHub repo" within Railway and pick this repository.
3. **Volume Configuration for SQLite Configuration**:
    - Under the **Settings > Volumes** of your newly configured app service in Railway, add a Persistent Volume.
    - Mount the Volume Path strictly to: `/data`
4. **Environment Variables**:
    - Add the Environment Variables directly in Railway under the **Variables** tab:
    ```env
    DATABASE_URL=sqlite:////data/clinical_app.db
    APP_USER=admin
    APP_PASS=your_secure_password
    ```
5. **Deploy**: Railway will automatically use the `railway.toml` build configurations combined with `nixpacks` and `Procfile` to boot the `uvicorn` instance safely on PORT.
