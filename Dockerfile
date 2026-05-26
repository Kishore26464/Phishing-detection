FROM python:3.11-slim

WORKDIR /app

# Copy requirements first (for better layer caching)
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy entire project structure
COPY . .

# Expose port
EXPOSE 7860

# Start app from correct directory
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
