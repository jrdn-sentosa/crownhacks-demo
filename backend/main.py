import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Vercel looks for a variable named `app` in this file.
app = FastAPI()

# CORS = which websites are allowed to call this API from a browser.
# FRONTEND_URL is set in the backend's Vercel project settings (e.g. https://my-app.vercel.app).
origins = ["http://localhost:5173"]  # local dev
if os.getenv("FRONTEND_URL"):
    origins.append(os.getenv("FRONTEND_URL").rstrip("/"))

app.add_middleware(CORSMiddleware, allow_origins=origins, allow_methods=["GET"])


@app.get("/api/hello")
def hello():
    return {"message": "Hello from FastAPI on Vercel"}
