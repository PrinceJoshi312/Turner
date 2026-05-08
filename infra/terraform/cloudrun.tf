resource "google_cloud_run_v2_service" "backend" {
  name     = "autofinetune-backend"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    service_account = google_service_account.sa.email
    containers {
      image = "gcr.io/${var.gcp_project_id}/autofinetune-backend:latest"
      env {
        name  = "DATABASE_URL"
        value = "postgresql+asyncpg://user:${var.db_password}@/${google_sql_database.database.name}?host=/cloudsql/${google_sql_database_instance.instance.connection_name}"
      }
      env {
        name  = "REDIS_URL"
        value = "redis://${google_redis_instance.cache.host}:${google_redis_instance.cache.port}/0"
      }
    }
  }
}

resource "google_cloud_run_v2_service" "frontend" {
  name     = "autofinetune-frontend"
  location = var.gcp_region
  ingress  = "INGRESS_TRAFFIC_ALL"

  template {
    containers {
      image = "gcr.io/${var.gcp_project_id}/autofinetune-frontend:latest"
      env {
        name  = "VITE_API_BASE_URL"
        value = "https://backend-url/api/v1" # Need to resolve after deploy
      }
    }
  }
}
