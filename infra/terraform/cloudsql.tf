resource "google_sql_database_instance" "instance" {
  name             = "autofinetune-db"
  database_version = "POSTGRES_15"
  region           = var.gcp_region

  settings {
    tier = "db-f1-micro" # Use appropriate tier for production
    ip_configuration {
      ipv4_enabled = true
    }
  }
  deletion_protection = false
}

resource "google_sql_database" "database" {
  name     = "autofinetune"
  instance = google_sql_database_instance.instance.name
}

resource "google_sql_user" "users" {
  name     = "user"
  instance = google_sql_database_instance.instance.name
  password = var.db_password
}
