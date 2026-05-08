# AutoFineTune 🚀

AutoFineTune is an end-to-end automated platform for fine-tuning Large Language Models (LLMs) using Google Cloud's Vertex AI. It provides a clean, user-friendly interface for uploading datasets, configuring hyperparameters, monitoring training jobs in real-time, and evaluating model performance.

## ✨ Features

- **One-Click Fine-Tuning**: Upload CSV/JSONL datasets and launch Vertex AI Supervised Fine-Tuning jobs without writing code.
- **Real-Time Monitoring**: Stream live logs from GCP directly to your browser via WebSockets.
- **Comprehensive Benchmarking**: Evaluate fine-tuned models on Accuracy, F1 Score, and BLEU metrics.
- **Model Comparison**: Compare multiple model versions side-by-side with interactive charts.
- **Secure Architecture**: JWT-based authentication and row-level data isolation.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS, Zustand, Recharts.
- **Backend**: FastAPI (Python), SQLAlchemy, Alembic.
- **Async Processing**: Celery, Redis.
- **Infrastructure**: Docker Compose (Local), Terraform (GCP), Google Cloud Storage, Vertex AI.

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A Google Cloud Project with the Vertex AI API enabled.
- A GCP Service Account JSON key.

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/PrinceJoshi312/Turner.git
   cd Turner
   ```

2. **Configure Environment Variables**:
   Update `backend/.env` with your GCP details:
   ```env
   GCP_PROJECT_ID=your-project-id
   GCS_BUCKET_NAME=your-bucket-name
   GOOGLE_APPLICATION_CREDENTIALS=./service-account.json
   ```

3. **Add GCP Credentials**:
   Place your `service-account.json` file inside the `backend/` directory.

4. **Launch the platform**:
   ```bash
   cd infra
   docker-compose up --build
   ```

5. **Access the App**:
   - **Frontend**: `http://localhost:5173`
   - **API Docs**: `http://localhost:8000/docs`

## 📂 Project Structure

- `backend/`: FastAPI application, database models, and Celery tasks.
- `frontend/`: React SPA with interactive dashboards.
- `infra/`: Docker Compose and Terraform configurations.
- `AUTOFINETUNE_SPEC.md`: Full technical specification and implementation plan.

## 📜 License

MIT
