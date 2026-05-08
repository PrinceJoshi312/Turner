resource "google_storage_bucket" "datasets" {
  name                        = "autofinetune-datasets-${var.gcp_project_id}"
  location                    = var.gcp_region
  uniform_bucket_level_access = true
  force_destroy               = true
}

resource "google_storage_bucket" "staging" {
  name                        = "autofinetune-staging-${var.gcp_project_id}"
  location                    = var.gcp_region
  uniform_bucket_level_access = true
  force_destroy               = true
}
