resource "google_redis_instance" "cache" {
  name               = "autofinetune-redis"
  tier               = "BASIC"
  memory_size_gb     = 1
  region             = var.gcp_region
  authorized_network = "default" # Adjust based on VPC setup

  redis_version = "REDIS_7_0"
}
